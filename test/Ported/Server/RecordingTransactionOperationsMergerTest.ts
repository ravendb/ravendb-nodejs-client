import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil";
import * as path from "path";
import { StartTransactionsRecordingOperation } from "../../../src/Documents/Operations/TransactionsRecording/StartTransactionsRecordingOperation";
import { User } from "../../Assets/Entities";
import { StopTransactionsRecordingOperation } from "../../../src/Documents/Operations/TransactionsRecording/StopTransactionsRecordingOperation";
import { assertThat } from "../../Utils/AssertExtensions";
import * as fs from "fs";

describe("RecordingTransactionOperationsMergerTest", function () {

    let store: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    it("canRecordTransactions", async () => {
        const targetFile = path.join(temporaryDirContext.tempDir, "record-tx");

        await store.maintenance.send(new StartTransactionsRecordingOperation(path.resolve(targetFile)));

        try {
            const session = store.openSession();
            await session.store(new User());
            await session.saveChanges()
        } finally {
            await store.maintenance.send(new StopTransactionsRecordingOperation());
        }

        assertThat(fs.statSync(targetFile).size)
            .isGreaterThan(0);
    });
});
