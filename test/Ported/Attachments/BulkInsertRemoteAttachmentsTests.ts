import {disposeTestDocumentStore, testContext} from "../../Utils/TestUtil.js";
import {
    ConfigureRemoteAttachmentsOperation,
    IDocumentStore,
    RemoteAttachmentParameters,
    RemoteAttachmentsConfiguration,
    RemoteAttachmentsDestinationConfiguration,
    RemoteAttachmentsS3Settings
} from "../../../src/index.js";
import {assertThat} from "../../Utils/AssertExtensions.js";
import {Buffer} from "node:buffer";

interface Order {
    id?: string;
    company: string;
    orderedAt: Date;
    shipVia?: string;
}

describe("BulkInsertRemoteAttachmentsTests", () => {

    let store: IDocumentStore;

    beforeEach(async () => {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function setupRemoteAttachmentsConfig(identifier: string = "S3-BulkTest"): Promise<string> {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket";
        s3Settings.awsAccessKey = "test-access-key";
        s3Settings.awsSecretKey = "test-secret-key";
        s3Settings.awsRegionName = "us-east-1";
        destination.s3Settings = s3Settings;


        configuration.destinations[identifier] = destination;
        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        return identifier;
    }

    it("can bulk insert attachments with remote parameters", async () => {
        const identifier = await setupRemoteAttachmentsConfig();

        const bulkInsert = store.bulkInsert();

        for (let i = 0; i < 5; i++) {
            const order: Order = {
                company: `Company ${i}`,
                orderedAt: new Date(2024, 0, i + 1)
            };
            await bulkInsert.store(order, `orders/${i + 1}`);
        }

        const remoteAt = new Date(Date.now() + 60000);
        for (let i = 0; i < 5; i++) {
            const orderId = `orders/${i + 1}`;
            const attachmentData = Buffer.from(`Attachment data for order ${i + 1}`);
            const remoteParams = new RemoteAttachmentParameters(
                identifier,
                remoteAt
            );

            await bulkInsert.attachmentsFor(orderId)
                .store(`invoice-${i + 1}.pdf`, attachmentData, "application/pdf", remoteParams);
        }

        await bulkInsert.finish();

        {
            const session = store.openSession();
            for (let i = 0; i < 5; i++) {
                const order = await session.load<Order>(`orders/${i + 1}`);
                assertThat(order)
                    .isNotNull();
                assertThat(order.company)
                    .isEqualTo(`Company ${i}`);

                const names = session.advanced.attachments.getNames(order);
                assertThat(names.length)
                    .isEqualTo(1);
                assertThat(names[0].name)
                    .isEqualTo(`invoice-${i + 1}.pdf`);
                assertThat(names[0].contentType)
                    .isEqualTo("application/pdf");
            }
        }
    });

    it("can bulk insert attachments without remote parameters", async () => {
        await setupRemoteAttachmentsConfig();

        const bulkInsert = store.bulkInsert();

        for (let i = 0; i < 3; i++) {
            const order: Order = {
                company: `Company ${i}`,
                orderedAt: new Date(2024, 1, i + 1)
            };
            await bulkInsert.store(order, `orders/${i + 10}`);
        }

        for (let i = 0; i < 3; i++) {
            const orderId = `orders/${i + 10}`;
            const attachmentData = Buffer.from(`Local attachment ${i}`);

            await bulkInsert.attachmentsFor(orderId)
                .store(`document-${i}.txt`, attachmentData, "text/plain");
        }

        await bulkInsert.finish();

        {
            const session = store.openSession();
            for (let i = 0; i < 3; i++) {
                const order = await session.load<Order>(`orders/${i + 10}`);
                assertThat(order)
                    .isNotNull();

                const attachment = await session.advanced.attachments.get(`orders/${i + 10}`, `document-${i}.txt`);
                assertThat(attachment)
                    .isNotNull();
                assertThat(attachment.details.contentType)
                    .isEqualTo("text/plain");
            }
        }
    });

    it("can bulk insert mixed attachments with and without remote parameters", async () => {
        const identifier = await setupRemoteAttachmentsConfig();

        const bulkInsert = store.bulkInsert();

        for (let i = 0; i < 4; i++) {
            const order: Order = {
                company: `Company ${i}`,
                orderedAt: new Date(2024, 2, i + 1)
            };
            await bulkInsert.store(order, `orders/${i + 20}`);
        }

        const remoteAt = new Date(Date.now() + 120000);

        for (let i = 0; i < 4; i++) {
            const orderId = `orders/${i + 20}`;
            const attachmentData = Buffer.from(`Attachment ${i}`);

            if (i % 2 === 0) {
                const remoteParams = new RemoteAttachmentParameters(
                    identifier,
                    remoteAt
                );
                await bulkInsert.attachmentsFor(orderId)
                    .store(`remote-${i}.dat`, attachmentData, "application/octet-stream", remoteParams);
            } else {
                await bulkInsert.attachmentsFor(orderId)
                    .store(`local-${i}.dat`, attachmentData, "application/octet-stream");
            }
        }

        await bulkInsert.finish();

        {
            const session = store.openSession();
            for (let i = 0; i < 4; i++) {
                const order = await session.load<Order>(`orders/${i + 20}`);
                assertThat(order)
                    .isNotNull();

                const names = session.advanced.attachments.getNames(order);
                assertThat(names.length)
                    .isEqualTo(1);

                if (i % 2 === 0) {
                    assertThat(names[0].name)
                        .isEqualTo(`remote-${i}.dat`);
                } else {
                    assertThat(names[0].name)
                        .isEqualTo(`local-${i}.dat`);
                }
            }
        }
    });

    it("can bulk insert large number of attachments with remote parameters", async () => {
        const identifier = await setupRemoteAttachmentsConfig();
        const count = 50;

        const bulkInsert = store.bulkInsert();

        const remoteAt = new Date(Date.now() + 180000);

        for (let i = 0; i < count; i++) {
            const order: Order = {
                company: `Company ${i}`,
                orderedAt: new Date(2024, 3, (i % 28) + 1)
            };
            await bulkInsert.store(order, `orders/${i + 100}`);

            const attachmentData = Buffer.from(`Bulk attachment ${i}`);
            const remoteParams = new RemoteAttachmentParameters(
                identifier,
                remoteAt
            );

            await bulkInsert.attachmentsFor(`orders/${i + 100}`)
                .store(`file-${i}.bin`, attachmentData, "application/octet-stream", remoteParams);
        }

        await bulkInsert.finish();

        {
            const session = store.openSession();

            const first = await session.load<Order>("orders/100");
            assertThat(first)
                .isNotNull();
            let names = session.advanced.attachments.getNames(first);
            assertThat(names.length)
                .isEqualTo(1);

            const middle = await session.load<Order>("orders/125");
            assertThat(middle)
                .isNotNull();
            names = session.advanced.attachments.getNames(middle);
            assertThat(names.length)
                .isEqualTo(1);

            const last = await session.load<Order>(`orders/${100 + count - 1}`);
            assertThat(last)
                .isNotNull();
            names = session.advanced.attachments.getNames(last);
            assertThat(names.length)
                .isEqualTo(1);
        }
    });

    it("can bulk insert multiple attachments per document with remote parameters", async () => {
        const identifier = await setupRemoteAttachmentsConfig();

        const bulkInsert = store.bulkInsert();

        const order: Order = {
            company: "Multi-Attachment Company",
            orderedAt: new Date(2024, 4, 15)
        };
        await bulkInsert.store(order, "orders/multi-1");

        const remoteAt = new Date(Date.now() + 300000);
        const remoteParams = new RemoteAttachmentParameters(
            identifier,
            remoteAt
        );

        await bulkInsert.attachmentsFor("orders/multi-1")
            .store("invoice.pdf", Buffer.from("Invoice content"), "application/pdf", remoteParams);

        await bulkInsert.attachmentsFor("orders/multi-1")
            .store("receipt.pdf", Buffer.from("Receipt content"), "application/pdf", remoteParams);

        await bulkInsert.attachmentsFor("orders/multi-1")
            .store("contract.pdf", Buffer.from("Contract content"), "application/pdf", remoteParams);

        await bulkInsert.finish();

        {
            const session = store.openSession();
            const order = await session.load<Order>("orders/multi-1");
            assertThat(order)
                .isNotNull();

            const names = session.advanced.attachments.getNames(order);
            assertThat(names.length)
                .isEqualTo(3);

            const namesList = names.map(n => n.name).sort();
            assertThat(namesList[0])
                .isEqualTo("contract.pdf");
            assertThat(namesList[1])
                .isEqualTo("invoice.pdf");
            assertThat(namesList[2])
                .isEqualTo("receipt.pdf");
        }
    });
});
