import {
    AddGenAiOperation,
    GenAiConfiguration,
    GenAiTransformation,
    IDocumentStore,
    PutConnectionStringOperation,
    StartingPointChangeVector,
    UpdateGenAiOperation
} from "../../../../src/index.js";
import {disposeTestDocumentStore, RavenTestContext, testContext} from "../../../Utils/TestUtil.js";
import {assertThat, assertThrows} from "../../../Utils/AssertExtensions.js";
import {AiConnectionString, OpenAiSettings} from "../../../../src/Documents/Operations/AI/ConnectionStrings/index.js";

((RavenTestContext.isRavenDbServerVersion("7.1") && !RavenTestContext.isPullRequest) ? describe : describe.skip)("GenAiEtlTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function putAiConnectionString(docStore: IDocumentStore) {
        const csName = `genai-${Date.now()}`;
        const aiConnectionString = new AiConnectionString();
        aiConnectionString.name = csName;
        aiConnectionString.identifier = "openai-test";
        aiConnectionString.modelType = "Chat";
        aiConnectionString.openAiSettings = new OpenAiSettings("test", "https://api.openai.example", "gpt-test");

        await docStore.maintenance.send(new PutConnectionStringOperation(aiConnectionString));

        return csName;
    }

    function createBaseGenAiConfiguration(csName: string) {
        const config = new GenAiConfiguration();
        config.name = `GenAiTask-${Date.now()}`;
        config.connectionStringName = csName;
        config.collection = "Users";
        config.identifier = "users-genai";

        const transformation = new GenAiTransformation();
        transformation.script = "ai.genContext({ name: this.Name });";
        config.genAiTransformation = transformation;

        return config;
    }

    it("canAddGenAiEtlTask", async () => {
        const csName = await putAiConnectionString(store);

        const config = createBaseGenAiConfiguration(csName);
        config.prompt = "Enrich user document: {{context}}";
        config.sampleObject = JSON.stringify({result: "sample"});
        config.updateScript = "function update(doc, result) { doc.genai = result; return doc; }";

        const errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        const op = new AddGenAiOperation(config, StartingPointChangeVector.LastDocument);
        const result = await store.maintenance.send(op);

        assertThat(result).isNotNull();
        assertThat(result.identifier).isEqualTo(config.identifier);
        assertThat(result.taskId).isGreaterThan(0);
        assertThat(result.raftCommandIndex).isGreaterThan(0);
    });

    it("canUpdateGenAiEtlTaskAndChangeStartingPoint", async () => {
        const csName = await putAiConnectionString(store);

        const config = createBaseGenAiConfiguration(csName);
        config.prompt = "Enrich user document: {{context}}";
        config.sampleObject = JSON.stringify({result: "sample"});
        config.updateScript = "function update(doc, result) { doc.genai = result; return doc; }";

        const addOp = new AddGenAiOperation(config, StartingPointChangeVector.LastDocument);
        const addResult = await store.maintenance.send(addOp);

        const updatedConfig = createBaseGenAiConfiguration(csName);
        updatedConfig.name = config.name;
        updatedConfig.collection = config.collection;
        updatedConfig.identifier = config.identifier;
        updatedConfig.prompt = "Updated prompt: {{context}}";
        updatedConfig.sampleObject = config.sampleObject;
        updatedConfig.updateScript = config.updateScript;

        const updatedTransformation = new GenAiTransformation();
        updatedTransformation.script = "ai.genContext({ name: this.Name, updated: true });";
        updatedConfig.genAiTransformation = updatedTransformation;

        const updateOp = new UpdateGenAiOperation(
            addResult.taskId,
            updatedConfig,
            StartingPointChangeVector.BeginningOfTime,
            true
        );
        const updateResult = await store.maintenance.send(updateOp);

        assertThat(updateResult).isNotNull();
        assertThat(updateResult.taskId).isEqualTo(addResult.taskId + 1);
        assertThat(updateResult.raftCommandIndex).isGreaterThan(0);
    });

    it("cannotCreateGenAiEtlWithoutSchemaOrSampleObject", async () => {
        const csName = await putAiConnectionString(store);

        const config = createBaseGenAiConfiguration(csName);
        config.prompt = "prompt";
        // missing both jsonSchema and sampleObject
        config.updateScript = "function update(doc, result) { return doc; }";

        await assertThrows(() => {
            const op = new AddGenAiOperation(config, StartingPointChangeVector.LastDocument);
            return store.maintenance.send(op);
        }, err => {
            assertThat(err.message)
                .contains("You must provide either a JSON schema or a sample object");
        });
    });
});
