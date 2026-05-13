import {testContext, disposeTestDocumentStore, RavenTestContext} from "../../Utils/TestUtil.js";
import {
    IDocumentStore,
    ConfigureRemoteAttachmentsOperation,
    GetRemoteAttachmentsConfigurationOperation,
    RemoteAttachmentsConfiguration,
    RemoteAttachmentsDestinationConfiguration,
    RemoteAttachmentsS3Settings,
    RemoteAttachmentsAzureSettings
} from "../../../src/index.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RemoteAttachmentsBasicTests", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can put and get remote attachments configuration with S3", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;
        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "testS3Bucket-Users";
        s3Settings.awsAccessKey = "test-access-key";
        s3Settings.awsSecretKey = "test-secret-key";
        s3Settings.awsRegionName = "us-east-1";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-Users"] = destination;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(config)
            .isNotNull();
        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(1);

        const retrievedDestination = config.destinations["S3-Users"];
        assertThat(retrievedDestination)
            .isNotNull();
        assertThat(retrievedDestination.disabled)
            .isEqualTo(false);
        assertThat(retrievedDestination.s3Settings)
            .isNotNull();
        assertThat(retrievedDestination.s3Settings.bucketName)
            .isEqualTo("testS3Bucket-Users");
    });

    it("can put and get remote attachments configuration with Azure", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const azureSettings = new RemoteAttachmentsAzureSettings();
        azureSettings.storageContainer = "test-container";
        azureSettings.accountName = "teststorageaccount";
        azureSettings.accountKey = "test-account-key";
        destination.azureSettings = azureSettings;

        configuration.destinations["Azure-Users"] = destination;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(config)
            .isNotNull();
        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(1);

        const retrievedDestination = config.destinations["Azure-Users"];
        assertThat(retrievedDestination)
            .isNotNull();
        assertThat(retrievedDestination.disabled)
            .isEqualTo(false);
        assertThat(retrievedDestination.azureSettings)
            .isNotNull();
        assertThat(retrievedDestination.azureSettings.storageContainer)
            .isEqualTo("test-container");
        assertThat(retrievedDestination.azureSettings.accountName)
            .isEqualTo("teststorageaccount");
    });

    it("can put and get remote attachments configuration with case insensitive identifier", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "testS3Bucket-Users";
        s3Settings.awsAccessKey = "test-access-key";
        s3Settings.awsSecretKey = "test-secret-key";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-uSeRs"] = destination;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(1);

        const retrievedDestination = config.destinations["S3-uSeRs"];
        assertThat(retrievedDestination)
            .isNotNull();
        assertThat(retrievedDestination.s3Settings.bucketName)
            .isEqualTo("testS3Bucket-Users");
    });

    it("can update remote attachments configuration", async () => {
        // First configuration
        const config1 = new RemoteAttachmentsConfiguration();
        const destination1 = new RemoteAttachmentsDestinationConfiguration();
        destination1.disabled = false;

        const s3Settings1 = new RemoteAttachmentsS3Settings();
        s3Settings1.bucketName = "testS3Bucket-Users";
        s3Settings1.awsAccessKey = "test-access-key";
        s3Settings1.awsSecretKey = "test-secret-key";
        destination1.s3Settings = s3Settings1;

        config1.destinations["S3-Users"] = destination1;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(config1));

        let config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());
        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(1);

        // Second configuration - update
        const config2 = new RemoteAttachmentsConfiguration();
        const destination2 = new RemoteAttachmentsDestinationConfiguration();
        destination2.disabled = true;

        const s3Settings2 = new RemoteAttachmentsS3Settings();
        s3Settings2.bucketName = "testS3Bucket-Orders";
        s3Settings2.awsAccessKey = "test-access-key-2";
        s3Settings2.awsSecretKey = "test-secret-key-2";
        destination2.s3Settings = s3Settings2;

        config2.destinations["S3-Orders"] = destination2;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(config2));

        config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(1);

        const retrievedDestination = config.destinations["S3-Orders"];
        assertThat(retrievedDestination)
            .isNotNull();
        assertThat(retrievedDestination.disabled)
            .isEqualTo(true);
        assertThat(retrievedDestination.s3Settings.bucketName)
            .isEqualTo("testS3Bucket-Orders");
    });

    it("validates configuration requires exactly one uploader", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;
        // Neither S3 nor Azure configured

        configuration.destinations["Invalid-Destination"] = destination;

        try {
            await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));
        } catch (error) {
            assertThat(error.message)
                .contains("must be configured");
        }
    });

    it("validates configuration cannot have both S3 and Azure", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        destination.s3Settings = s3Settings;

        const azureSettings = new RemoteAttachmentsAzureSettings();
        azureSettings.storageContainer = "test-container";
        azureSettings.accountName = "testaccount";
        azureSettings.accountKey = "test-key";
        destination.azureSettings = azureSettings;

        configuration.destinations["Invalid-Both"] = destination;

        try {
            await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));
        } catch (error) {
            assertThat(error.message)
                .contains("Only one uploader");
        }
    });

    it("can configure multiple destinations", async () => {
        const configuration = new RemoteAttachmentsConfiguration();

        // S3 destination
        const s3Destination = new RemoteAttachmentsDestinationConfiguration();
        s3Destination.disabled = false;
        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "s3-bucket";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        s3Destination.s3Settings = s3Settings;

        // Azure destination
        const azureDestination = new RemoteAttachmentsDestinationConfiguration();
        azureDestination.disabled = false;
        const azureSettings = new RemoteAttachmentsAzureSettings();
        azureSettings.storageContainer = "azure-container";
        azureSettings.accountName = "azureaccount";
        azureSettings.accountKey = "azure-key";
        azureDestination.azureSettings = azureSettings;

        configuration.destinations["S3-Backup"] = s3Destination;
        configuration.destinations["Azure-Archive"] = azureDestination;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(2);
        assertThat(config.destinations["S3-Backup"])
            .isNotNull();
        assertThat(config.destinations["Azure-Archive"])
            .isNotNull();
    });

    it("can configure destination with remote folder name", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "testS3Bucket-Users";
        s3Settings.remoteFolderName = "production/attachments/2024";
        s3Settings.awsAccessKey = "test-access-key";
        s3Settings.awsSecretKey = "test-secret-key";
        s3Settings.awsRegionName = "us-east-1";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-WithFolder"] = destination;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        const retrievedDestination = config.destinations["S3-WithFolder"];
        assertThat(retrievedDestination.s3Settings.remoteFolderName)
            .isEqualTo("production/attachments/2024");
    });

    it("can configure with frequency, max items, and concurrent uploads", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-Config"] = destination;
        configuration.checkFrequencyInSec = 300;
        configuration.maxItemsToProcess = 1000;
        configuration.concurrentUploads = 5;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(config.checkFrequencyInSec)
            .isEqualTo(300);
        assertThat(config.maxItemsToProcess)
            .isEqualTo(1000);
        assertThat(config.concurrentUploads)
            .isEqualTo(5);
    });

    it("validates check frequency must be greater than zero", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-Test"] = destination;
        configuration.checkFrequencyInSec = 0; // Invalid

        try {
            await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));
        } catch (error) {
            assertThat(error.message)
                .contains("check frequency");
            assertThat(error.message)
                .contains("must be greater than 0");
        }
    });

    it("validates max items to process must be greater than zero", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-Test"] = destination;
        configuration.maxItemsToProcess = -1; // Invalid

        try {
            await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));
        } catch (error) {
            assertThat(error.message)
                .contains("Max items to process");
            assertThat(error.message)
                .contains("must be greater than 0");
        }
    });

    it("validates concurrent uploads must be greater than zero", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        destination.s3Settings = s3Settings;

        configuration.destinations["S3-Test"] = destination;
        configuration.concurrentUploads = 0; // Invalid

        try {
            await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));
        } catch (error) {
            assertThat(error.message)
                .contains("Concurrent attachments uploads");
            assertThat(error.message)
                .contains("must be greater than 0");
        }
    });

    it("can configure destination with lowercase key", async () => {
        const configuration = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.disabled = false;

        const s3Settings = new RemoteAttachmentsS3Settings();
        s3Settings.bucketName = "test-bucket-lowercase";
        s3Settings.awsAccessKey = "test-key";
        s3Settings.awsSecretKey = "test-secret";
        s3Settings.awsRegionName = "eu-west-1";
        destination.s3Settings = s3Settings;

        configuration.destinations["s3-backup"] = destination;

        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(configuration));

        const config = await store.maintenance.send(new GetRemoteAttachmentsConfigurationOperation());

        assertThat(Object.keys(config.destinations).length)
            .isEqualTo(1);

        const retrievedDestination = config.destinations["s3-backup"];
        assertThat(retrievedDestination)
            .isNotNull();
        assertThat(retrievedDestination.disabled)
            .isEqualTo(false);
        assertThat(retrievedDestination.s3Settings)
            .isNotNull();
        assertThat(retrievedDestination.s3Settings.bucketName)
            .isEqualTo("test-bucket-lowercase");
        assertThat(retrievedDestination.s3Settings.awsRegionName)
            .isEqualTo("eu-west-1");
    });
});
