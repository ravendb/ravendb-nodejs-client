import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createGunzip } from "node:zlib";
import {
    AbstractCsharpIndexCreationTask,
    CounterBatch,
    CounterBatchOperation,
    CounterOperation,
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    DeleteAttachmentOperation,
    DeleteDocumentCommand,
    DocumentCountersOperation,
    GetAttachmentOperation,
    GetConflictsCommand,
    GetNextOperationIdCommand,
    IDocumentStore,
    IndexQuery,
    KillOperationCommand,
    ModifyConflictSolverOperation,
    PatchByQueryOperation,
    PutAttachmentOperation,
    PutDocumentCommand,
    ReplayTransactionsRecordingOperation,
    StartTransactionsRecordingOperation,
    StopTransactionsRecordingOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { ReplicationTestContext } from "../../Utils/ReplicationTestContext.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";
import { CreateSampleDataOperation } from "../../Utils/CreateSampleDataOperation.js";
import { User } from "../../Assets/Entities.js";
import { readToBuffer } from "../../../src/Utility/StreamUtil.js";

class DailyInvoicesIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from user in docs.Users select new { age = user.age, amount = 1 }";
        this.reduce = "from r in results group r by r.age into g select new { age = g.Key, amount = g.Sum(x => x.amount) }";
        this.outputReduceToCollection = "AgeGroup";
    }
}

const someNames = [["Avi"], ["Avi", "Baruch", "Charlotte", "Dylan", "Eli", "Fabia", "George", "Harper"]];

const licensedIt = RavenTestContext.isPullRequest ? it.skip : it;

// 6.2 servers fail replaying a recorded session patch with a NullReferenceException in MergedBatchCommand
const itOn72 = RavenTestContext.isRavenDbServerVersion("7.2") ? it : it.skip;

describe("RecordingTransactionOperationsMergerTest", function () {

    let temporaryDirContext: TemporaryDirContext;
    let recordFilePath: string;

    beforeEach(function () {
        temporaryDirContext = new TemporaryDirContext();
        recordFilePath = path.resolve(temporaryDirContext.tempDir, "record-tx");
    });

    afterEach(() => temporaryDirContext.dispose());

    async function withStore(action: (store: IDocumentStore) => Promise<void>) {
        const store = await testContext.getDocumentStore();
        try {
            await action(store);
        } finally {
            await disposeTestDocumentStore(store);
        }
    }

    async function recordOn(store: IDocumentStore, action: () => Promise<unknown>) {
        await store.maintenance.send(new StartTransactionsRecordingOperation(recordFilePath));
        await action();
        await store.maintenance.send(new StopTransactionsRecordingOperation());
    }

    function record(action: (store: IDocumentStore) => Promise<unknown>) {
        return withStore(store => recordOn(store, () => action(store)));
    }

    async function nextOperationId(store: IDocumentStore) {
        const command = new GetNextOperationIdCommand();
        await store.getRequestExecutor().execute(command);
        return command.result;
    }

    async function replayInto(store: IDocumentStore, asBuffer = false) {
        const data = asBuffer ? fs.readFileSync(recordFilePath) : fs.createReadStream(recordFilePath);
        const result = await store.maintenance.send(new ReplayTransactionsRecordingOperation(data, await nextOperationId(store)));
        assertThat(result.executedCommandsAmount).isGreaterThan(0);
    }

    function replay(action: (store: IDocumentStore) => Promise<void>, asBuffer = false) {
        return withStore(async store => {
            await replayInto(store, asBuffer);
            await action(store);
        });
    }

    async function storeUsers(store: IDocumentStore, names: string[]) {
        const session = store.openSession();
        for (const name of names) {
            await session.store(Object.assign(new User(), { name }));
        }
        await session.saveChanges();
    }

    async function queryNames(store: IDocumentStore) {
        return store.openSession().query(User).selectFields<string>("name").all();
    }

    async function readAttachment(store: IDocumentStore, id: string, name: string) {
        const attachment = await store.operations.send(new GetAttachmentOperation(id, name, "Document", null));
        if (!attachment) {
            return null;
        }
        try {
            attachment.data.resume();
            return await readToBuffer(attachment.data);
        } finally {
            attachment.dispose();
        }
    }

    function putUserCommand(id: string, user: object) {
        return new PutDocumentCommand(id, null, { ...user, "@metadata": { "@collection": "Users" } });
    }

    it("canRecordTransactions", async () => {
        await record(store => store.maintenance.send(new CreateSampleDataOperation()));

        assertThat(fs.statSync(recordFilePath).size).isGreaterThan(0);
    });

    it("startRecordingWithoutStop_ShouldResultInLegalJson", async () => {
        await withStore(store => store.maintenance.send(new StartTransactionsRecordingOperation(recordFilePath)));

        const content = await readToBuffer(fs.createReadStream(recordFilePath).pipe(createGunzip()));
        JSON.parse(content.toString("utf8"));
    });

    it("throwsOnNullReplayData", async () => {
        await assertThrows(() => new ReplayTransactionsRecordingOperation(null, 1),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });

    it("replay_WhenCancelInTheMiddle_ShouldKeepAcceptWriteOperation", async () => {
        await record(async store => {
            for (let i = 0; i < 500; i++) {
                await storeUsers(store, ["User" + i]);
            }
        });

        await withStore(async store => {
            const operationId = await nextOperationId(store);
            const replaying = store.maintenance
                .send(new ReplayTransactionsRecordingOperation(fs.createReadStream(recordFilePath), operationId))
                .catch(() => null);

            try {
                const anyUser = await testContext.waitForValue(
                    async () => (await store.openSession().query(User).count()) > 0, true, { timeout: 5_000 });
                assertThat(anyUser).isTrue();
            } finally {
                await store.getRequestExecutor().execute(new KillOperationCommand(operationId));
                await replaying;
            }

            const expected = Object.assign(new User(), { name: "FinalUser" });
            {
                const session = store.openSession();
                await session.store(expected);
                await session.saveChanges();
            }

            const actual = await store.openSession().load<User>(expected.id);
            assertThat(actual.name).isEqualTo(expected.name);
        });
    });

    it("recordingClusterTransactionMergedCommand", async () => {
        const onlyStored = Object.assign(new User(), { name: "Andrea" });
        const deleted = Object.assign(new User(), { name: "Brooke" });

        await record(async store => {
            const session = store.openSession({ transactionMode: "ClusterWide" });
            await session.store(onlyStored);
            await session.store(deleted);
            await session.saveChanges();

            session.delete(deleted);
            await session.saveChanges();
        });

        await replay(async store => {
            const session = store.openSession();
            const actual = await session.load<User>(onlyStored.id);
            assertThat(actual.name).isEqualTo(onlyStored.name);
            assertThat(await session.load<User>(deleted.id)).isNull();
        });
    });

    it("recordingExecuteCounterBatchCommand", async () => {
        const id = "users/A-1";
        const incrementedCounter = "likes";
        const deletedCounter = "Anger";
        const putCounter = "Sadness";

        const counterBatch = (...operations: CounterOperation[]) => {
            const documentCountersOperation = new DocumentCountersOperation();
            documentCountersOperation.documentId = id;
            documentCountersOperation.operations = operations;
            const batch = new CounterBatch();
            batch.documents = [documentCountersOperation];
            return new CounterBatchOperation(batch);
        };

        await record(async store => {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "August" }), id);
            await session.saveChanges();

            await store.operations.send(counterBatch(
                CounterOperation.create(incrementedCounter, "Increment", 0),
                CounterOperation.create(deletedCounter, "Increment"),
                CounterOperation.create(putCounter, "Increment", 30)));
            await store.operations.send(counterBatch(CounterOperation.create(deletedCounter, "Delete")));
        });

        await replay(async store => {
            const result = await store.operations.send(counterBatch(
                CounterOperation.create(incrementedCounter, "Get"),
                CounterOperation.create(deletedCounter, "Get"),
                CounterOperation.create(putCounter, "Get")));

            const actualCounters = result.counters.map(c => c?.counterName ?? null);
            assertThat(actualCounters).contains(incrementedCounter);
            assertThat(actualCounters).contains(putCounter);
            assertThat(actualCounters).contains(null);
        });
    });

    it("replayOutputReduceToCollectionCommand", async () => {
        await record(async store => {
            const session = store.openSession();
            for (const [name, age] of [["Andre", 120], ["Barbara", 120], ["Charlotte", 24], ["Dominic", 24]] as const) {
                await session.store(Object.assign(new User(), { name, age }));
            }
            await session.saveChanges();

            await new DailyInvoicesIndex().execute(store);
            await testContext.waitForIndexing(store);
        });

        await replay(async store => {
            const groups = await store.openSession().query<{ age: number, amount: number }>({ collection: "AgeGroup" }).all();
            const actual = groups.map(g => [g.age, g.amount]).sort((a, b) => a[0] - b[0]);
            assert.deepStrictEqual(actual, [[24, 2], [120, 2]]);
        });
    });

    licensedIt("recordingMergedDocumentReplicationCommand", async () => {
        const id = "UsersA-1";
        const replication = new ReplicationTestContext();

        await withStore(master => withStore(async slave => {
            await replication.setupReplication(master, slave);

            await recordOn(slave, async () => {
                await master.getRequestExecutor().execute(putUserCommand(id, { name: "Avi" }));
                assertThat(await replication.waitForDocumentToReplicate(slave, id, 15_000, User)).isNotNull();
            });
        }));

        await replay(async store => {
            const actual = await store.openSession().load<User>(id);
            assertThat(actual.name).isEqualTo("Avi");
        });
    });

    licensedIt("recordingMergedDocumentReplicationCommand_WithAttachment", async () => {
        const id = "UsersA-1";
        const attachmentName = "someAttachmentName";
        const expected = Buffer.from("Menahem");
        const replication = new ReplicationTestContext();

        await withStore(master => withStore(async slave => {
            await replication.setupReplication(master, slave);

            await recordOn(slave, async () => {
                await master.getRequestExecutor().execute(putUserCommand(id, { name: "Avi" }));
                assertThat(await replication.waitForDocumentToReplicate(slave, id, 15_000, User)).isNotNull();

                await master.operations.send(new PutAttachmentOperation(id, attachmentName, expected));
                const replicated = await testContext.waitForValue(
                    async () => !!(await readAttachment(slave, id, attachmentName)), true);
                assertThat(replicated).isTrue();
            });
        }));

        await replay(async store => {
            assert.deepStrictEqual(await readAttachment(store, id, attachmentName), expected);
        });
    });

    licensedIt("recordingPutResolvedConflictsCommand", async () => {
        const id = "users/A-1";
        const replication = new ReplicationTestContext();

        await withStore(master => withStore(async slave => {
            await slave.maintenance.server.send(new ModifyConflictSolverOperation(slave.database));

            await recordOn(slave, async () => {
                await replication.setupReplication(master, slave);

                await slave.getRequestExecutor().execute(putUserCommand(id, { name: "Avi" }));
                await master.getRequestExecutor().execute(putUserCommand(id, { name: "Avi", age: 67 }));

                const conflicted = await testContext.waitForValue(async () => {
                    const command = new GetConflictsCommand(id, slave.conventions);
                    await slave.getRequestExecutor().execute(command);
                    return command.result.results.length > 0;
                }, true);
                assertThat(conflicted).isTrue();

                await slave.maintenance.server.send(new ModifyConflictSolverOperation(slave.database, null, true));

                const resolved = await testContext.waitForValue(async () => {
                    try {
                        await slave.openSession().load<User>(id);
                        return true;
                    } catch {
                        return false;
                    }
                }, true);
                assertThat(resolved).isTrue();
            });
        }));

        await withStore(async store => {
            await store.maintenance.server.send(new ModifyConflictSolverOperation(store.database));
            await replayInto(store);

            const actual = await store.openSession().load<User>(id);
            assertThat(actual.name).isEqualTo("Avi");
            assertThat(actual.age).isEqualTo(67);
        });
    });

    it("recordingDeleteAttachmentCommand", async () => {
        const id = "users/1";
        const fileName = "someFileName";

        await record(async store => {
            await store.getRequestExecutor().execute(putUserCommand(id, { name: "Gershon" }));
            await store.operations.send(new PutAttachmentOperation(id, fileName, Buffer.from("Menahem"), "application/pdf"));
            await store.operations.send(new DeleteAttachmentOperation(id, fileName));
        });

        await replay(async store => {
            assertThat(await readAttachment(store, id, fileName)).isNull();
        });
    });

    it("recordingPutAttachmentCommand", async () => {
        const id = "users/1";
        const fileName = "someFileName";
        const expected = Buffer.from("Menahem");

        await record(async store => {
            await store.getRequestExecutor().execute(putUserCommand(id, { name: "Gershon" }));
            await store.operations.send(new PutAttachmentOperation(id, fileName, expected, "application/pdf"));
        });

        await replay(async store => {
            assert.deepStrictEqual(await readAttachment(store, id, fileName), expected);
        });
    });

    it("recordingDeleteCommand", async () => {
        const expectedNames = ["Baruch", "Charlotte", "Dylan", "Eli", "Fabia", "George", "Harper"];

        await record(async store => {
            const session = store.openSession();
            const userToDelete = Object.assign(new User(), { name: "Avi" });
            await session.store(userToDelete);
            for (const name of expectedNames) {
                await session.store(Object.assign(new User(), { name }));
            }
            await session.saveChanges();

            await store.getRequestExecutor().execute(new DeleteDocumentCommand(userToDelete.id, null));
        });

        await replay(async store => {
            assert.deepStrictEqual(await queryNames(store), expectedNames);
        });
    });

    for (const names of someNames) {
        it(`recordingPatchWithParametersByQuery (${names.length})`, async () => {
            const newAge = 34;

            await record(async store => {
                await storeUsers(store, names);

                const query = new IndexQuery("FROM Users UPDATE { this.age = $age; }");
                const parameters: Record<string, any> = { age: newAge };
                query.queryParameters = parameters;
                await (await store.operations.send(new PatchByQueryOperation(query))).waitForCompletion();
            });

            await replay(async store => {
                const users = await store.openSession().query(User).all();
                assertThat(users).hasSize(names.length);
                for (const user of users) {
                    assertThat(user.age).isEqualTo(newAge);
                }
            });
        });
    }

    it("recordingCountersCommandsAsBatch", async () => {
        const id = "users/A-1";
        const incrementedCounter = "likes";
        const deletedCounter = "Anger";

        await record(async store => {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "August" });
            await session.store(user, id);
            await session.saveChanges();

            session.countersFor(user).increment(incrementedCounter, 100);
            session.countersFor(user).increment(deletedCounter, 100);
            await session.saveChanges();

            session.countersFor(user).delete(deletedCounter);
            await session.saveChanges();
        });

        await replay(async store => {
            const counters = Object.keys(await store.openSession().countersFor(id).getAll());
            assertThat(counters).contains(incrementedCounter);
            assertThat(counters.includes(deletedCounter)).isFalse();
        });
    });

    itOn72("recordingPatchAsBatch", async () => {
        const newName = "Balilo";

        await record(async store => {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Baruch" });
            await session.store(user);
            await session.saveChanges();

            session.advanced.patch(user, "name", newName);
            await session.saveChanges();
        });

        await replay(async store => {
            assert.deepStrictEqual(await queryNames(store), [newName]);
        });
    });

    for (const names of someNames) {
        it(`recordingStoreAsBatch (${names.length})`, async () => {
            await record(store => storeUsers(store, names));

            await replay(async store => {
                assert.deepStrictEqual(await queryNames(store), names);
            });
        });
    }

    it("recordingAddAttachmentAsBatch", async () => {
        const id = "users/A-1";
        const attachmentName = "someFileName";
        const expected = Buffer.from("Menahem");

        await record(async store => {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Avi" }), id);
            session.advanced.attachments.store(id, attachmentName, expected);
            await session.saveChanges();
        });

        await replay(async store => {
            assert.deepStrictEqual(await readAttachment(store, id, attachmentName), expected);
        });
    });

    it("recordingDeleteAttachmentAsBatch", async () => {
        const id = "users/A-1";
        const attachmentName = "someFileName";

        await record(async store => {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Avi" }), id);
            session.advanced.attachments.store(id, attachmentName, Buffer.from("Menahem"));
            await session.saveChanges();

            session.advanced.attachments.delete(id, attachmentName);
            await session.saveChanges();
        });

        await replay(async store => {
            assertThat(await store.openSession().advanced.attachments.get(id, attachmentName)).isNull();
        });
    });

    it("recordingDeleteAsBatch", async () => {
        const expectedNames = ["Baruch", "Charlotte", "Dylan", "Eli", "Fabia", "George", "Harper"];

        await record(async store => {
            const session = store.openSession();
            const userToDelete = Object.assign(new User(), { name: "Avi" });
            await session.store(userToDelete);
            for (const name of expectedNames) {
                await session.store(Object.assign(new User(), { name }));
            }
            await session.saveChanges();

            session.delete(userToDelete);
            await session.saveChanges();
        });

        await replay(async store => {
            assert.deepStrictEqual(await queryNames(store), expectedNames);
        }, true);
    });

    for (const names of someNames) {
        it(`recordingSmuggler (${names.length})`, async () => {
            const exportFilePath = path.resolve(temporaryDirContext.tempDir, "export.ravendbdump");

            await withStore(async store => {
                await storeUsers(store, names);
                await (await store.smuggler.export(new DatabaseSmugglerExportOptions(), exportFilePath)).waitForCompletion();
            });

            await record(async store => {
                await (await store.smuggler.import(new DatabaseSmugglerImportOptions(), exportFilePath)).waitForCompletion();
            });

            await replay(async store => {
                const actualNames = await queryNames(store);
                for (const name of names) {
                    assertThat(actualNames).contains(name);
                }
            });
        });
    }

    for (const names of someNames) {
        it(`recordingPut (${names.length})`, async () => {
            await record(async store => {
                for (const name of names) {
                    await store.getRequestExecutor().execute(putUserCommand("user/", { name }));
                }
            });

            await replay(async store => {
                assert.deepStrictEqual(await queryNames(store), names);
            });
        });
    }

    for (const names of someNames) {
        it(`recordingInsertBulk (${names.length})`, async () => {
            await record(async store => {
                const bulkInsert = store.bulkInsert();
                for (const name of names) {
                    await bulkInsert.store(Object.assign(new User(), { name }));
                }
                await bulkInsert.finish();
            });

            await replay(async store => {
                assert.deepStrictEqual((await queryNames(store)).sort(), [...names].sort());
            });
        });
    }
});
