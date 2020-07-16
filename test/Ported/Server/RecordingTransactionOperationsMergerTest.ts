import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil";
import * as path from "path";
import { StartTransactionsRecordingOperation } from "../../../src/Documents/Operations/TransactionsRecording/StartTransactionsRecordingOperation";
import { StopTransactionsRecordingOperation } from "../../../src/Documents/Operations/TransactionsRecording/StopTransactionsRecordingOperation";
import { assertThat } from "../../Utils/AssertExtensions";
import * as fs from "fs";
import { CreateSampleDataOperation } from "../../Utils/CreateSampleDataOperation";

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
            await store.maintenance.send(new CreateSampleDataOperation());
        } finally {
            await store.maintenance.send(new StopTransactionsRecordingOperation());
        }

        assertThat(fs.statSync(targetFile).size)
            .isGreaterThan(0);
    });
});
