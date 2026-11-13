import { Readable } from "node:stream";
import {
    ConfigureRevisionsOperation,
    DatabaseSmugglerExportOptions,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Company } from "../../Assets/Entities.js";

describe("RavenDB_11171", function () {

    const stores: IDocumentStore[] = [];

    afterEach(async () => {
        for (const store of stores.splice(0)) {
            await disposeTestDocumentStore(store);
        }
    });

    async function newStore(withRevisions: boolean) {
        const store = await testContext.getDocumentStore();
        stores.push(store);

        if (withRevisions) {
            const configuration = new RevisionsConfiguration();
            configuration.defaultConfig = new RevisionsCollectionConfiguration();
            await store.maintenance.send(new ConfigureRevisionsOperation(configuration));
        }

        return store;
    }

    async function readText(data: Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of data) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString("utf8");
    }

    async function assertAttachment(store: IDocumentStore) {
        const session = store.openSession();
        const company = await session.load("companies/1", Company);
        assertThat(company).isNotNull();

        const attachmentNames = session.advanced.attachments.getNames(company);
        assertThat(attachmentNames).hasSize(1);

        for (const attachmentName of attachmentNames) {
            const attachment = await session.advanced.attachments.get(company, attachmentName.name);
            assertThat(await readText(attachment.data)).isEqualTo("123");
        }
    }

    async function assertRevision(store: IDocumentStore, expectedNumberOfRevisions: number) {
        const session = store.openSession();
        const revisions = await session.advanced.revisions.getFor<Company>("companies/1");
        assertThat(revisions).hasSize(expectedNumberOfRevisions);

        for (const revision of revisions) {
            const attachmentNames = session.advanced.attachments.getNames(revision);
            assertThat(attachmentNames).hasSize(1);

            for (const attachmentName of attachmentNames) {
                const attachment = await session.advanced.attachments.getRevision(
                    "companies/1", attachmentName.name, session.advanced.getChangeVectorFor(revision));
                assertThat(await readText(attachment.data)).isEqualTo("123");
            }
        }
    }

    it("shouldWork", async () => {
        const store = await newStore(false);

        const session = store.openSession();
        const company = Object.assign(new Company(), { name: "HR" });
        await session.store(company, "companies/1");
        session.advanced.attachments.store(company, "photo.jpg", Buffer.from("123"));
        await session.saveChanges();

        await assertAttachment(store);

        const store2 = await newStore(true);
        let operation = await store.smuggler.export(new DatabaseSmugglerExportOptions(), store2.smuggler);
        await operation.waitForCompletion(60_000);

        await assertAttachment(store2);
        await assertRevision(store2, 1);

        const store3 = await newStore(true);
        operation = await store2.smuggler.export(new DatabaseSmugglerExportOptions(), store3.smuggler);
        await operation.waitForCompletion(60_000);

        await assertAttachment(store3);
        await assertRevision(store3, 2);
    });
});
