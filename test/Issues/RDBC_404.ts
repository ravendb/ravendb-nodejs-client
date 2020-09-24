import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import DocumentStore, {
    IDocumentStore, GetDatabaseNamesOperation, DeleteDatabasesOperation,
} from "../../src";

describe("RDBC-404", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async (store) => {

            store.conventions.findCollectionNameForObjectLiteral = x => "test";
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
    });

    it("GetDatabaseNamesOperation does not fail for an empty server", async () => {

        const store2 = new DocumentStore(store.urls, null);
        try {
            store2.initialize();
            try {
                store.dispose();
            // tslint:disable-next-line: no-empty
            } catch {}

            const dbs = await store2.maintenance.server.send(new GetDatabaseNamesOperation(0, 10));
            await store2.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: dbs,
                hardDelete: true
            }));

            await store.maintenance.server.send(new GetDatabaseNamesOperation(0, 10));
        } finally {
            store2.dispose();
        }
    });
});
