import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import {
    DatabaseRecordWithEtag,
    IDocumentStore,
    GetDatabaseRecordOperation
} from "../../src";

describe("GetDatabaseRecordTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get database record", async () => {
        const databaseRecord: DatabaseRecordWithEtag
            = await store.maintenance.server.send(
            new GetDatabaseRecordOperation(store.database));

        assert.ok(databaseRecord);
        assert.strictEqual(databaseRecord.databaseName, store.database);
    });
});
