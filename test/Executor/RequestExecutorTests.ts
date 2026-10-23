import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";

import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
    GetNextOperationIdCommand,
    GetDatabaseNamesOperation,
    ServerNode,
    IDocumentStore,
    UpdateTopologyParameters
} from "../../src/index.js";

describe("Request executor", function () {

    describe("with server online", () => {

        let store: IDocumentStore;
        let executor: RequestExecutor;
        let documentConventions: DocumentConventions;

        beforeEach(async function () {
            store = await testContext.getDocumentStore();
            documentConventions = new DocumentConventions();
        });

        afterEach(async () =>
            await disposeTestDocumentStore(store));

        it("failures do not block connection pool", async function () {
            try {
                executor = RequestExecutor.create(store.urls, "no_such_db", {
                    documentConventions
                });

                let errorsCount = 0;

                for (let i = 0; i < 40; i++) {
                    try {
                        const cmd = new GetNextOperationIdCommand();
                        await executor.execute(cmd);
                    } catch {
                        errorsCount++;
                    }
                }
                assert.strictEqual(errorsCount, 40);

                try {
                    const databaseNamesOperation = new GetDatabaseNamesOperation(0, 20);
                    const command = databaseNamesOperation.getCommand(documentConventions);
                    await executor.execute(command);
                    assert.fail("Should have thrown.");
                } catch (err) {
                    assert.strictEqual(err.name, "DatabaseDoesNotExistException");
                }

            } finally {
                executor.dispose();
            }
        });

        it("can issue many requests", async () => {
            try {
                executor = RequestExecutor.create(store.urls, store.database, {
                    documentConventions
                });
                for (let i = 0; i < 50; i++) {
                    const databaseNamesOperation = new GetDatabaseNamesOperation(0, 20);
                    const command = databaseNamesOperation.getCommand(documentConventions);
                    await executor.execute(command);
                }
            } finally {
                executor.dispose();
            }
        });

        it("reuses connection across requests", async function () {
            const httpAgent = await store.getRequestExecutor().getHttpAgent();
            if (!httpAgent) {
                this.skip();
            }

            let connectCount = 0;
            const onConnect = () => connectCount++;
            httpAgent.on("connect", onConnect);
            try {
                for (let i = 0; i < 20; i++) {
                    const session = store.openSession();
                    await session.load("users/1");
                }
            } finally {
                httpAgent.off("connect", onConnect);
            }

            assert.ok(connectCount < 5, `Expected connection reuse, got ${connectCount} new connections for 20 requests`);
        });

        it("can fetch database names", async () => {
            try {
                executor = RequestExecutor.create(store.urls, store.database, {
                    documentConventions
                });
                const databaseNamesOperation = new GetDatabaseNamesOperation(0, 20);
                const command = databaseNamesOperation.getCommand(documentConventions);
                await executor.execute(command);

                assert.ok(command.result.includes(store.database));
            } finally {
                executor.dispose();
            }
        });

        it("throws when updating topology of not existing db", async () => {
            try {
                executor = RequestExecutor.create(store.urls, store.database, {
                    documentConventions
                });
                const serverNode = new ServerNode({
                    url: store.urls[0],
                    database: "nope"
                });

                try {
                    const updateTopologyParameters = new UpdateTopologyParameters(serverNode);
                    updateTopologyParameters.timeoutInMs = 5000;
                    await executor.updateTopology(updateTopologyParameters);
                    assert.fail("Should have thrown");
                } catch (err) {
                    assert.strictEqual(err.name, "DatabaseDoesNotExistException", err.stack);
                }
            } finally {
                executor.dispose();
            }
        });

        it("can create single node request executor", async () => {
            try {
                executor = RequestExecutor.createForSingleNodeWithoutConfigurationUpdates(
                    store.urls[0], store.database, { documentConventions });

                const nodes = executor.getTopologyNodes();
                assert.strictEqual(nodes.length, 1);

                const serverNode = nodes[0];
                assert.strictEqual(serverNode.url, store.urls[0]);
                assert.strictEqual(serverNode.database, store.database);

                const command = new GetNextOperationIdCommand();
                await executor.execute(command);
                assert.ok(command.result);
            } finally {
                executor.dispose();
            }
        });

        it("can choose online node", async () => {
            const url = store.urls[0];
            const dbName = store.database;

            try {
                executor = RequestExecutor.create([
                        "http://no_such_host:8080",
                        "http://another_offline:8080",
                        url
                    ],
                    dbName,
                    { documentConventions });

                const command = new GetNextOperationIdCommand();
                await executor.execute(command);
                assert.ok(command.result);

                const nodes = executor.getTopologyNodes();
                assert.strictEqual(nodes.length, 1);
                assert.strictEqual(nodes[0].url, url);
                assert.strictEqual(executor.getUrl(), url);
            } finally {
                executor.dispose();
            }
        });

    });

    it("fails when server is offline", async function () {
        const documentConventions = new DocumentConventions();
        const executor = RequestExecutor.create(["http://127.0.0.85:8081"], "db1", {
            documentConventions
        });
        const getTopology = new GetDatabaseTopologyCommand();
        try {
            await executor.execute(getTopology);
            assert.fail("Should have failed with 'AllTopologyNodesDownException'.")
        } catch (err) {
            assert.ok(err);
            assert.strictEqual(err.name, "RavenException" as RavenErrorType, err.stack);
        } finally {
            executor.dispose();
        }
    });
});
