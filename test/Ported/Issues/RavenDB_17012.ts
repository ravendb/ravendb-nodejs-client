import { GetStatisticsOperation, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { BulkInsertOptions } from "../../../src/Documents/BulkInsertOperation";
import { assertThat } from "../../Utils/AssertExtensions";


describe("RavenDB_17012Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can_SkipOverwriteIfUnchanged", async () => {
        const docsCount = 500;

        const docs: User[] = [];

        {
            const bulkInsert = store.bulkInsert();
            try {
                for (let i = 0; i < docsCount; i++) {
                    const user = new User();
                    docs.push(user);
                    await bulkInsert.store(user, i + "")
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        let stats = await store.maintenance.send(new GetStatisticsOperation());
        const lastETag = stats.lastDocEtag;

        const options: BulkInsertOptions = {
            skipOverwriteIfUnchanged: true
        };

        {
            const bulk = store.bulkInsert(options);

            try {
                for (let i = 0; i < docsCount; i++) {
                    const user = new User();
                    docs.push(user);
                    await bulk.store(user, i + "");
                }
            } finally {
                await bulk.finish();
            }
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());

        assertThat(stats.lastDocEtag)
            .isEqualTo(lastETag);
    });

    it("can_SkipOverwriteIfUnchanged_SomeDocuments", async () => {
        const docsCount = 500;

        const docs: User[] = [];

        {
            const bulkInsert = store.bulkInsert();
            try {
                for (let i = 0; i < docsCount; i++) {
                    const user = new User();
                    user.age = i;
                    docs.push(user);
                    await bulkInsert.store(user, i + "")
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        let stats = await store.maintenance.send(new GetStatisticsOperation());
        const lastETag = stats.lastDocEtag;

        const options: BulkInsertOptions = {
            skipOverwriteIfUnchanged: true
        };

        {
            const bulkInsert = store.bulkInsert(options);
            try {
                for (let i = 0; i < docsCount; i++) {
                    const doc = docs[i];
                    if (i % 2 === 0) {
                        doc.age = 2 * (i+1);
                    }

                    await bulkInsert.store(doc, i + "");
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.lastDocEtag)
            .isEqualTo(lastETag + docsCount / 2);
    });
});

