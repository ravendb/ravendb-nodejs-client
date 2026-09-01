import { Readable } from "node:stream";
import assert from "node:assert";
import {
    CONSTANTS,
    DocumentConventions,
    GetConversationMessagesOperation,
    GetConversationMessagesOptions,
    IDocumentStore,
    AiConversationMessagesResult
} from "../../../../../../src/index.js";
import { DateUtil } from "../../../../../../src/Utility/DateUtil.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../../../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("AiAgentGetConversationMessages", function () {
    it("validates constructor arguments before any request", async () => {
        await assertThrows(() => new GetConversationMessagesOperation(null as unknown as GetConversationMessagesOptions), err => {
            assertThat((err as Error).name).isEqualTo("ArgumentNullException");
        });

        await assertThrows(() => new GetConversationMessagesOperation(""), err => {
            assertThat((err as Error).name).isEqualTo("ArgumentNullException");
        });

        await assertThrows(() => new GetConversationMessagesOperation(
            new GetConversationMessagesOptions({
                conversationId: "chats/1",
                before: new Date("2026-08-25T20:00:00.000Z"),
                after: new Date("2026-08-25T20:00:01.000Z")
            })), err => {
            assertThat((err as Error).name).isEqualTo("InvalidArgumentException");
            assertThat((err as Error).message).contains("Before and After cannot both be specified.");
        });

        await assertThrows(() => new GetConversationMessagesOperation(
            new GetConversationMessagesOptions({ conversationId: "chats/1", pageSize: 0 })), err => {
            assertThat((err as Error).name).isEqualTo("ArgumentOutOfRangeException");
            assertThat((err as Error).message).contains("PageSize must be greater than 0.");
        });
    });

    it("revives a synthetic response with dates, verbatim parameters and empty-list normalization", async () => {
        const body = JSON.stringify({
            ConversationId: "chats/1",
            Agent: "test-agent",
            Parameters: { UserId: "u-42", MaxItems: 5, Tags: ["a", "b"] },
            TotalUsage: { PromptTokens: 10, CompletionTokens: 20, TotalTokens: 30, CachedTokens: 0, ReasoningTokens: 1 },
            LastMessageAt: "2026-08-25T20:00:02.0000000Z",
            HasMoreMessages: false,
            SubConversationIds: null,
            Attachments: null,
            Messages: [
                {
                    Role: "User",
                    Content: "Hello",
                    Attachments: null,
                    Timestamp: "2026-08-25T20:00:00.0000000Z",
                    ToolCalls: null,
                    Usage: null,
                    SubConversationId: null
                },
                {
                    Role: "Assistant",
                    Content: "Hi there",
                    Attachments: null,
                    Timestamp: "2026-08-25T20:00:01.0000000Z",
                    ToolCalls: [{ Id: "call-1", Name: "Weather", Arguments: "{}", Result: "sunny", SubConversationId: null }],
                    Usage: { PromptTokens: 1, CompletionTokens: 2, TotalTokens: 3, CachedTokens: 0, ReasoningTokens: 0 },
                    SubConversationId: null
                }
            ]
        });

        const command = new GetConversationMessagesOperation("chats/1")
            .getCommand(new DocumentConventions());

        await command.setResponseAsync(Readable.from([body]), false);

        const result = command.result as AiConversationMessagesResult;
        assertThat(result).isNotNull();
        assertThat(result.conversationId).isEqualTo("chats/1");
        assertThat(result.agent).isEqualTo("test-agent");
        assertThat(result.hasMoreMessages).isFalse();

        // Dates revive through the nestedTypes "date" entries
        assertThat(result.lastMessageAt instanceof Date).isTrue();
        assertThat(result.lastMessageAt.toISOString()).isEqualTo("2026-08-25T20:00:02.000Z");

        // Parameter keys stay verbatim (the auto-deserializer would lowercase them) with
        // heterogeneous values
        assertThat(result.parameters["UserId"]).isEqualTo("u-42");
        assertThat(result.parameters["MaxItems"]).isEqualTo(5);
        assert.deepStrictEqual(result.parameters["Tags"], ["a", "b"]);

        assertThat(result.totalUsage.totalTokens).isEqualTo(30);
        assertThat(result.totalUsage.reasoningTokens).isEqualTo(1);

        // Null list keys on the wire revive as empty lists, never null
        assert.deepStrictEqual(result.subConversationIds, []);
        assert.deepStrictEqual(result.attachments, []);
        assertThat(result.messages).hasSize(2);

        const first = result.messages[0];
        assertThat(first.role).isEqualTo("User");
        assertThat(first.content).isEqualTo("Hello");
        assertThat(first.timestamp instanceof Date).isTrue();
        assertThat(first.timestamp.toISOString()).isEqualTo("2026-08-25T20:00:00.000Z");
        assert.deepStrictEqual(first.attachments, []);
        assert.deepStrictEqual(first.toolCalls, []);
        assertThat(first.usage).isNull();
        assertThat(first.subConversationId).isNull();

        const second = result.messages[1];
        assertThat(second.role).isEqualTo("Assistant");
        assertThat(second.content).isEqualTo("Hi there");
        assertThat(second.toolCalls).hasSize(1);
        assertThat(second.toolCalls[0].name).isEqualTo("Weather");
        assertThat(second.toolCalls[0].result).isEqualTo("sunny");
        assertThat(second.usage.promptTokens).isEqualTo(1);
        assertThat(second.usage.totalTokens).isEqualTo(3);
    });

    it("revives parameters as null when the wire carries null", async () => {
        const body = JSON.stringify({
            ConversationId: "chats/1",
            Agent: "test-agent",
            Parameters: null,
            TotalUsage: null,
            LastMessageAt: "2026-08-25T20:00:02.0000000Z",
            HasMoreMessages: false,
            SubConversationIds: null,
            Attachments: null,
            Messages: []
        });

        const command = new GetConversationMessagesOperation("chats/1")
            .getCommand(new DocumentConventions());

        await command.setResponseAsync(Readable.from([body]), false);

        const result = command.result as AiConversationMessagesResult;
        assertThat(result.parameters).isNull();
        assertThat(result.totalUsage).isNull();
        assert.deepStrictEqual(result.messages, []);
        assert.deepStrictEqual(result.subConversationIds, []);
        assert.deepStrictEqual(result.attachments, []);
    });

    describe("live server", function () {
        let store: IDocumentStore;

        beforeEach(async function () {
            store = await testContext.getDocumentStore();
        });

        afterEach(async () =>
            await disposeTestDocumentStore(store));

        it("reads a seeded conversation document", async function () {
            const conversationId = "chats/seeded-read";
            await seedConversation(store, conversationId, [
                { role: "system", content: "You are a helpful test assistant.", date: ravenTimestamp("2026-08-25T20:00:00.000Z") },
                { role: "user", content: "Hello, how are you?", date: ravenTimestamp("2026-08-25T20:00:01.000Z") },
                { role: "assistant", content: "I am fine, thank you!", date: ravenTimestamp("2026-08-25T20:00:02.000Z") },
                { role: "user", content: "What is the weather?", date: ravenTimestamp("2026-08-25T20:00:03.000Z") }
            ]);

            const result = await store.ai.getConversationMessages(conversationId);

            assertThat(result).isNotNull();
            assertThat(result.conversationId).isEqualTo(conversationId);
            assertThat(result.agent).isEqualTo("test-agent");
            assertThat(result.lastMessageAt instanceof Date).isTrue();

            // The default (Simple) view drops the system message; the rest keep their order
            assertThat(result.messages).hasSize(3);
            assertThat(result.messages[0].role).isEqualTo("User");
            assertThat(result.messages[0].content).isEqualTo("Hello, how are you?");
            assertThat(result.messages[1].role).isEqualTo("Assistant");
            assertThat(result.messages[1].content).isEqualTo("I am fine, thank you!");
            assertThat(result.messages[2].role).isEqualTo("User");
            assertThat(result.messages[2].content).isEqualTo("What is the weather?");
            assertThat(result.messages[0].timestamp instanceof Date).isTrue();
            assert.deepStrictEqual(result.messages[0].attachments, []);
            assert.deepStrictEqual(result.messages[0].toolCalls, []);

            // Parameter keys pass through verbatim with heterogeneous values
            assertThat(result.parameters["UserId"]).isEqualTo("u-1");
            assertThat(result.parameters["MaxItems"]).isEqualTo(3);
            assert.deepStrictEqual(result.parameters["Tags"], ["x", "y"]);

            assertThat(result.totalUsage.totalTokens).isEqualTo(15);
        });

        it("returns null for a missing conversation", async function () {
            const result = await store.ai.getConversationMessages("chats/does-not-exist");
            assertThat(result).isNull();
        });

        it("before paging returns only older messages", async function () {
            const conversationId = "chats/seeded-before";
            await seedConversation(store, conversationId, [
                { role: "system", content: "You are a helpful test assistant.", date: ravenTimestamp("2026-08-25T20:00:00.000Z") },
                { role: "user", content: "older", date: ravenTimestamp("2026-08-25T20:00:01.000Z") },
                { role: "assistant", content: "newer", date: ravenTimestamp("2026-08-25T20:00:02.000Z") }
            ]);

            const before = new Date("2026-08-25T20:00:02.000Z");
            const result = await store.ai.getConversationMessages(new GetConversationMessagesOptions({
                conversationId,
                before,
                detailLevel: "Detailed"
            }));

            // before is an exclusive upper bound: the 20:00:02 message is excluded
            assertThat(result).isNotNull();
            assertThat(result.messages).hasSize(2);
            assertThat(result.messages[0].role).isEqualTo("System");
            assertThat(result.messages[1].role).isEqualTo("User");
            for (const message of result.messages) {
                assertThat(message.timestamp.getTime()).isLessThan(before.getTime());
            }
        });

        async function seedConversation(store: IDocumentStore, conversationId: string, messages: { role: string; content: string; date: string }[]) {
            // PascalCase keys stored verbatim (no field-name converter by default); the server's
            // ConversationDocument.ToDocument reads exactly these fields.
            const conversation = {
                Agent: "test-agent",
                Parameters: { UserId: "u-1", MaxItems: 3, Tags: ["x", "y"] },
                Messages: messages,
                LinkedConversations: [],
                TotalUsage: { PromptTokens: 10, CompletionTokens: 5, TotalTokens: 15, CachedTokens: 0, ReasoningTokens: 0 },
                OpenActionCalls: {},
                LastMessageAt: messages[messages.length - 1].date,
                CreatedAt: messages[0].date,
                Expires: null,
                RemainingToolIterations: 16,
                SubConversationIds: []
            };

            const session = store.openSession();
            await session.store(conversation, conversationId);
            session.advanced.getMetadataFor(conversation)[CONSTANTS.Documents.Metadata.COLLECTION] = "@conversations";
            await session.saveChanges();
        }

        function ravenTimestamp(iso: string): string {
            return DateUtil.utc.stringify(new Date(iso));
        }
    });
});
