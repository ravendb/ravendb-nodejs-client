import assert from "node:assert";
import { ConfigureSchemaValidationOperation, IDocumentStore, LimitType } from "../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../Utils/TestUtil.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("LicenseLimitExceptionTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    (RavenTestContext.isPullRequest ? it : it.skip)("carries the limit type the license lacks", async () => {
        const configure = new ConfigureSchemaValidationOperation({
            validatorsPerCollection: { Users: { schema: "{}" } }
        });

        await assert.rejects(async () => store.maintenance.send(configure), (err: Error & { limitType?: LimitType }) => {
            assert.strictEqual(err.name, "LicenseLimitException");
            assert.strictEqual(err.limitType, "SchemaValidation");
            return true;
        });
    });
});
