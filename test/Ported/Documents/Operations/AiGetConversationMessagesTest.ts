import { GetConversationMessagesOperation, IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../../Utils/AssertExtensions.js";

describe("AiGetConversationMessagesTest - validation", function () {

    it("requires conversationId", async () => {
        await assertThrows(() => Promise.resolve(new GetConversationMessagesOperation("")), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
            assertThat(err.message).contains("conversationId");
        });

        await assertThrows(() => Promise.resolve(new GetConversationMessagesOperation({ conversationId: null })), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
        });
    });

    it("rejects before and after together", async () => {
        await assertThrows(() => Promise.resolve(new GetConversationMessagesOperation({
            conversationId: "chats/1",
            before: new Date(),
            after: new Date()
        })), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
            assertThat(err.message).contains("before and after cannot both be specified");
        });
    });

    it("rejects non-positive pageSize", async () => {
        for (const pageSize of [0, -1]) {
            await assertThrows(() => Promise.resolve(new GetConversationMessagesOperation({
                conversationId: "chats/1",
                pageSize
            })), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
                assertThat(err.message).contains("pageSize must be greater than 0");
            });
        }
    });
});

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("AiGetConversationMessagesTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("returns null for missing conversation", async () => {
        const result = await store.ai.getConversationMessages("chats/does-not-exist");

        assertThat(result)
            .isNull();
    });
});
