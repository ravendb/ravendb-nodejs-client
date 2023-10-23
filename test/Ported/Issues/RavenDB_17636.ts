import {
    AbstractJavaScriptIndexCreationTask,
    DocumentStore,
    Facet, FacetOptions, FacetSetup,
    IDocumentStore,
    QueryStatistics
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_17636Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseFilterWithCollectionQuery", async () => {
        const data = getDatabaseItems();

        await insert(store, data);

        let result: Employee;
        let stats: QueryStatistics;

        {
            const session = store.openSession();
            result = await session.advanced.rawQuery("from Employees filter name = 'Jane'", Employee)
                .singleOrNull();
            assertThat(result.name)
                .isEqualTo("Jane");

            result = await session
                .query(Employee)
                .filter(p => p.equals("name", "Jane"))
                .singleOrNull();
            assertThat(result.name)
                .isEqualTo("Jane");
        }

        // scan limit
        {
            const session = store.openSession();
            result = await session.advanced
                .rawQuery("from Employees filter name = 'Jane' filter_limit 1", Employee)
                .statistics(s => stats = s)
                .singleOrNull();

            assertThat(result.name)
                .isEqualTo("Jane");
            assertThat(stats.scannedResults)
                .isEqualTo(1);

            result = await session.query(Employee)
                .filter(p => p.equals("name", "Jane"), 1)
                .statistics(s => stats = s)
                .singleOrNull();

            assertThat(result.name)
                .isEqualTo("Jane");
            assertThat(stats.scannedResults)
                .isEqualTo(1);
        }
    });

    it("cannotUseFacetWithFilter", async () => {
        await new BlogIndex().execute(store);

        const facet = new Facet();
        facet.fieldName = "tags";
        facet.options = new FacetOptions();
        facet.options.termSortMode = "CountDesc";

        const facets = [facet];

        {
            const session = store.openSession();
            const facetSetup = new FacetSetup();
            facetSetup.facets = facets;
            facetSetup.id = "facets/BlogFacets";
            await session.store(facetSetup);

            const post1 = new BlogPost();
            post1.title = "my first blog";
            post1.tags = ["news", "funny"];

            await session.store(post1);

            const post2 = new BlogPost();
            post2.title = "my second blog";
            post2.tags = ["lame", "news"];

            await session.store(post2);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const q = await session.query(BlogPost, BlogIndex)
                .filter(p => p.equals("tags", "news"));

            await assertThrows(() => q.aggregateUsing("facets/BlogFacets").execute(), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidQueryException");
            });
        }
    })
});

function getDatabaseItems(): [Employee, string][] {
    const e1 = new Employee();
    e1.name = "Jane";
    e1.active = true;
    e1.age = 20;

    const t1: [Employee, string] = [e1, "emps/jane"];

    const e2 = new Employee();
    e2.name = "Mark";
    e2.active = false;
    e2.age = 33;

    const t2: [Employee, string] = [e2, "emps/mark"];

    const e3 = new Employee();
    e3.name = "Sandra";
    e3.active =  true;
    e3.age = 35;

    const t3: [Employee, string] = [e3, "emps/sandra"];

    return [t1, t2, t3];
}

async function insert(store: IDocumentStore, data: [Employee, string][]) {
    const bulkInsert = store.bulkInsert();
    try {
        for (const datum of data) {
            await bulkInsert.store(datum[0], datum[1]);
        }
    } finally {
        await bulkInsert.finish();
    }
}

class BlogPost {
    title: string;
    tags: string[];
}

class Location {
    latitude: string;
    longitude: string;
}

class Employee {
    name: string;
    manager: string;
    active: boolean;
    age: number;
    location: Location;
}


class BlogIndex extends AbstractJavaScriptIndexCreationTask<BlogPost> {
    constructor() {
        super();

        this.map("Blogs", b => {
            return {
                tags: b.tags
            }
        });

        this.store("tags", "Yes");
        this.index("tags", "Exact");
    }
}
