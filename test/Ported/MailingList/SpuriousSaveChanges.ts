import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../../src";

class item{

    constructor(v : string){
        this.v = v;
    }

    v : string;
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
            const result = await session.query<item>({ collection: "items" })
                .all();
            assert.ok(!session.advanced.hasChanged(result[0]));
            var old = session.advanced.numberOfRequests;
            await session.saveChanges();
            assert.strictEqual(old, session.advanced.numberOfRequests);
        }
    });

    async function createData(store: IDocumentStore): Promise<void> {
        const session = store.openSession();
        await session.store(new item("f"), "items/1");
        await session.saveChanges();
    }

});
