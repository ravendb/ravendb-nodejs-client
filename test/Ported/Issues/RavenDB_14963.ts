import {
    ConfigureRevisionsOperation,
    GetCollectionRevisionsStatisticsOperation,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { Company, User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.0") ? describe : describe.skip)("RavenDB_14963", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("getCollectionRevisionsStatistics", async () => {
        const configuration = new RevisionsConfiguration();
        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        for (const collection of ["Users", "Companies"]) {
            const collectionConfiguration = new RevisionsCollectionConfiguration();
            collectionConfiguration.disabled = false;
            configuration.collections.set(collection, collectionConfiguration);
        }
        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));

        const session = store.openSession();
        const storeAndUpdate = async (entity: User | Company, id: string, newName: string) => {
            await session.store(entity, id);
            await session.saveChanges();
            entity.name = newName;
            await session.saveChanges();
        };

        await storeAndUpdate(Object.assign(new User(), { name: "1" }), "Users/1", "11");
        await storeAndUpdate(Object.assign(new User(), { name: "2" }), "Users/2", "22");
        await storeAndUpdate(Object.assign(new Company(), { name: "1" }), "Company/1", "11");
        await storeAndUpdate(Object.assign(new Company(), { name: "2" }), "Company/2", "22");
        await storeAndUpdate(Object.assign(new Company(), { name: "11" }), "Company/11", "1111");

        const stats = await store.maintenance.send(new GetCollectionRevisionsStatisticsOperation());
        assertThat(stats.countOfRevisions).isEqualTo(10);
        assertThat(Object.keys(stats.collections)).hasSize(2);
        assertThat(stats.collections["Users"]).isEqualTo(4);
        assertThat(stats.collections["Companies"]).isEqualTo(6);
    });
});
