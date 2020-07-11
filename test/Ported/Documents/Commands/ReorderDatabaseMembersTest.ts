import { IDocumentStore } from "../../../../src";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import { ReorderDatabaseMembersOperation } from "../../../../src/ServerWide/Operations/ReorderDatabaseMembersOperation";

describe("ReorderDatabaseMembersTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSendReorderCommand", async () => {
        await store.maintenance.send(new ReorderDatabaseMembersOperation(store.database, ["A"]));
    });

});
