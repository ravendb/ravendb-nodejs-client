import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext } from "./Utils/TestUtil";
import * as assertExtentions from "./Utils/AssertExtensions";

import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
} from "../src";
import { GetNextOperationIdCommand } from "../src/Documents/Commands/GetNextOperationIdCommand";
import { GetDatabaseNamesOperation } from "../src/ServerWide/Operations/GetDatabaseNamesOperation";
import { IDocumentStore } from "../src/Documents/IDocumentStore";
import { IRavenResponse } from "../src/Types";
import { ServerNode } from "../src/Http/ServerNode";

describe("Request executor", function () {

    describe("with server running", () => {

        let store: IDocumentStore;
        let documentConventions: DocumentConventions;

        beforeEach(async function () {
            store = await globalContext.getDocumentStore();
            documentConventions = new DocumentConventions();
        });

        afterEach(async function () {
            if (!store) {
                return;
            }
            
            await new Promise(resolve => {
                store.once("executorsDisposed", () => resolve());
                store.dispose();
            });
        });

        it("failures do not block connection pool", async function () {
            let executor: RequestExecutor;
            try {
                executor = RequestExecutor.create(store.urls, "no_such_db", {
                    documentConventions
                });

                let errorsCount = 0;

                for (let i = 0; i < 40; i++) {
                    try {
                        const cmd = new GetNextOperationIdCommand();
                        await executor.execute(cmd);
                    } catch (err) {
                        if (err.name === "DatabaseDoesNotExistException") {
                            errorsCount++;
                        } else {
                            throw err;
                        }
                    }
                }

                assert.equal(errorsCount, 40);
                const databaseNamesOperation = new GetDatabaseNamesOperation(0, 20);
                const command = databaseNamesOperation.getCommand(documentConventions);
                await executor.execute(command);
                assert.ok(command.result);

            } finally {
                executor.dispose();
            }
        });

        it("can issue many requests", async () => {
            let executor: RequestExecutor;
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

        it("can fetch database names", async () => {
            let executor: RequestExecutor;
            try {
                executor = RequestExecutor.create(store.urls, store.database, {
                    documentConventions
                });
                const databaseNamesOperation = new GetDatabaseNamesOperation(0, 20);
                const command = databaseNamesOperation.getCommand(documentConventions);
                await executor.execute(command);

                assert.ok(command.result.indexOf(store.database) !== -1);
            } finally {
                executor.dispose();
            }
        });

        it.only("throws when updating topology of not existing db", async () => {
            let executor: RequestExecutor;
            try {
                executor = RequestExecutor.create(store.urls, store.database, {
                    documentConventions
                });
                const serverNode = new ServerNode({ 
                    url: store.urls[0], 
                    database: "nope" });
                
                try {
                    await executor.updateTopology(serverNode, 5000);
                    assert.fail("Should have thrown");
                } catch (err) {
                    assert.equal(err.name, "DatabaseDoesNotExistException", err.stack);
                }
            } finally {
                executor.dispose();
            }

        });
    // @Test
    // public void throwsWhenUpdatingTopologyOfNotExistingDb() throws Exception {
    //     DocumentConventions conventions = new DocumentConventions();

    //     try (IDocumentStore store = getDocumentStore()) {
    //         try (RequestExecutor executor = RequestExecutor.create(store.getUrls(), "no_such_db", null, conventions)) {

    //             ServerNode serverNode = new ServerNode();
    //             serverNode.setUrl(store.getUrls()[0]);
    //             serverNode.setDatabase("no_such");

    //             assertThatThrownBy(() ->
    //                     ExceptionsUtils.accept(() ->
    //                             executor.updateTopologyAsync(serverNode, 5000).get()))
    //                     .isExactlyInstanceOf(DatabaseDoesNotExistException.class);
    //         }
    //     }
    // }

    });
    
    it("fails when server is offline", function () {
        const documentConventions = new DocumentConventions();
        const executor = RequestExecutor.create(["http://no_such_host:8081"], "db1", {
            documentConventions
        });
        const getTopology = new GetDatabaseTopologyCommand();
        return BluebirdPromise.resolve()
            .then(() => executor.execute(getTopology))
            .then(() => assert.fail("Should have failed with 'AllTopologyNodesDownException'."),
                err => {
                    assert.ok(err);
                    assert.equal(err.name, "AllTopologyNodesDownException" as RavenErrorType, err.stack);
                })
            .finally(() => {
                executor.dispose();
            });
    });
});
