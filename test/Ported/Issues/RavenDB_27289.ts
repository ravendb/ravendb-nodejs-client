import {
    AddOrUpdateAiAgentOperation,
    AiConnectionString,
    AiConversationCreationOptions,
    IDocumentStore,
    OpenAiSettings,
    PutConnectionStringOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";
import { AiAgentConfiguration } from "../../../src/Documents/Operations/AI/Agents/config/AiAgentConfiguration.js";

const OWN_HANDLE = "abc123";
const OTHER_HANDLE = "victim99";

class SupportTicket {
    public telegramHandle: string;
    public subject: string;
}

(RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest ? describe : describe.skip)("RavenDB_27289", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function createAgent(sendToModel: boolean, parametersSchema?: string): AiAgentConfiguration {
        return {
            name: "support assistant",
            connectionStringName: "fake-connection",
            systemPrompt: "You help users with their own support tickets.",
            parameters: [{
                name: "TelegramUsername",
                description: "the handle of the sender",
                sendToModel
            }],
            queries: [{
                name: "MyTickets",
                description: "Get the tickets of the current user",
                query: "from SupportTickets where telegramHandle = $TelegramUsername limit 5",
                parametersSampleObject: parametersSchema ? undefined : "{}",
                parametersSchema
            }],
            sampleObject: "{\"Answer\":\"The answer to the query\"}"
        };
    }

    async function seed() {
        const session = store.openSession();
        await session.store(Object.assign(new SupportTicket(), { telegramHandle: OWN_HANDLE, subject: "this is my own ticket" }));
        await session.store(Object.assign(new SupportTicket(), { telegramHandle: OTHER_HANDLE, subject: "this is the secret ticket" }));
        await session.saveChanges();
    }

    it("theRefusalReachesTheClientAsItsOwnType", async () => {
        await seed();

        // the refusal happens before the provider is contacted, so nothing has to answer at that address
        const connectionString = new AiConnectionString();
        connectionString.name = "fake-connection";
        connectionString.identifier = "fake-connection";
        connectionString.modelType = "Chat";
        connectionString.openAiSettings = new OpenAiSettings("fake-key", "http://localhost:1/", "fake-model");
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const result = await store.maintenance.send(new AddOrUpdateAiAgentOperation(createAgent(false)));

        const chat = store.ai.conversation(result.identifier, "chats/",
            new AiConversationCreationOptions().addParameter("TelegramUsername", { Handle: OWN_HANDLE }));

        chat.setUserPrompt("show my tickets");

        await assertThrows(() => chat.run(), err => {
            assertThat(err.name)
                .isEqualTo("UnsupportedAiQueryParameterException");
            assertThat(err.message)
                .contains("$TelegramUsername");
        });
    });

    it("toolSchemaDeclaringTheScopingParameterAsOptionalIsRejected", async () => {
        // the parameter sits in 'properties' with an empty 'required'
        const optionalScopingParameter =
            "{\"type\":\"object\",\"properties\":{\"TelegramUsername\":{\"type\":\"string\"}},\"required\":[],\"additionalProperties\":false}";

        const agent = createAgent(false, optionalScopingParameter);

        await assertThrows(() => store.maintenance.send(new AddOrUpdateAiAgentOperation(agent)), err => {
            assertThat(err.name)
                .isEqualTo("AiAgentParameterCollisionException");
            assertThat(err.message)
                .contains("TelegramUsername");
        });
    });
});
