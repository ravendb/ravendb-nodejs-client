import {
    IDocumentStore, StopIndexOperation
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { User } from "../../Assets/Entities";
import { AbstractJavaScriptIndexCreationTask } from "../../../src/Documents/Indexes/AbstractJavaScriptIndexCreationTask";

describe("RavenDB_18545", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("quotationForGroupInAlias", async () => {
        {
            const session = store.openSession();
            const job = new Job();
            job.name = "HR Worker";
            job.group = "HR";

            await session.store(job);

            const jobId = job.id;

            await session.saveChanges();

            const q = await session.query(Job)
                .groupBy("group")
                .selectKey(null, "group")
                .selectCount();

            assertThat(q.toString())
                .contains("as 'group'");

            const l = await q.all();

            assertThat(l.length)
                .isGreaterThan(0);

            assertThat(l[0].group)
                .isEqualTo(job.group);
        }
    });

});


class Job {
    id: string;
    name: string;
    group: string;
}
