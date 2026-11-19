import {
    ConfigureRevisionsOperation,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestObjV1 {
    public id: string;
    public version: string;
}

class TestObjV2 {
    public id: string;
    public createdDate: Date;
    public createdByUserName: string;
}

describe("RavenDB_25368", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("loaded revisions becoming batch commands and changes the doc", async () => {
        const id = "testObjs/1-A";

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = new RevisionsCollectionConfiguration();
        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));

        {
            const session = store.openSession();
            const testObj = Object.assign(new TestObjV1(), { version: "v1" });
            await session.store(testObj, id);
            await session.saveChanges();

            testObj.version = "v2";
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const obj = await session.load(id, TestObjV2);
            await session.advanced.revisions.getFor(obj.id, { documentType: TestObjV2 });
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const testObj = await session.load(id, TestObjV1);
            const version = testObj.version;
            assertThat(version).isNotNull();
            assertThat(version).isNotEmpty();
            assertThat(version).isEqualTo("v2");
        }
    });
});
