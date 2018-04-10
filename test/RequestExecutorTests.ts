import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext } from "./Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    GetDatabaseTopologyCommand,
    RavenErrorType,
} from "../src";
import { GetNextOperationIdCommand } from "../src/Documents/Commands/GetNextOperationIdCommand";
import { GetDatabaseNamesOperation } from "../src/ServerWide/Operations/GetDatabaseNamesOperation";

describe("Request executor", function() {

    describe("with server running", () => {

        it("failures do not block connection pool", async function() {
            const documentConventions = new DocumentConventions();
            let store;
            try {
                store = await globalContext.getDocumentStore();
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
            } finally {
                store.dispose();
            }
        });
    });

    it("fails when server is offline", function() {
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