import { AbstractCsharpMultiMapIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestAccommodation {
    public id: string;
    public bestPrice = 0;
    public priceFrom: string = null;
    public productReference: string = null;
    public imageUrl: string = null;
    public existsInLanguage = false;
    public categories: string = null;
}

class AccommodationsIndex extends AbstractCsharpMultiMapIndexCreationTask {
    public constructor() {
        super();
        this.addMap(`from acc in docs.TestAccommodations
select new {
    Id = Id(acc),
    bestPrice = acc.bestPrice,
    priceFrom = acc.priceFrom,
    productReference = acc.productReference,
    imageUrl = acc.imageUrl,
    existsInLanguage = acc.existsInLanguage,
    categories = acc.categories
}`);
    }
}

describe("RangeQueryTest", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("range query", async () => {
        await new AccommodationsIndex().execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new TestAccommodation(), {
                id: "accommodation-1",
                existsInLanguage: true,
                imageUrl: "http://google.com/favicon.ico",
                categories: "Category"
            }));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const accs = await session.query<object>({ index: AccommodationsIndex })
                .whereExists("imageUrl")
                .andAlso()
                .whereExists("categories")
                .andAlso()
                .whereEquals("existsInLanguage", true)
                .all();

            assertThat(accs).isNotNull();
            assertThat(accs).hasSize(1);
        }
    });
});
