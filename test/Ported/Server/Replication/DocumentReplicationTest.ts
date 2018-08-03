import { User } from "../../../Assets/Entities";

import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    IDocumentStore,
    DocumentStore,
    ConflictSolver,
    GetConflictsCommand,
    PutDocumentCommand,
} from "../../../../src";
import { ReplicationTestContext } from "../../../Utils/ReplicationTestContext";

// External replication requires a proper license
// https://docs.travis-ci.com/user/pull-requests/#Pull-Requests-and-Security-Restrictions
const _describe = RavenTestContext.isPullRequest ? describe.skip : describe;
_describe(
    `${RavenTestContext.isPullRequest ? "[Skipped on PR] " : ""}` +
    "DocumentReplicationTest", function () {

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

    describe("with resolveToLatest to false", () => {

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

        _it("can replicate document", async () => {

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
                    assert.equal(replicatedUser.name, "Arek");
                } finally {
                    destination.dispose();
                }
            } finally {
                source.dispose();
            }
        });

        describe("GetConflictsCommand", async () => {

            _it("should get document conflicts", async () => {

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

                        const command = new GetConflictsCommand("docs/1");
                        await destination.getRequestExecutor().execute(command);
                        const conflicts = command.result;

                        assert.equal(conflicts.results.length, 2);

                        assert.notEqual(conflicts.results[0].changeVector, conflicts.results[1].changeVector);
                    } finally {
                        destination.dispose();
                    }
                } finally {
                    source.dispose();
                }
            });

        });

        describe("PutDocumentCommand", () => {

            _it("can resolve conflict", async () => {
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

                        const command = new GetConflictsCommand("docs/1");
                        await destination.getRequestExecutor().execute(command);
                        const conflicts = command.result;

                        assert.equal(conflicts.results.length, 2);

                        assert.notEqual(conflicts.results[0].changeVector, conflicts.results[1].changeVector);

                        {
                            const session = destination.openSession();
                            try {
                                const user = await session.load("docs/1");
                                assert.fail("Should have thrown");
                            } catch (err) {
                                assert.equal(err.name, "DocumentConflictException");
                            }
                        }

                        //now actually resolve the conflict
                        //(resolve by using first variant)
                        const putCommand = new PutDocumentCommand("docs/1", null, conflicts.results[0].doc);
                        await destination.getRequestExecutor().execute(putCommand);

                        {
                            const session = destination.openSession();
                            const user = await session.load<User>("docs/1");
                            assert.equal(user.name, conflicts.results[0].doc["name"]);
                        }

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
