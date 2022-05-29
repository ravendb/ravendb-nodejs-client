import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company } from "../../Assets/Orders";
import { assertThat } from "../../Utils/AssertExtensions";
import { AbstractJavaScriptIndexCreationTask } from "../../../src";

describe("RavenDB_12030", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("simpleFuzzy", async () => {
        {
            const session = store.openSession();
            const hr = Object.assign(new Company(), {
                name: "Hibernating Rhinos"
            });
            await session.store(hr);

            const cf = Object.assign(new Company(), {
                name: "CodeForge"
            });
            await session.store(cf);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let companies = await session
                .query(Company)
                .whereEquals("name", "CoedForhe")
                .fuzzy(0.5)
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(companies[0].name)
                .isEqualTo("CodeForge");

            companies = await session
                .query(Company)
                .whereEquals("name", "Hiberanting Rinhos")
                .fuzzy(0.5)
                .all();

            assertThat(companies)
                .hasSize(1);
            assertThat(companies[0].name)
                .isEqualTo("Hibernating Rhinos");

            companies = await session
                .query(Company)
                .whereEquals("name", "CoedForhe")
                .fuzzy(0.99)
                .all();

            assertThat(companies)
                .hasSize(0);
        }
    });

    it("simpleProximity", async () => {
        await new Fox_Search().execute(store);

        {
            const session = store.openSession();
            const f1 = new Fox();
            f1.name = "a quick brown fox";
            await session.store(f1);

            const f2 = new Fox();
            f2.name = "the fox is quick";
            await session.store(f2);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let foxes = await session
                .query(Fox, Fox_Search)
                .search("name", "quick fox")
                .proximity(1)
                .all();

            assertThat(foxes)
                .hasSize(1);
            assertThat(foxes[0].name)
                .isEqualTo("a quick brown fox");

            foxes = await session
                .query(Fox, Fox_Search)
                .search("name", "quick fox")
                .proximity(2)
                .all();

            assertThat(foxes)
                .hasSize(2);
            assertThat(foxes[0].name)
                .isEqualTo("a quick brown fox");
            assertThat(foxes[1].name)
                .isEqualTo("the fox is quick");
        }
    });
});

class Fox {
    public name: string;
}

class Fox_Search extends AbstractJavaScriptIndexCreationTask<Fox, Pick<Fox, "name">> {
    public constructor() {
        super();

        this.map(Fox, f => {
            return {
                name: f.name
            }
        });

        this.index("name", "Search");
    }
}
