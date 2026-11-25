import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class SectionData {
    public id: string;
    public referencing: string;
    public count: number;
}

class Sections extends AbstractJavaScriptIndexCreationTask<SectionData> {
    public constructor() {
        super();

        const { load } = this.mapUtils();

        this.map(SectionData, data => ({
            _: load(data.referencing, "SectionDatas")
        }));
    }
}

describe("ConcurrencyTests", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can save referencing and referenced documents in one go", async () => {
        await new Sections().execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new SectionData(), { id: "sections/1", referencing: null, count: 0 }));
            await session.store(Object.assign(new SectionData(), { id: "sections/2", referencing: "sections/1", count: 0 }));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        const session = store.openSession();
        session.advanced.useOptimisticConcurrency = true;
        const foos = await session.query(SectionData).all();

        for (const sectionData of foos) {
            sectionData.count++;
        }

        await session.saveChanges();
    });
});
