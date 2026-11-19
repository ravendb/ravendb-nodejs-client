import { IDocumentStore, PutClientConfigurationOperation } from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { Company } from "../../Assets/Entities.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_19743", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeCompaniesAndAssertIdsStartWithDefaultSeparator() {
        const session = store.openSession();
        for (let i = 0; i < 10; i++) {
            await session.store(Object.assign(new Company(), { id: "company|" }));
            await session.saveChanges();
        }

        const companies = await session.advanced.loadStartingWith("company", { documentType: Company });
        assertThat(companies).hasSize(10);
        for (const company of companies) {
            assertThat(company.id).startsWith("company/");
        }
    }

    it("disabled configuration base case", async () => {
        await store.maintenance.send(new PutClientConfigurationOperation({
            identityPartsSeparator: "!",
            disabled: true
        }));

        await storeCompaniesAndAssertIdsStartWithDefaultSeparator();
    });

    it("disabled configuration default change try to crate data with disabled sigh should throw", async () => {
        await store.maintenance.send(new PutClientConfigurationOperation({
            identityPartsSeparator: "!",
            disabled: true
        }));

        await assertThrows(async () => {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                await session.store(Object.assign(new Company(), { id: "companies!" }));
                await session.saveChanges();
            }
        }, err => {
            assertThat(err.name).isEqualTo("NonUniqueObjectException");
        });
    });

    (RavenTestContext.isPullRequest ? it.skip : it)("crate valid configuration then disable should crate data with default part separator", async () => {
        await store.maintenance.send(new PutClientConfigurationOperation({
            identityPartsSeparator: "!",
            disabled: false
        }));
        await store.maintenance.send(new PutClientConfigurationOperation({
            disabled: true
        }));

        await storeCompaniesAndAssertIdsStartWithDefaultSeparator();
    });
});
