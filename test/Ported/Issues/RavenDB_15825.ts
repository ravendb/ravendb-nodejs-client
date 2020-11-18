import {
    AbstractIndexCreationTask,
    FacetOptions, IDocumentSession,
    IDocumentStore,
    IndexQueryParameters,
    QueryStatistics
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { HashCalculator } from "../../../src/Documents/Queries/HashCalculator";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15825", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const TAGS = ["test", "label", "vip", "apple", "orange"];

    it("shouldWork", async () => {
        await new ContactsIndex().execute(store);

        {
            const session = store.openSession();
            for (let id = 0; id < 10000; id++) {
                const companyId = id % 100;

                const contact = new Contact();
                contact.id = "contacts/" + id;
                contact.companyId = companyId;
                contact.active = id % 2 === 0;
                contact.tags = [ TAGS[id % TAGS.length] ];

                await session.store(contact);
            }

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();

            let stats: QueryStatistics;
            const res = await facet(session, 1, 3, s => stats = s);

            assertThat(stats.durationInMs)
                .isNotEqualTo(-1);

            assertThat(res["companyId"].values)
                .hasSize(3);

            assertThat(res["companyId"].values[0].range)
                .isEqualTo("28");
            assertThat(res["companyId"].values[1].range)
                .isEqualTo("38");
            assertThat(res["companyId"].values[2].range)
                .isEqualTo("48");

            let stats2: QueryStatistics;
            const res2 = await facet(session, 2, 1, s => stats2 = s);
            assertThat(stats2.durationInMs)
                .isNotEqualTo(-1);
            assertThat(res2["companyId"].values)
                .hasSize(1);

            assertThat(res2["companyId"].values[0].range)
                .isEqualTo("38");

            let stats3: QueryStatistics;
            const res3 = await facet(session, 5, 5, s => stats3 = s);
            assertThat(stats3.durationInMs)
                .isNotEqualTo(-1);

            assertThat(res3["companyId"].values)
                .hasSize(5);
            assertThat(res3["companyId"].values[0].range)
                .isEqualTo("68");
            assertThat(res3["companyId"].values[1].range)
                .isEqualTo("78");
            assertThat(res3["companyId"].values[2].range)
                .isEqualTo("8");
            assertThat(res3["companyId"].values[3].range)
                .isEqualTo("88");
            assertThat(res3["companyId"].values[4].range)
                .isEqualTo("98");
        }
    });

    it("canHashCorrectly", () => {
        const facetOptions = new FacetOptions();
        facetOptions.start = 1;
        facetOptions.pageSize = 5;

        const p: IndexQueryParameters = {
            p1: facetOptions
        };

        const hashCalculator = new HashCalculator();
        hashCalculator.write(p);
        const hash1 = hashCalculator.getHash();

        // create second object with same props

        const facetOptions2 = new FacetOptions();
        facetOptions2.start = 1;
        facetOptions2.pageSize = 5;

        const p2: IndexQueryParameters = {
            p1: facetOptions2
        };

        const hashCalculator2 = new HashCalculator();
        hashCalculator2.write(p2);
        const hash2 = hashCalculator2.getHash();

        // modify original object - it should change hash
        facetOptions.start = 2;
        const hashCalculator3 = new HashCalculator();
        hashCalculator3.write(p);
        const hash3 = hashCalculator3.getHash();

        assertThat(hash1) // structural equality
            .isEqualTo(hash2);

        assertThat(hash1) // same reference - different structure
            .isNotEqualTo(hash3);
    });

});

async function facet(session: IDocumentSession, skip: number, take: number, statsCallback: (stats: QueryStatistics) => void) {
    const facetOptions = new FacetOptions();
    facetOptions.start = skip;
    facetOptions.pageSize = take;

    const result = await session.query({
        documentType: Result,
        indexName: new ContactsIndex().getIndexName()
    })
        .statistics(statsCallback)
        .orderBy("companyId", "AlphaNumeric")
        .whereEquals("active", true)
        .whereEquals("tags", "apple")
        .aggregateBy(b => b.byField("companyId").withOptions(facetOptions))
        .execute();

    return result;
}

class Contact {
    public id: string;
    public companyId: number;
    public active: boolean;
    public tags: string[];
}

class ContactsIndex extends AbstractIndexCreationTask {
    constructor() {
        super();

        this.map = "from contact in docs.contacts select new { companyId = contact.companyId, tags = contact.tags, active = contact.active }";
    }
}

class Result {
    companyId: number;
    active: boolean;
    tags: string[];
}