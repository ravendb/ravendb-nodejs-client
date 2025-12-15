import {
    AddOrUpdateAiAgentOperation,
    IDocumentStore,
    PutConnectionStringOperation,
    RavenConnectionString
} from "../../../../src/index.js";
import {disposeTestDocumentStore, RavenTestContext, testContext} from "../../../Utils/TestUtil.js";
import {assertThat, assertThrows} from "../../../Utils/AssertExtensions.js";
import {AiAgentConfiguration} from "../../../../src/Documents/Operations/AI/Agents/config/AiAgentConfiguration.js";

((RavenTestContext.isRavenDbServerVersion("7.1") && !RavenTestContext.isPullRequest) ? describe : describe.skip)("AiAgentTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateAiAgent", async () => {
        const csName = `r1-${Date.now()}`;
        const ravenConnectionString = Object.assign(new RavenConnectionString(), {
            database: store.database,
            topologyDiscoveryUrls: ["http://localhost:8080"],
            name: csName
        });
        await store.maintenance.send(new PutConnectionStringOperation(ravenConnectionString));

        const agentConfiguration: AiAgentConfiguration = {
            name: `TestAgent-${Date.now()}`,
            connectionStringName: csName,
            systemPrompt: "You are a helpful assistant for querying document data.",
            sampleObject: JSON.stringify({
                result: "sample result data",
                queryTime: "time taken to process query"
            }),
            parameters: [{
                name: "query",
                description: "The query to execute against the database"
            }],
            maxModelIterationsPerCall: 3,
            queries: [{
                name: "execute-query",
                description: "Executes the provided query against the database",
                query: "from @collection as c where c.name == $queryName select c",
                parametersSampleObject: JSON.stringify({
                    queryName: "Example query parameter"
                })
            }]
        };

        const createOp = new AddOrUpdateAiAgentOperation(agentConfiguration);
        const result = await store.maintenance.send(createOp);

        assertThat(result).isNotNull();
        assertThat(result.identifier).isNotNull();
        assertThat(result.raftCommandIndex).isGreaterThan(0);

        const agentResponse = await store.ai.getAgent(result.identifier);
        assertThat(agentResponse).isNotNull();
        assertThat(agentResponse.name).isEqualTo(agentConfiguration.name);
        assertThat(agentResponse.connectionStringName).isEqualTo(agentConfiguration.connectionStringName);
        assertThat(agentResponse.systemPrompt).isEqualTo(agentConfiguration.systemPrompt);
    });

    it("canUpdateAiAgent", async () => {
        const csName = `r1-${Date.now()}`;
        const ravenConnectionString = Object.assign(new RavenConnectionString(), {
            database: store.database,
            topologyDiscoveryUrls: ["http://localhost:8080"],
            name: csName
        });
        await store.maintenance.send(new PutConnectionStringOperation(ravenConnectionString));

        const name = `Agent-${Date.now()}`;
        const initialConfig: AiAgentConfiguration = {
            name,
            connectionStringName: csName,
            systemPrompt: "initial prompt",
            sampleObject: JSON.stringify({foo: "bar"}),
            maxModelIterationsPerCall: 2,
            queries: []
        };
        const createRes = await store.maintenance.send(new AddOrUpdateAiAgentOperation(initialConfig));

        const updatedConfig: AiAgentConfiguration = {
            ...initialConfig,
            systemPrompt: "updated prompt",
            parameters: [{name: "p", description: "param"}]
        };
        await store.maintenance.send(new AddOrUpdateAiAgentOperation(updatedConfig));

        const agent = await store.ai.getAgent(createRes.identifier);
        assertThat(agent).isNotNull();
        assertThat(agent.systemPrompt).isEqualTo("updated prompt");
        assertThat(agent.parameters).isNotNull();
        assertThat(agent.parameters.length).isEqualTo(1);
        assertThat(agent.parameters[0].name).isEqualTo("p");
    });

    it("canListAndDeleteAiAgent", async () => {
        const csName = `r1-${Date.now()}`;
        const ravenConnectionString = Object.assign(new RavenConnectionString(), {
            database: store.database,
            topologyDiscoveryUrls: ["http://localhost:8080"],
            name: csName
        });
        await store.maintenance.send(new PutConnectionStringOperation(ravenConnectionString));

        const name = `agent-${Date.now()}`;
        const config: AiAgentConfiguration = {
            name,
            connectionStringName: csName,
            systemPrompt: "prompt",
            sampleObject: JSON.stringify({a: 1}),
            queries: []
        };
        const res = await store.maintenance.send(new AddOrUpdateAiAgentOperation(config));

        const list = await store.ai.getAgents();
        assertThat(list).isNotNull();
        assertThat(list.aiAgents).isNotNull();
        const found = list.aiAgents.find(a => a.name === name);
        assertThat(!!found).isTrue();

        const delRes = await store.ai.deleteAgent(res.identifier);
        assertThat(delRes).isNotNull();
        const afterDelete = await store.ai.getAgents();
        assertThat(afterDelete.aiAgents.length).isEqualTo(0);
    });

    it("cannotCreateAgentWithoutSchemaOrSampleObject", async () => {
        const badConfig: Partial<AiAgentConfiguration> = {
            name: `BadAgent-${Date.now()}`,
            connectionStringName: "cs",
            systemPrompt: "prompt",
            // missing both outputSchema and sampleObject
            queries: []
        }

        await assertThrows(() => store.maintenance.send(new AddOrUpdateAiAgentOperation(badConfig as AiAgentConfiguration)), err => {
            assertThat(err.message)
                .contains("Please provide a non-empty value for either outputSchema or sampleObject.");
        });
    });
});
