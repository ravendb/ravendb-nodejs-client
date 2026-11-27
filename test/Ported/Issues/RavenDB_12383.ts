import {
    GetDocumentsCommand,
    IDocumentStore,
    IndexQuery,
    InMemoryDocumentSessionOperations
} from "../../../src/index.js";
import { QueryCommand } from "../../../src/Documents/Commands/QueryCommand.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Employee } from "../../Assets/Orders.js";

describe("RavenDB_12383", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("include should skip documents that are part of results", async () => {
        {
            const session = store.openSession();
            const e1 = Object.assign(new Employee(), { firstName: "John" });
            await session.store(e1, "employees/1");

            const e2 = Object.assign(new Employee(), { firstName: "Edward", reportsTo: e1.id });
            await session.store(e2, "employees/2");

            await session.saveChanges();
        }

        const getDocumentsCommand = new GetDocumentsCommand({
            conventions: store.conventions,
            ids: ["employees/1", "employees/2"],
            includes: ["reportsTo"],
            metadataOnly: false
        });
        await store.getRequestExecutor().execute(getDocumentsCommand);

        assertThat(getDocumentsCommand.result.results).hasSize(2);
        assertThat(Object.keys(getDocumentsCommand.result.includes)).hasSize(0);

        const session = store.openSession() as unknown as InMemoryDocumentSessionOperations;

        async function query(rql: string) {
            const command = new QueryCommand(session, new IndexQuery(rql), {
                indexEntriesOnly: false,
                metadataOnly: false
            });
            await store.getRequestExecutor().execute(command);
            return command.result;
        }

        let result = await query("from Employees include reportsTo");
        assertThat(result.results).hasSize(2);
        assertThat(Object.keys(result.includes)).hasSize(0);

        result = await query("from Employees as e where e.firstName != 'Jessie' select { firstName : e.firstName, reportsTo : e.reportsTo } include reportsTo");
        assertThat(result.results).hasSize(2);
        assertThat(Object.keys(result.includes)).hasSize(1);

        result = await query("from Employees as e select { firstName : e.firstName, reportsTo : e.reportsTo } include reportsTo");
        assertThat(result.results).hasSize(2);
        assertThat(Object.keys(result.includes)).hasSize(1);

        result = await query(`
declare function f(d) {
    include(d.reportsTo);
    return d;
}
from Employees as e select f(e)`);
        assertThat(result.results).hasSize(2);
        assertThat(Object.keys(result.includes)).hasSize(1);
    });
});
