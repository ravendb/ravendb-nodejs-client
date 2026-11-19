import assert from "node:assert";
import { CONSTANTS, IDocumentStore, PatchCommandData, PatchRequest } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_11391_PtachPutWithAttachmentsOrCounters", function () {

    const newId = "second/1-A";
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function putCopyByPatch(id: string) {
        const session = store.openSession();
        session.advanced.defer(new PatchCommandData(id, null, PatchRequest.forScript(`put('${newId}', this)`), null));
        await session.saveChanges();
    }

    async function loadNewEmployeeMetadata() {
        const session = store.openSession();
        const newEmployee = await session.load(newId, Employee);
        return session.advanced.getMetadataFor(newEmployee);
    }

    it("patch put while contain attachments the new document should not contain them", async () => {
        const employee = Object.assign(new Employee(), { firstName: "Avi" });
        {
            const session = store.openSession();
            await session.store(employee);
            session.advanced.attachments.store(employee.id, "Profile Picture", Buffer.from([1, 2, 3, 4, 5, 6]));
            await session.saveChanges();
        }

        await putCopyByPatch(employee.id);

        const metadata = await loadNewEmployeeMetadata();
        assert.strictEqual(CONSTANTS.Documents.Metadata.ATTACHMENTS in metadata, false,
            "The new employee should have no attachment properties in metadata");
    });

    it("patch put while contain counters the new document should not contain them", async () => {
        const employee = Object.assign(new Employee(), { firstName: "Avi" });
        {
            const session = store.openSession();
            await session.store(employee);
            session.countersFor(employee).increment("Likes");
            await session.saveChanges();
        }

        await putCopyByPatch(employee.id);

        const metadata = await loadNewEmployeeMetadata();
        assert.strictEqual(CONSTANTS.Documents.Metadata.COUNTERS in metadata, false,
            "The new employee should have no counter properties in metadata");
    });
});

class Employee {
    public id: string;
    public firstName: string;
}
