import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class EntityA2 {
    public entityBId: string;
}

class EntityA {
    public id: string;
    public things: Record<string, EntityA2> = {};
}

class EntityB {
    public id: string;
}

describe("RavenDB_14328", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("loading document including reference nested in dictionary", async () => {
        let aId: string;
        let bId: string;

        {
            const session = store.openSession();
            const a = new EntityA();
            const b = new EntityB();
            await session.store(a);
            await session.store(b);
            aId = a.id;
            bId = b.id;

            a.things["not_important"] = Object.assign(new EntityA2(), { entityBId: b.id });

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.include("things[].entityBId").load(aId, EntityA);
            const b = await session.load(bId, EntityB);
            assertThat(b).isNotNull();
        }
    });
});
