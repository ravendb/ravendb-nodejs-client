import { PassThrough, Readable } from "node:stream";
import {
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    GetStatisticsOperation,
    IDocumentStore
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("SmugglerStreamsTest", function () {

    let source: IDocumentStore;
    let target: IDocumentStore;

    beforeEach(async function () {
        source = await testContext.getDocumentStore();
        target = await testContext.getDocumentStore();

        const session = source.openSession();
        for (let i = 0; i < 10; i++) {
            await session.store(Object.assign(new User(), { name: "user" + i }), "users/" + i);
        }
        session.advanced.attachments.store("users/0", "photo.jpg", Buffer.from("123"));
        await session.saveChanges();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(source);
        await disposeTestDocumentStore(target);
    });

    async function exportToBuffer() {
        const output = new PassThrough();
        const chunks: Buffer[] = [];
        output.on("data", chunk => chunks.push(chunk));

        const operation = await source.smuggler.export(new DatabaseSmugglerExportOptions(), output);
        await operation.waitForCompletion(30_000);

        return { buffer: Buffer.concat(chunks), output };
    }

    it("exports to a stream and leaves it open", async () => {
        const { buffer, output } = await exportToBuffer();

        assertThat(buffer.length).isGreaterThan(0);
        assertThat(output.writableEnded).isFalse();
    });

    it("imports from a stream", async () => {
        const { buffer } = await exportToBuffer();

        const operation = await target.smuggler.import(new DatabaseSmugglerImportOptions(), Readable.from([buffer]));
        await operation.waitForCompletion(30_000);

        const stats = await target.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfDocuments).isEqualTo(10);
        assertThat(stats.countOfAttachments).isEqualTo(1);
    });

    it("imports from a stream that arrives in small chunks", async () => {
        const { buffer } = await exportToBuffer();
        const chunks = Array.from({ length: Math.ceil(buffer.length / 64) }, (_, i) => buffer.subarray(i * 64, (i + 1) * 64));

        const operation = await target.smuggler.import(new DatabaseSmugglerImportOptions(), Readable.from(chunks));
        await operation.waitForCompletion(30_000);

        const stats = await target.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfDocuments).isEqualTo(10);
    });

    it("exports straight into another database", async () => {
        const operation = await source.smuggler.export(new DatabaseSmugglerExportOptions(), target.smuggler);
        await operation.waitForCompletion(30_000);

        const stats = await target.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfDocuments).isEqualTo(10);
        assertThat(stats.countOfAttachments).isEqualTo(1);
    });

    it("rejects a missing stream or target database", async () => {
        await assertThrows(
            () => source.smuggler.import(new DatabaseSmugglerImportOptions(), null as Readable),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
        await assertThrows(
            () => source.smuggler.export(new DatabaseSmugglerExportOptions(), null as PassThrough),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });
});
