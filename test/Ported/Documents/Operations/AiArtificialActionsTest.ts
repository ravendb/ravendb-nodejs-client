import {IDocumentStore} from "../../../../src/index.js";
import {disposeTestDocumentStore, RavenTestContext, testContext} from "../../../Utils/TestUtil.js";
import {assertThat, assertThrows} from "../../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.1") ? describe : describe.skip)("AiArtificialActionsTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("addArtificialActionWithResponse validates inputs", async () => {
        const conv = store.ai.conversation("agents/1-A", "conversations/100|") as any;

        await assertThrows(() => Promise.resolve(conv.addArtificialActionWithResponse("", "x")), err => {
            assertThat(err.message).contains("toolId cannot be empty");
        });

        await assertThrows(() => Promise.resolve(conv.addArtificialActionWithResponse("tool-1", "")), err => {
            assertThat(err.message).contains("actionResponse cannot be null or empty");
        });

        // valid usage should not throw
        conv.addArtificialActionWithResponse("tool-1", "some result");
        assertThat(conv._artificialActions.length).isSameAs(1);
        assertThat(conv._artificialActions[0].toolId).isSameAs("tool-1");
        assertThat(conv._artificialActions[0].content).isSameAs("some result");
    });

    it("addArtificialActionWithResponseObject serializes objects using JSON when no mapper is configured", async () => {
        const conv = store.ai.conversation("agents/1-A", "conversations/101|") as any;

        const payload = {recommend: false, reason: "too expensive"};
        conv.addArtificialActionWithResponseObject("GetUserPreferences", payload);

        assertThat(conv._artificialActions.length).isSameAs(1);
        const entry = conv._artificialActions[0];
        assertThat(entry.toolId).isSameAs("GetUserPreferences");

        const parsed = JSON.parse(entry.content);
        assertThat(parsed.recommend).isFalse();
        assertThat(parsed.reason).isSameAs("too expensive");
    });
});

