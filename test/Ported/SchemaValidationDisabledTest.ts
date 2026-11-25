import assert from "node:assert";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../Utils/TestUtil.js";
import {
    ConfigureSchemaValidationOperation,
    GetSchemaValidationConfiguration,
    IDocumentStore,
    SchemaValidationConfiguration
} from "../../src/index.js";

class User {
    public age: number;

    constructor(age: number) {
        this.age = age;
    }
}

const userSchema = JSON.stringify({
    type: "object",
    properties: {
        age: { type: "integer", minimum: 21 }
    },
    required: ["age"]
});

((RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest) ? describe : describe.skip)(
    "SchemaValidationDisabledTest", function () {

        let store: IDocumentStore;

        beforeEach(async function () {
            store = await testContext.getDocumentStore();
        });

        afterEach(async () =>
            await disposeTestDocumentStore(store));

        async function storeUser(age: number): Promise<void> {
            const session = store.openSession();
            await session.store(new User(age));
            await session.saveChanges();
        }

        it("skips validation of every collection while the whole configuration is disabled", async () => {
            const configuration: SchemaValidationConfiguration = {
                disabled: true,
                validatorsPerCollection: {
                    Users: { schema: userSchema }
                }
            };

            await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

            const stored = await store.maintenance.send(new GetSchemaValidationConfiguration());
            assert.strictEqual(stored.disabled, true);
            assert.strictEqual(stored.validatorsPerCollection["Users"].disabled, false);

            await storeUser(17);

            configuration.disabled = false;
            await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

            const enabled = await store.maintenance.send(new GetSchemaValidationConfiguration());
            assert.strictEqual(enabled.disabled, false);

            await assert.rejects(async () => storeUser(18), /18/);
        });
    });
