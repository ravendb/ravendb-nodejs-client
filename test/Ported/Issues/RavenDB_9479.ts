import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Question {
    public id: string;
    public name: string;
    public letter: string;
}

describe("RavenDB_9479", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeAndLoad(question: Question) {
        {
            const session = store.openSession();
            await session.store(question);
            await session.saveChanges();
        }

        const session = store.openSession();
        return await session.load(question.id, Question);
    }

    it("get store and get char", async () => {
        for (const code of [0, 1, 16, 32, 127, 159, 114]) {
            const ch = String.fromCharCode(code);
            const question = new Question();
            question.letter = ch;

            const loaded = await storeAndLoad(question);
            assertThat(loaded.letter).isEqualTo(ch);
        }
    });

    it("get store and get control char", async () => {
        const question = new Question();
        question.letter = "\0";
        question.name = "Hello \0 World";

        const loaded = await storeAndLoad(question);
        assertThat(loaded.letter).isEqualTo("\0");
        assertThat(loaded.name).isEqualTo("Hello \0 World");
    });
});
