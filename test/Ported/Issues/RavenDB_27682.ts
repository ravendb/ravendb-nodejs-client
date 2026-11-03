import {
    AiConnectionString,
    EmbeddedSettings,
    IDocumentStore,
    PutConnectionStringOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest ? describe : describe.skip)("RavenDB_27682", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    for (const embeddingsMaxConcurrentBatches of [0, -1]) {
        it(`putConnectionString_RejectsNonPositiveEmbeddingsMaxConcurrentBatches (${embeddingsMaxConcurrentBatches})`, async () => {
            const embeddedSettings = new EmbeddedSettings();
            embeddedSettings.embeddingsMaxConcurrentBatches = embeddingsMaxConcurrentBatches;

            const connectionString = new AiConnectionString();
            connectionString.name = "invalid connection";
            connectionString.identifier = "invalid-connection";
            connectionString.modelType = "TextEmbeddings";
            connectionString.embeddedSettings = embeddedSettings;

            // client-side validation reports the same problem
            assertThat(connectionString.validate())
                .contains("Value of 'embeddingsMaxConcurrentBatches' field must be a positive number.");

            await assertThrows(() => store.maintenance.send(new PutConnectionStringOperation(connectionString)), err => {
                assertThat(err.name)
                    .isEqualTo("BadRequestException");
                assertThat(err.message)
                    .contains("Value of `EmbeddingsMaxConcurrentBatches` field must be a positive number.");
            });
        });
    }
});
