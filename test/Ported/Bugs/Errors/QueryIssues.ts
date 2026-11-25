import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class Company {
    public id: string;
    public name: string;
    public hasParentCompany: boolean;
}

class CompanyIndex extends AbstractJavaScriptIndexCreationTask<Company> {
    public constructor() {
        super();

        const { id } = this.mapUtils();

        this.map(Company, company => ({
            id: id(company),
            name: company.name,
            hasParentCompany: company.hasParentCompany
        }));
    }
}

describe("QueryIssues", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("preston thinks load starting with should be case insensitive", async () => {
        await new CompanyIndex().execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { id: "CoMpAnY/1", name: "This Company", hasParentCompany: false }));
            await session.store(Object.assign(new Company(), { id: "CoMpAnY/2", name: "That Company", hasParentCompany: true }));
            await session.store(Object.assign(new Company(), { id: "CoMpAnY/3", name: "The Other Company", hasParentCompany: false }));
            await session.saveChanges();
        }

        const session = store.openSession();
        await session.query(Company).waitForNonStaleResults().all();

        const loadResult = await session.load("cOmPaNy/1", Company);
        const loadStartResults = await session.advanced.loadStartingWith("cOmPaNy/1", { documentType: Company });
        assertThat(loadStartResults.includes(loadResult)).isTrue();
        assertThat(loadStartResults).hasSize(1);
    });
});
