import { IDocumentStore } from "../../../../src/index.js";
import { GetRequest } from "../../../../src/Documents/Commands/MultiGet/GetRequest.js";
import { MultiGetCommand } from "../../../../src/Documents/Commands/MultiGet/MultiGetCommand.js";
import { HEADERS } from "../../../../src/Constants.js";
import { User } from "../../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

function getRequest(id: string, ifNoneMatch?: string): GetRequest {
    const request = new GetRequest();
    request.url = "/docs";
    request.query = "?id=" + id;
    if (ifNoneMatch) {
        request.headers[HEADERS.IF_NONE_MATCH] = ifNoneMatch;
    }
    return request;
}

describe("MultiGetBasic", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can handle caching", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Ayende" }));
            await session.store(Object.assign(new User(), { name: "Oren" }));
            await session.saveChanges();
        }

        const requestExecutor = store.getRequestExecutor();

        const firstCommand = new MultiGetCommand(requestExecutor, store.conventions, [
            getRequest("users/1-A"),
            getRequest("users/2-A")
        ]);
        try {
            await requestExecutor.execute(firstCommand);
        } finally {
            firstCommand.dispose();
        }

        assertThat(firstCommand.result[0].headers)
            .containsKey(HEADERS.ETAG);
        assertThat(firstCommand.result[1].headers)
            .containsKey(HEADERS.ETAG);

        const secondCommand = new MultiGetCommand(requestExecutor, store.conventions, [
            getRequest("users/1-A", firstCommand.result[0].headers[HEADERS.ETAG]),
            getRequest("users/2-A", firstCommand.result[1].headers[HEADERS.ETAG])
        ]);
        try {
            await requestExecutor.execute(secondCommand);
        } finally {
            secondCommand.dispose();
        }

        assertThat(secondCommand.result[0].statusCode)
            .isEqualTo(304);
        assertThat(secondCommand.result[1].statusCode)
            .isEqualTo(304);
    });

    it("can use multi get to batch get document requests", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Ayende" }));
            await session.store(Object.assign(new User(), { name: "Oren" }));
            await session.saveChanges();
        }

        const requestExecutor = store.getRequestExecutor();

        const command = new MultiGetCommand(requestExecutor, store.conventions, [
            getRequest("users/1-A"),
            getRequest("users/2-A")
        ]);
        try {
            await requestExecutor.execute(command);
        } finally {
            command.dispose();
        }

        assertThat(JSON.parse(command.result[0].result).Results[0].name)
            .isEqualTo("Ayende");
        assertThat(JSON.parse(command.result[1].result).Results[0].name)
            .isEqualTo("Oren");
    });
});
