import {testContext, disposeTestDocumentStore} from "../../Utils/TestUtil.js";
import {
    IDocumentStore,
    ConfigureRemoteAttachmentsOperation,
    RemoteAttachmentsConfiguration,
    RemoteAttachmentsDestinationConfiguration,
    RemoteAttachmentsS3Settings,
    RemoteAttachmentParameters,
    StoreAttachmentParameters
} from "../../../src/index.js";
import {assertThat} from "../../Utils/AssertExtensions.js";
import {Readable} from "node:stream";
import {Buffer} from "node:buffer";

interface User {
    id?: string;
    name: string;
    email?: string;
}

describe("DocumentSessionRemoteAttachmentsTests", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function setupRemoteAttachmentsConfig(identifier: string = "S3-Test"): Promise<string> {
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

    it("can store attachment with remote parameters using StoreAttachmentParameters", async () => {
        const identifier = await setupRemoteAttachmentsConfig();
        const userId = "users/1";

        {
            const session = store.openSession();
            const user: User = {name: "John Doe", email: "john@example.com"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachmentData = Buffer.from([1, 2, 3, 4, 5]);
            const remoteAt = new Date(Date.now() + 60000); // 1 minute from now

            const parameters = new StoreAttachmentParameters(
                "profile.png",
                Readable.from(attachmentData),
                "image/png",
                null,
                new RemoteAttachmentParameters(identifier, remoteAt)
            );

            session.advanced.attachments.store(userId, parameters);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachment = await session.advanced.attachments.get(userId, "profile.png");

            assertThat(attachment)
                .isNotNull();
            assertThat(attachment.details.name)
                .isEqualTo("profile.png");
            assertThat(attachment.details.contentType)
                .isEqualTo("image/png");
        }
    });

    it("can store attachment with remote parameters using direct method", async () => {
        const identifier = await setupRemoteAttachmentsConfig();
        const userId = "users/2";

        {
            const session = store.openSession();
            const user: User = {name: "Jane Smith"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachmentData = Buffer.from([10, 20, 30]);
            const remoteAt = new Date(Date.now() + 120000); // 2 minutes from now

            const parameters = new StoreAttachmentParameters(
                "document.pdf",
                Readable.from(attachmentData),
                "application/pdf",
                null,
                new RemoteAttachmentParameters(identifier, remoteAt)
            );

            session.advanced.attachments.store(userId, parameters);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>(userId);
            assertThat(user)
                .isNotNull();

            const names = session.advanced.attachments.getNames(user);
            assertThat(names.length)
                .isEqualTo(1);
            assertThat(names[0].name)
                .isEqualTo("document.pdf");
        }
    });

    it("can store attachment without remote parameters", async () => {
        await setupRemoteAttachmentsConfig();
        const userId = "users/3";

        {
            const session = store.openSession();
            const user: User = {name: "Bob Wilson"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachmentData = Buffer.from([1, 2, 3]);

            // Store without remote parameters
            session.advanced.attachments.store(
                userId,
                "local-file.txt",
                Readable.from(attachmentData),
                "text/plain"
            );
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachment = await session.advanced.attachments.get(userId, "local-file.txt");

            assertThat(attachment)
                .isNotNull();
            assertThat(attachment.details.name)
                .isEqualTo("local-file.txt");
        }
    });

    it("can store multiple attachments with different remote destinations", async () => {
        const identifier1 = await setupRemoteAttachmentsConfig("S3-Primary");

        // Setup second destination
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;
        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket-2";
        s3Settings.awsAccessKey = "test-key-2";
        s3Settings.awsSecretKey = "test-secret-2";
        destination.s3Settings = s3Settings;
        configuration.destinations["S3-Primary"] = destination;

        const destination2 = new RemoteAttachmentsDestinationConfiguration();
        destination2.disabled = false;
        const s3Settings2 = new RemoteAttachmentsS3Settings();
        s3Settings2.bucketName = "test-bucket-secondary";
        s3Settings2.awsAccessKey = "test-key-secondary";
        s3Settings2.awsSecretKey = "test-secret-secondary";
        destination2.s3Settings = s3Settings2;
        configuration.destinations["S3-Secondary"] = destination2;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const userId = "users/4";

        {
            const session = store.openSession();
            const user: User = {name: "Alice Cooper"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();

            // First attachment to primary destination
            const data1 = Buffer.from([1, 2, 3]);
            const params1 = new StoreAttachmentParameters(
                "primary.dat",
                Readable.from(data1),
                "application/octet-stream",
                null,
                new RemoteAttachmentParameters("S3-Primary", new Date(Date.now() + 60000))
            );
            session.advanced.attachments.store(userId, params1);

            // Second attachment to secondary destination
            const data2 = Buffer.from([4, 5, 6]);
            const params2 = new StoreAttachmentParameters(
                "secondary.dat",
                Readable.from(data2),
                "application/octet-stream",
                null,
                new RemoteAttachmentParameters("S3-Secondary", new Date(Date.now() + 120000))
            );
            session.advanced.attachments.store(userId, params2);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>(userId);
            const names = session.advanced.attachments.getNames(user);

            assertThat(names.length)
                .isEqualTo(2);

            const namesList = names.map(n => n.name).sort();
            assertThat(namesList[0])
                .isEqualTo("primary.dat");
            assertThat(namesList[1])
                .isEqualTo("secondary.dat");
        }
    });

    it("can check if attachment exists", async () => {
        await setupRemoteAttachmentsConfig();
        const userId = "users/5";

        {
            const session = store.openSession();
            const user: User = {name: "Test User"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachmentData = Buffer.from([1, 2, 3]);

            session.advanced.attachments.store(
                userId,
                "test.txt",
                Readable.from(attachmentData),
                "text/plain"
            );
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const exists = await session.advanced.attachments.exists(userId, "test.txt");
            const notExists = await session.advanced.attachments.exists(userId, "nonexistent.txt");

            assertThat(exists)
                .isTrue();
            assertThat(notExists)
                .isFalse();
        }
    });

    it("can delete attachment with remote parameters", async () => {
        await setupRemoteAttachmentsConfig();
        const userId = "users/6";

        {
            const session = store.openSession();
            const user: User = {name: "Delete Test"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachmentData = Buffer.from([1, 2, 3]);
            const params = new StoreAttachmentParameters(
                "to-delete.txt",
                Readable.from(attachmentData),
                "text/plain"
            );
            session.advanced.attachments.store(userId, params);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.attachments.delete(userId, "to-delete.txt");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const exists = await session.advanced.attachments.exists(userId, "to-delete.txt");
            assertThat(exists)
                .isFalse();
        }
    });

    it("can store attachment with scheduled upload time", async () => {
        const identifier = await setupRemoteAttachmentsConfig();
        const userId = "users/7";

        {
            const session = store.openSession();
            const user: User = {name: "Scheduled Upload User"};
            await session.store(user, userId);
            await session.saveChanges();
        }

        const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now

        {
            const session = store.openSession();
            const attachmentData = Buffer.from([1, 2, 3, 4, 5]);

            const parameters = new StoreAttachmentParameters(
                "scheduled.dat",
                Readable.from(attachmentData),
                "application/octet-stream",
                null,
                new RemoteAttachmentParameters(identifier, scheduledTime)
            );

            session.advanced.attachments.store(userId, parameters);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const attachment = await session.advanced.attachments.get(userId, "scheduled.dat");

            assertThat(attachment)
                .isNotNull();
            assertThat(attachment.details.name)
                .isEqualTo("scheduled.dat");
        }
    });
});
