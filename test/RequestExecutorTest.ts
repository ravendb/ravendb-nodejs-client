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

describe("Request executor", function() {

    describe("with server running", () => {

        it("works right", async function() {
            const documentConventions = new DocumentConventions();
            let store;
            try {
                store = await globalContext.getDocumentStore();
                let executor;

                try {
                    executor = RequestExecutor.create(store.urls, "no_such_db", {
                        documentConventions
                    });
                } finally {
                    executor.dispose();
                }
            } finally {
                store.dispose();
            }


            // try (IDocumentStore store = getDocumentStore()) {
            //     try (RequestExecutor executor = RequestExecutor.create(store.getUrls(), "no_such_db", null, conventions)) {
            //         int errorsCount = 0;

            //         for (int i = 0; i < 40; i++) {
            //             try {
            //                 GetNextOperationIdCommand command = new GetNextOperationIdCommand();
            //                 executor.execute(command);
            //             } catch (Exception e) {
            //                 errorsCount++;
            //             }
            //         }

            //         assertThat(errorsCount).isEqualTo(40);

            //         GetDatabaseNamesOperation databaseNamesOperation = new GetDatabaseNamesOperation(0, 20);
            //         RavenCommand<String[]> command = databaseNamesOperation.getCommand(conventions);
            //         executor.execute(command);

            //         assertThat(command.getResult()).doesNotContainNull();
            //     }
            // }

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