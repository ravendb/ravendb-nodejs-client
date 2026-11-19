import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestModel {
    public id: string;

    public constructor(id?: string) {
        this.id = id;
    }
}

describe("BuildStarted", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("document store works when adding item and then grabbing non existing item and storing new one", async () => {
        const session = store.openSession();
        await session.store(new TestModel("1"));
        await session.saveChanges();

        const testModelItem = await session.query(TestModel).whereEquals("id", "2").singleOrNull()
            ?? new TestModel("2");
        assertThat(testModelItem).isNotNull();
        await session.store(testModelItem);
        await session.saveChanges();

        const list = await session.query(TestModel)
            .waitForNonStaleResults()
            .all();
        assertThat(list).hasSize(2);
    });

    it("document store works when adding item then deleting it and then grabbing non existing item and storing new one", async () => {
        const session = store.openSession();
        const deletedModel = new TestModel("1");
        await session.store(deletedModel);
        await session.saveChanges();

        session.delete(deletedModel);
        await session.saveChanges();

        const testModelItem = await session.query(TestModel).whereEquals("id", "2").singleOrNull()
            ?? new TestModel("2");
        assertThat(testModelItem).isNotNull();
        await session.store(testModelItem);
        await session.saveChanges();

        const list = await session.query(TestModel)
            .waitForNonStaleResults()
            .all();
        assertThat(list).hasSize(1);
    });
});
