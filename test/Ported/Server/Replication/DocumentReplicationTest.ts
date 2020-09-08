import { User } from "../../../Assets/Entities";

import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    IDocumentStore,
    DocumentStore,
    ConflictSolver,
    GetConflictsCommand,
    PutDocumentCommand, GetOngoingTaskInfoOperation,
} from "../../../../src";
import { ReplicationTestContext } from "../../../Utils/ReplicationTestContext";
import { assertThat } from "../../../Utils/AssertExtensions";
import { OngoingTaskReplication } from "../../../../src/Documents/Operations/OngoingTasks/OngoingTask";

const _describe = RavenTestContext.isPullRequest ? describe.skip : describe;
_describe(
    `${RavenTestContext.isPullRequest ? "[Skipped on PR] " : ""}` +
    "DocumentReplicationTest", function () {
        this.timeout(20000);

        let store: IDocumentStore;
        let replication: ReplicationTestContext;

        beforeEach(async function () {
            store = await testContext.getDocumentStore();
            replication = new ReplicationTestContext();
        });

        afterEach(async () => {
            replication = null;
            await disposeTestDocumentStore(store);
        });

        const _it = it;

        describe("with resolveToLatest to false", function() {

            beforeEach(() => {
                testContext.customizeDbRecord = r => {
                    const conflictSolver: ConflictSolver = {
                        resolveToLatest: false,
                        resolveByCollection: {}
                    };
                    r.conflictSolverConfig = conflictSolver;
                };
            });

            afterEach(() => testContext.customizeDbRecord = null);

            _it("can replicate document", async function () {

                let source: DocumentStore;
                let destination: DocumentStore;

                try {
                    source = await testContext.getDocumentStore();
                    try {
                        let id;
                        destination = await testContext.getDocumentStore();

                        await replication.setupReplication(source, destination);

                        {
                            const session = source.openSession();
                            const user = new User();
                            user.name = "Arek";
                            await session.store(user);
                            await session.saveChanges();
                            id = user.id;
                        }

                        const replicatedUser =
                            await replication.waitForDocumentToReplicate<User>(destination, id, 10000, User);
                        assert.ok(replicatedUser);
                        assert.strictEqual(replicatedUser.name, "Arek");
                    } finally {
                        destination.dispose();
                    }
                } finally {
                    source.dispose();
                }
            });

            describe("GetConflictsCommand", function () {

                _it("should get document conflicts", async function () {

                    let source: DocumentStore;
                    let destination: DocumentStore;

                    try {
                        source = await testContext.getDocumentStore();
                        try {

                            destination = await testContext.getDocumentStore();

                            {
                                const session = source.openSession();
                                const user1 = new User();
                                user1.name = "Value";

                                await session.store(user1, "docs/1");
                                await session.saveChanges();
                            }

                            {
                                const session = destination.openSession();
                                const user1 = new User();
                                user1.name = "Value2";

                                await session.store(user1, "docs/1");
                                await session.saveChanges();
                            }

                            await replication.setupReplication(source, destination);

                            {
                                const session = source.openSession();
                                const user1 = new User();
                                user1.name = "marker";

                                await session.store(user1, "marker");
                                await session.saveChanges();
                            }

                            await replication.waitForDocumentToReplicate(destination, "marker", 2000, User);

                            const command = new GetConflictsCommand("docs/1", destination.conventions);
                            await destination.getRequestExecutor().execute(command);
                            const conflicts = command.result;

                            assert.strictEqual(conflicts.results.length, 2);

                            assert.notStrictEqual(conflicts.results[0].changeVector, conflicts.results[1].changeVector);
                        } finally {
                            destination.dispose();
                        }
                    } finally {
                        source.dispose();
                    }
                });

            });

            describe("PutDocumentCommand", function () {

                _it("can resolve conflict", async function () {
                    let source: DocumentStore;
                    let destination: DocumentStore;

                    try {
                        source = await testContext.getDocumentStore();
                        try {

                            destination = await testContext.getDocumentStore();

                            {
                                const session = source.openSession();
                                const user1 = new User();
                                user1.name = "Value";

                                await session.store(user1, "docs/1");
                                await session.saveChanges();
                            }

                            {
                                const session = destination.openSession();
                                const user1 = new User();
                                user1.name = "Value2";

                                await session.store(user1, "docs/1");
                                await session.saveChanges();
                            }

                            await replication.setupReplication(source, destination);

                            {
                                const session = source.openSession();
                                const user1 = new User();
                                user1.name = "marker";

                                await session.store(user1, "marker");
                                await session.saveChanges();
                            }

                            await replication.waitForDocumentToReplicate(destination, "marker", 2000, User);

                            const command = new GetConflictsCommand("docs/1", destination.conventions);
                            await destination.getRequestExecutor().execute(command);
                            const conflicts = command.result;

                            assert.strictEqual(conflicts.results.length, 2);

                            assert.notStrictEqual(conflicts.results[0].changeVector, conflicts.results[1].changeVector);

                            {
                                const session = destination.openSession();
                                try {
                                    const user = await session.load("docs/1");
                                    assert.fail("Should have thrown");
                                } catch (err) {
                                    assert.strictEqual(err.name, "DocumentConflictException");
                                }
                            }

                            //now actually resolve the conflict
                            //(resolve by using first variant)
                            const putCommand = new PutDocumentCommand("docs/1", null, conflicts.results[0].doc);
                            await destination.getRequestExecutor().execute(putCommand);

                            {
                                const session = destination.openSession();
                                const user = await session.load<User>("docs/1");
                                assert.strictEqual(user.name, conflicts.results[0].doc["name"]);
                            }

                        } finally {
                            destination.dispose();
                        }
                    } finally {
                        source.dispose();
                    }

                });


                _it("canGetInfoAboutReplicationTask", async () => {
                    let source: DocumentStore;
                    let destination: DocumentStore;

                    try {
                        source = await testContext.getDocumentStore();
                        try {
                            destination = await testContext.getDocumentStore();

                            const taskResults = await replication.setupReplication(source, destination);

                            const taskId = taskResults[0].taskId;
                            assertThat(taskId)
                                .isGreaterThan(0);

                            const ongoingTask = await source.maintenance.send(
                                new GetOngoingTaskInfoOperation(taskId, "Replication")) as OngoingTaskReplication;

                            assertThat(ongoingTask)
                                .isNotNull();

                            assertThat(ongoingTask.destinationDatabase)
                                .isEqualTo(destination.database);
                            assertThat(ongoingTask.delayReplicationFor)
                                .isEqualTo("00:00:00");
                            assertThat(ongoingTask.taskState)
                                .isEqualTo("Enabled");
                        } finally {
                            destination.dispose();
                        }
                    } finally {
                        source.dispose();
                    }
                });
            });
        });
    });
