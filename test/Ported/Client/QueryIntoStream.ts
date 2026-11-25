import { AbstractCsharpIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { finishedAsync } from "../../../src/Utility/StreamUtil.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { getStringWritable } from "../../Utils/Streams.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Employee {
    public firstName: string;
}

class EmployeeIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from doc in docs.Employees select new { doc.firstName }";
    }
}

describe("QueryIntoStream", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function insertData() {
        const session = store.openSession();
        for (const firstName of ["Aviv", "Robert", "Robert", "Maxim", "Karmel", "Grisha", "Robert"]) {
            await session.store(Object.assign(new Employee(), { firstName }));
        }
        await session.saveChanges();

        await new EmployeeIndex().execute(store);
        await testContext.waitForIndexing(store);
    }

    it("document query with to stream", async () => {
        await insertData();

        const session = store.openSession();
        const query = session.advanced.documentQuery({ documentType: Employee, indexName: new EmployeeIndex().getIndexName() })
            .whereEquals("firstName", "Robert");

        const targetStream = getStringWritable();
        session.advanced.streamInto(query, targetStream);
        await finishedAsync(targetStream);

        const results = (targetStream["string"] as string).split("\n").filter(Boolean).map(line => JSON.parse(line));

        assertThat(results).hasSize(3);
        assertThat(results).allMatch(x => x.firstName === "Robert");
    });
});
