import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import {
    ConfigureRemoteAttachmentsOperation,
    DateUtil,
    DocumentConventions,
    GetAttachmentOperation,
    IDocumentStore,
    PutAttachmentCommand,
    PutAttachmentOperation,
    RemoteAttachmentParameters,
    RemoteAttachmentsConfiguration,
    RemoteAttachmentsDestinationConfiguration,
    RemoteAttachmentsS3Settings,
    ServerNode,
    StoreAttachmentParameters
} from "../../../src/index.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";
import { Buffer } from "node:buffer";
import { addHours, format } from "date-fns";

describe("PutAttachmentCommand remote parameters", function () {

    const node = { url: "http://localhost:8080", database: "db" } as ServerNode;

    it("sends remoteAt and remoteIdentifier in the url", () => {
        const at = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
        const command = new PutAttachmentCommand("users/1", "a.png", Buffer.from([1]), null, null,
            new RemoteAttachmentParameters("S3 Test&1", at));

        const uri = new URL(command.createRequest(node).uri);

        assertThat(uri.searchParams.get("remoteAt"))
            .isEqualTo(DateUtil.utc.stringify(at));
        assertThat(uri.searchParams.get("remoteIdentifier"))
            .isEqualTo("S3 Test&1");
    });

    it("does not send remote parameters when not set", () => {
        const command = new PutAttachmentCommand("users/1", "a.png", Buffer.from([1]), null, null);

        const uri = new URL(command.createRequest(node).uri);

        assertThat(uri.searchParams.has("remoteAt"))
            .isFalse();
        assertThat(uri.searchParams.has("remoteIdentifier"))
            .isFalse();
    });

    it("leaves remoteAt out when upload time is not set", () => {
        const command = new PutAttachmentCommand("users/1", "a.png", Buffer.from([1]), null, null,
            new RemoteAttachmentParameters("S3"));

        const uri = new URL(command.createRequest(node).uri);

        assertThat(uri.searchParams.has("remoteAt"))
            .isFalse();
        assertThat(uri.searchParams.get("remoteIdentifier"))
            .isEqualTo("S3");
    });

    it("passes remote parameters from StoreAttachmentParameters to the command", () => {
        const at = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
        const operation = new PutAttachmentOperation("users/1",
            new StoreAttachmentParameters("a.png", Buffer.from([1]), "image/png", null, new RemoteAttachmentParameters("S3", at)));

        const command = operation.getCommand(null, DocumentConventions.defaultConventions, null) as PutAttachmentCommand;
        const uri = new URL(command.createRequest(node).uri);

        assertThat(uri.searchParams.get("name"))
            .isEqualTo("a.png");
        assertThat(uri.searchParams.get("contentType"))
            .isEqualTo("image/png");
        assertThat(uri.searchParams.get("remoteAt"))
            .isEqualTo(DateUtil.utc.stringify(at));
        assertThat(uri.searchParams.get("remoteIdentifier"))
            .isEqualTo("S3");
    });
});

((RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest) ? describe : describe.skip)("PutAttachmentOperation with remote parameters", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function setupRemoteAttachmentsConfig(identifier: string): Promise<void> {
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
    }

    async function storeUser(id: string) {
        const session = store.openSession();
        await session.store({ name: "John" }, id);
        await session.saveChanges();
    }

    async function assertRemoteParameters(id: string, name: string, identifier: string, at: Date) {
        const attachment = await store.operations.send(new GetAttachmentOperation(id, name, "Document", null));
        try {
            assertThat(attachment.details.remoteParameters.identifier)
                .isEqualTo(identifier);
            assertThat(format(attachment.details.remoteParameters.at, DateUtil.DEFAULT_DATE_TZ_FORMAT))
                .isEqualTo(format(at, DateUtil.DEFAULT_DATE_TZ_FORMAT));
            assertThat(attachment.details.remoteParameters.flags)
                .isEqualTo("None");
        } finally {
            attachment.dispose();
        }
    }

    it("can put attachment with remote parameters", async () => {
        const identifier = "S3-Test";
        await setupRemoteAttachmentsConfig(identifier);
        await storeUser("users/1");

        const at = addHours(new Date(), 1);
        const details = await store.operations.send(new PutAttachmentOperation("users/1", "profile.png",
            Buffer.from([1, 2, 3]), "image/png", null, new RemoteAttachmentParameters(identifier, at)));

        assertThat(details.name)
            .isEqualTo("profile.png");

        await assertRemoteParameters("users/1", "profile.png", identifier, at);
    });

    it("can put attachment with StoreAttachmentParameters", async () => {
        const identifier = "S3-Test";
        await setupRemoteAttachmentsConfig(identifier);
        await storeUser("users/1");

        const at = addHours(new Date(), 1);
        await store.operations.send(new PutAttachmentOperation("users/1", new StoreAttachmentParameters(
            "doc.pdf", Buffer.from([4, 5, 6]), "application/pdf", null, new RemoteAttachmentParameters(identifier, at))));

        await assertRemoteParameters("users/1", "doc.pdf", identifier, at);
    });

    it("rejects remote parameters without upload time", async () => {
        const identifier = "S3-Test";
        await setupRemoteAttachmentsConfig(identifier);
        await storeUser("users/1");

        await assertThrows(() => store.operations.send(new PutAttachmentOperation("users/1", "no-at.bin",
            Buffer.from([1]), null, null, new RemoteAttachmentParameters(identifier))), err => {
            assertThat(err.message)
                .contains("Both 'remoteAt' and 'remoteIdentifier' must be specified together");
        });
    });

    it("put attachment without remote parameters has none", async () => {
        await storeUser("users/1");

        await store.operations.send(new PutAttachmentOperation("users/1", "local.bin", Buffer.from([7])));

        const attachment = await store.operations.send(new GetAttachmentOperation("users/1", "local.bin", "Document", null));
        try {
            assertThat(attachment.details.remoteParameters)
                .isUndefined();
        } finally {
            attachment.dispose();
        }
    });
});
