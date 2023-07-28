import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore, DocumentChange, GetDatabaseRecordOperation,
} from "../../../src";
import { User } from "../../Assets/Entities";
import { AsyncQueue } from "../../Utils/AsyncQueue";
import { throwError } from "../../../src/Exceptions";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RDBC_693", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can handle 404 in GetDatabaseRecordOperation", async () => {
        const dbRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation("DB_WHICH_DOESNT_EXIST"));
        assertThat(dbRecord)
            .isNull();
    });
});
