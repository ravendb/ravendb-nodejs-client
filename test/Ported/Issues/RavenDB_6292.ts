import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    ConflictSolver,
    DocumentStore, InMemoryDocumentSessionOperations,
} from "../../../src";
import { ReplicationTestContext } from "../../Utils/ReplicationTestContext";
import { Address, User } from "../../Assets/Entities";
import { QueryCommand } from "../../../src/Documents/Commands/QueryCommand";
import { tryGetConflict } from "../../../src/Mapping/Json";

(RavenTestContext.isPullRequest ? describe.skip : describe)(
    `${RavenTestContext.isPullRequest ? "[Skipped on PR] " : ""}` +
    "RavenDB-6292", function () {

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

        afterEach(async () =>
            await disposeTestDocumentStore(store));

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

            it("if included document is conflicted, it should not throw conflict exception", async () => {
                let source: DocumentStore;
                let destination: DocumentStore;

                try {
                    source = await testContext.getDocumentStore();
                    try {
                        destination = await testContext.getDocumentStore();

                        {
                            const session = source.openSession();
                            const address = new Address();
                            address.city = "New York";
                            await session.store(address, "addresses/1");
                            await session.saveChanges();
                        }

                        {
                            const session = destination.openSession();
                            const address = new Address();
                            address.city = "Torun";
                            await session.store(address, "addresses/1");

                            const user = new User();
                            user.name = "John";
                            user.addressId = "addresses/1";
                            await session.store(user, "users/1");
                            await session.saveChanges();
                        }

                        await replication.setupReplication(source, destination);
                        await testContext.replication.waitForConflict(destination, "addresses/1");

                        {
                            const session = destination.openSession();
                            const documentQuery = session.query(User)
                                .include("addressId");

                            const iq = documentQuery.getIndexQuery();

                            const user = await documentQuery.first();

                            assert.strictEqual(user.name, "John");

                            try {
                                await session.load<Address>(user.addressId);
                                assert.fail("Should have thrown");
                            } catch (err) {
                                assert.strictEqual(err.name, "DocumentConflictException");
                            }

                            const queryCommand = new QueryCommand(
                                session as unknown as InMemoryDocumentSessionOperations, iq, {
                                    indexEntriesOnly: false,
                                    metadataOnly: false
                                });

                            await destination.getRequestExecutor().execute(queryCommand);

                            const result = queryCommand.result;
                            const address = result.includes["addresses/1"];
                            const metadata = address["@metadata"];
                            assert.strictEqual(metadata["@id"], "addresses/1");

                            assert.ok(tryGetConflict(metadata));
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
