import {
    AiConnectionString,
    GetConnectionStringsOperation,
    IDocumentStore,
    OpenAiSettings,
    PutConnectionStringOperation
} from "../../src/index.js";
import {disposeTestDocumentStore, RavenTestContext, testContext} from "../Utils/TestUtil.js";
import {assertThat} from "../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("RDBC-1115 - OpenAI reasoning effort", () => {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    for (const effort of ["High", "xhigh", undefined]) {
        it(`reasoningEffortSurvivesAConnectionStringRoundTrip(${effort})`, async () => {
            const connectionString = Object.assign(new AiConnectionString(), {
                name: "reasoning-effort-round-trip",
                modelType: "Chat",
                openAiSettings: new OpenAiSettings(
                    "api-key", "https://api.openai.com/", "gpt-5-mini",
                    undefined, undefined, undefined, undefined, undefined, effort)
            });

            await store.maintenance.send(new PutConnectionStringOperation(connectionString));

            const result = await store.maintenance.send(new GetConnectionStringsOperation(connectionString.name, "Ai"));

            assertThat(result.aiConnectionStrings[connectionString.name].openAiSettings.reasoningEffort)
                .isEqualTo(effort);
        });
    }
});
