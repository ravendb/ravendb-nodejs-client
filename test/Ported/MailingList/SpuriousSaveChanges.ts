import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

class Item {
    v: string;

    constructor(v: string) {
        this.v = v;
    }
}

describe("SpuriousSaveChanges", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store)
    );

    it("willNotSaveUnmodifiedDocuments", async () => {

        await createData(store);

        {
            const session = store.openSession();
            const result = await session.query<Item>({ collection: "items" })
                .all();
            assertThat(session.advanced.hasChanged(result[0]))
                .isFalse();
            const old = session.advanced.numberOfRequests;
            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(old);
        }
    });

    async function createData(store: IDocumentStore): Promise<void> {
        const session = store.openSession();
        await session.store(new Item("f"), "items/1");
        await session.saveChanges();
    }
});
