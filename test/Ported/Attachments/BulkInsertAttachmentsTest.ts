import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { ConflictSolver, GetCountersOperation, IDocumentStore } from "../../../src";
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { readToBuffer } from "../../../src/Utility/StreamUtil";
import { IAttachmentsBulkInsert } from "../../../src/Documents/BulkInsertOperation";

describe("BulkInsertAttachmentsTest", function () {

    let store: IDocumentStore;

    beforeEach(() => {
        testContext.customizeStore = async s => {
            // we don't have support for fetching multiple attachments
            s.conventions.maxNumberOfRequestsPerSession = 2000;
        }
    });

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));



    afterEach(() => testContext.customizeStore = null);

    it("storeManyAttachments1", async () => {
        await storeManyAttachments(1, 32 * 1024);
    });

    it("storeManyAttachments2", async () => {
        await storeManyAttachments(100, 256 * 1024);
    });

    it("storeManyAttachments3", async () => {
        await storeManyAttachments(200, 128 * 1024);
    });

    it("storeManyAttachments4", async () => {
        await storeManyAttachments(1000, 16 * 1024);
    });

    async function storeManyAttachments(count: number, size: number) {
        const userId = "user/1";

        const streams = new Map<string, Buffer>();

        {
            const bulkInsert = store.bulkInsert();

            try {
                const user1 = new User();
                user1.name = "EGR";

                await bulkInsert.store(user1, userId);

                const attachmentsBulkInsert = bulkInsert.attachmentsFor(userId);

                for (let i = 0; i < count; i++) {
                    const bytes = [...new Array(size).keys()].map(x => Math.floor(Math.random() * 255));
                    const bArr = Buffer.from(bytes);

                    const name = i.toString();

                    await attachmentsBulkInsert.store(name, bArr);

                    streams.set(name, bArr);
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        {
            let counter = 0;

            const session = store.openSession();
            for (const id of streams.keys()) {
                counter++;

                const attachment = await session.advanced.attachments.get(userId, id);
                try {
                    assertThat(attachment.data)
                        .isNotNull();

                    const expected = streams.get(attachment.details.name);
                    attachment.data.resume();
                    const actual = await readToBuffer(attachment.data);

                    assertThat(actual.equals(expected))
                        .isTrue();
                } finally {
                    attachment.dispose();
                }
            }

            assertThat(counter)
                .isEqualTo(count);
        }
    }

    it("storeManyAttachmentsAndDocs", async () => {
        const count = 100;
        const attachments = 100;
        const size = 16 * 1024;

        const streams = new Map<string, Map<string, Buffer>>();

        {
            const bulkInsert = store.bulkInsert();

            for (let i = 0; i < count; i++) {
                const id = "user/" + i;

                streams.set(id, new Map<string, Buffer>());

                const user = new User();
                user.name = "EGR_" + i;
                await bulkInsert.store(user, id);

                const attachmentsBulkInsert = bulkInsert.attachmentsFor(id);

                for (let j = 0; j < attachments; j++) {
                    const bytes = [...new Array(size).keys()].map(x => Math.floor(Math.random() * 255));
                    const bArr = Buffer.from(bytes);

                    const name = j.toString();
                    await attachmentsBulkInsert.store(name, bArr);

                    streams.get(id).set(name, bArr);
                }
            }

            await bulkInsert.finish();
        }

        {
            for (const id of streams.keys()) {
                const session = store.openSession();

                for (const attachmentName of streams.get(id).keys()) {
                    const attachment = await session.advanced.attachments.get(id, attachmentName);
                    try {
                        assertThat(attachment.data)
                            .isNotNull();

                        const expected = streams.get(id).get(attachment.details.name);
                        attachment.data.resume();
                        const actual = await readToBuffer(attachment.data);

                        assertThat(actual.equals(expected))
                            .isTrue();
                    } finally {
                        attachment.dispose();
                    }
                }
            }
        }
    });

    it("bulkStoreAttachmentsForRandomDocs", async () => {
        const count = 500;
        const attachments = 750;
        const size = 16 * 1024;

        const streams = new Map<string, Map<string, Buffer>>();

        const ids: string[] = [];

        {
            const bulkInsert = store.bulkInsert();

            for (let i = 0; i < count; i++) {
                const id = "user/" + i;
                ids.push(id);

                streams.set(id, new Map<string, Buffer>());
                const user = new User();
                user.name = "EGR_" + i;
                await bulkInsert.store(user, id);
            }

            for (let j = 0; j < attachments; j++) {
                const id = ids[Math.floor(Math.random() * count)];
                const attachmentsBulkInsert = bulkInsert.attachmentsFor(id);

                const bytes = [...new Array(size).keys()].map(x => Math.floor(Math.random() * 255));
                const bArr = Buffer.from(bytes);

                const name = j.toString();
                await attachmentsBulkInsert.store(name, bArr);

                streams.get(id).set(name, bArr);
            }

            await bulkInsert.finish();
        }

        {
            for (const id of streams.keys()) {
                const session = store.openSession();

                for (const attachmentName of streams.get(id).keys()) {
                    const attachment = await session.advanced.attachments.get(id, attachmentName);
                    try {
                        assertThat(attachment.data)
                            .isNotNull();

                        const expected = streams.get(id).get(attachment.details.name);
                        attachment.data.resume();
                        const actual = await readToBuffer(attachment.data);

                        assertThat(actual.equals(expected))
                            .isTrue();
                    } finally {
                        attachment.dispose();
                    }
                }
            }
        }
    });

    it("canHaveAttachmentBulkInsertsWithCounters", async () => {
        const count = 100;
        const size = 64 * 1024;

        const streams = new Map<string, Map<string, Buffer>>();
        const counters = new Map<string, string>();
        const bulks = new Map<string, IAttachmentsBulkInsert>();

        {
            const bulkInsert = store.bulkInsert();

            for (let i = 0; i < count; i++) {
                const id =  "user/" + i;
                streams.set(id, new Map<string, Buffer>());
                const user = new User();
                user.name = "EGR_" + i;
                await bulkInsert.store(user, id);

                bulks.set(id, bulkInsert.attachmentsFor(id));
            }

            for (const bulk of bulks.entries()) {
                const bytes = [...new Array(size).keys()].map(x => Math.floor(Math.random() * 255));
                const bArr = Buffer.from(bytes);

                const name = bulk[0] + "_" + Math.floor(Math.random() * 100);
                await bulk[1].store(name, bArr);

                await bulkInsert.countersFor(bulk[0]).increment(name);
                counters.set(bulk[0], name);
            }

            await bulkInsert.finish();
        }

        for (const id of streams.keys()) {
            const session = store.openSession();

            for (const attachmentName of streams.get(id).keys()) {
                const attachment = await session.advanced.attachments.get(id, attachmentName);
                try {
                    assertThat(attachment.data)
                        .isNotNull();

                    const expected = streams.get(id).get(attachment.details.name);
                    attachment.data.resume();
                    const actual = await readToBuffer(attachment.data);

                    assertThat(actual.equals(expected))
                        .isTrue();
                } finally {
                    attachment.dispose();
                }
            }

            const countersDetail = await store.operations.send(new GetCountersOperation(id, [counters.get(id)]));
            assertThat(countersDetail.counters[0].totalValue)
                .isEqualTo(1);
        }
    });

    it("storeAsyncShouldThrowIfRunningTimeSeriesBulkInsert", async () => {
        await assertThrows(async () => {
            const bulkInsert = store.bulkInsert();
            try {
                bulkInsert.timeSeriesFor("id", "name");

                const bulk = bulkInsert.attachmentsFor("id");
                await bulk.store("name", Buffer.from([1, 2, 3]));
            } finally {
                await bulkInsert.finish();
            }
        }, err => {
            assertThat(err.name)
                .isEqualTo("BulkInsertInvalidOperationException");
            assertThat(err.message)
                .contains("There is an already running time series operation, did you forget to close it?");
        });
    });

    it("storeAsyncNullId", async () => {
        await assertThrows(async () => {
            const bulkInsert = store.bulkInsert();
            try {
                bulkInsert.attachmentsFor(null);
            } finally {
                await bulkInsert.finish();
            }
        }, err => {
            assertThat(err.name)
                .isEqualTo("InvalidArgumentException");
            assertThat(err.message)
                .contains("Document id cannot be null or empty");
        });
    });
});
