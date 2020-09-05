import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { StopIndexingOperation } from "../../../src/Documents/Operations/Indexes/StopIndexingOperation";
import { Person } from "../../Assets/Entities";
import { IDisposable } from "../../../src/Types/Contracts";
import { DatabaseCommands } from "../../Documents/Commands/DatabaseCommands";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { RavenCommand } from "../../../src/Http/RavenCommand";
import { ServerNode } from "../../../src/Http/ServerNode";
import { HttpRequestParameters } from "../../../src/Primitives/Http";

describe("RavenDB_7162", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("requestTimeoutShouldWork", async () => {
        await store.maintenance.send(new StopIndexingOperation());

        {
            const session = store.openSession();

            const person = Object.assign(new Person(), {
                name: "John"
            });

            await session.store(person);
            await session.saveChanges();
        }

        let withTimeout: IDisposable;
        try {
             withTimeout = store.requestTimeout(100);

             let commands: DatabaseCommands;
             try {
                 commands = DatabaseCommands.forStore(store);

                 await assertThrows(() => commands.execute(new DelayCommand(2_000)), err => {
                     assertThat(err.name)
                         .isEqualTo("RavenException");
                     assertThat(err.message)
                         .contains("failed with timeout after 00:00:00.100000");
                 })

             } finally {
                 commands.dispose();
             }
        } finally {
            withTimeout.dispose();
        }
    });

    it("requestWithTimeoutShouldWork", async () => {
        await store.maintenance.send(new StopIndexingOperation());

        {
            const session = store.openSession();

            const person = Object.assign(new Person(), {
                name: "John"
            });

            await session.store(person);
            await session.saveChanges();
        }

        let withTimeout: IDisposable;
        try {
            withTimeout = store.requestTimeout(100);

            let commands: DatabaseCommands;
            try {
                commands = DatabaseCommands.forStore(store);

                await commands.execute(new DelayCommand(2));

            } finally {
                commands.dispose();
            }
        } finally {
            withTimeout.dispose();
        }
    });
});


class DelayCommand extends RavenCommand<void> {
    private readonly _value: number;

    public constructor(value: number) {
        super();
        this._value = value;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/test/delay?value=" + this._value;

        return {
            method: "GET",
            uri
        };
    }

    get isReadRequest(): boolean {
        return true;
    }
}