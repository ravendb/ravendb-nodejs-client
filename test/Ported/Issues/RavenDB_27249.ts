import assert from "node:assert";
import {
    AiConnectionString,
    DocumentConventions,
    GenAiConfiguration,
    GenAiTransformation,
    IDocumentStore,
    OpenAiSettings,
    PutConnectionStringOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { AiAgentConfiguration } from "../../../src/Documents/Operations/AI/Agents/config/AiAgentConfiguration.js";

const SCHEMA = "{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"}},\"required\":[\"id\"],\"additionalProperties\":false}";

(RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest ? describe : describe.skip)("RavenDB_27249", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("handWrittenSchemaStrictSurvivesSave", async () => {
        const connectionString = new AiConnectionString();
        connectionString.name = "fake-connection";
        connectionString.identifier = "fake-connection";
        connectionString.modelType = "Chat";
        connectionString.openAiSettings = new OpenAiSettings("fake-key", "http://localhost:1/", "fake-model");
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const agent: AiAgentConfiguration = {
            name: "strict-tools",
            connectionStringName: "fake-connection",
            systemPrompt: "You answer questions about orders.",
            queries: [
                { name: "FromSample", description: "d", query: "from Orders where id() = $id", parametersSampleObject: "{\"id\": \"orders/1\"}" },
                { name: "QueryStrict", description: "d", query: "from Orders where id() = $id", parametersSchema: SCHEMA, strict: true }
            ],
            actions: [
                { name: "ActionNotStrict", description: "d", parametersSchema: SCHEMA },
                { name: "ActionStrict", description: "d", parametersSchema: SCHEMA, strict: true }
            ]
        };

        await store.ai.createAgent(agent, { customer: "name", city: "city" });

        const saved = (await store.ai.getAgents()).aiAgents;
        assertThat(saved.length).isEqualTo(1);

        assert.deepStrictEqual(saved[0].queries.map(q => !!q.strict), [false, true]);
        assert.deepStrictEqual(saved[0].actions.map(a => !!a.strict), [false, true]);
    });
});

describe("RavenDB_27249 GenAiConfiguration", function () {

    function genAiConfigWithStrict(strict: boolean): GenAiConfiguration {
        const config = new GenAiConfiguration();
        config.name = "genai-strict";
        config.connectionStringName = "genai-cs";
        config.collection = "Docs";
        config.prompt = "Use the query tool to answer.";
        config.sampleObject = "{\"Answer\":\"a\"}";
        const transformation = new GenAiTransformation();
        transformation.script = "ai.genContext(this);";
        config.genAiTransformation = transformation;
        config.queries = [{
            name: "Q",
            description: "run the query",
            query: "from Products where id() = $id",
            parametersSchema: SCHEMA,
            strict
        }];
        return config;
    }

    it("sendsStrictOnlyWhenSet", () => {
        const conventions = new DocumentConventions();

        const strict = genAiConfigWithStrict(true).serialize(conventions) as any;
        assertThat(strict.Queries[0].Strict).isTrue();

        const notStrict = genAiConfigWithStrict(false).serialize(conventions) as any;
        assertThat("Strict" in notStrict.Queries[0] && notStrict.Queries[0].Strict !== undefined).isFalse();
    });
});
