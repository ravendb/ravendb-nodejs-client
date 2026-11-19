import { randomUUID } from "node:crypto";
import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Document {
    public id: string;
}

describe("CaseSensitiveDeletes", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("should work with count", async () => {
        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            for (let j = 0; j < 60; j++) {
                await session.store(Object.assign(new Document(), { id: "CaseSensitiveIndex" + randomUUID() }));
            }
            await session.saveChanges();

            const deletes = await session.query(Document).waitForNonStaleResults().all();
            for (const doc of deletes) {
                session.delete(doc);
            }
            await session.saveChanges();

            const count = await session.query(Document).waitForNonStaleResults().count();
            assertThat(count).isEqualTo(0);
        }
    });
});
