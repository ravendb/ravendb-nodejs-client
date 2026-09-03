import { Readable } from "node:stream";
import { assertThat } from "../../Utils/AssertExtensions.js";
import {
    ConfigureRemoteAttachmentsOperation,
    DocumentConventions,
    GetRemoteAttachmentsConfigurationOperation,
    PeriodicBackupConfiguration,
    RemoteAttachmentsConfiguration,
    RemoteAttachmentsDestinationConfiguration,
    RemoteAttachmentsS3Settings,
    ServerNode,
    UpdatePeriodicBackupOperation
} from "../../../src/index.js";

const node = new ServerNode({ url: "http://localhost:8080", database: "db" });

// The command-payload serializer drops undefined, so an unset flag omits the key (the
// server defaults false) and an explicit true/false is written under the PascalCase key.
describe("S3ChecksumValidation", function () {
    it("serializes the flag true and false through the periodic-backup payload", () => {
        assertPeriodicBackupFlag(true, true);
        assertPeriodicBackupFlag(false, false);
    });

    it("omits the flag when unset in the periodic-backup payload", () => {
        const settings = periodicBackupPayload(undefined).S3Settings;
        assertThat(settings.BucketName).isEqualTo("bucket-a");
        assertThat("DisableChecksumValidation" in settings).isFalse();
    });

    it("carries the flag under Destinations.<name>.S3Settings in the remote-attachments payload", () => {
        const configuration = remoteAttachmentsConfiguration(true);
        const command = new ConfigureRemoteAttachmentsOperation(configuration)
            .getCommand(new DocumentConventions());
        const body = JSON.parse(command.createRequest(node).body as string);

        const settings = body.Destinations["S3-Users"].S3Settings;
        assertThat(settings.BucketName).isEqualTo("bucket-a");
        assertThat(settings.DisableChecksumValidation).isEqualTo(true);
    });

    it("revives disableChecksumValidation from the remote-attachments configuration wire", async () => {
        const command = new GetRemoteAttachmentsConfigurationOperation()
            .getCommand(new DocumentConventions());
        const body = JSON.stringify({
            Destinations: {
                "S3-Users": {
                    Disabled: false,
                    S3Settings: {
                        BucketName: "bucket-a",
                        AwsAccessKey: "key",
                        AwsSecretKey: "secret",
                        DisableChecksumValidation: true
                    }
                }
            },
            Disabled: false
        });
        await command.setResponseAsync(Readable.from([body]), false);

        const settings = command.result.destinations["S3-Users"].s3Settings;
        assertThat(settings.disableChecksumValidation).isEqualTo(true);
        assertThat(settings.bucketName).isEqualTo("bucket-a");
    });
});

function assertPeriodicBackupFlag(flag: boolean, expected: boolean): void {
    const settings = periodicBackupPayload(flag).S3Settings;
    assertThat(settings.BucketName).isEqualTo("bucket-a");
    assertThat(settings.DisableChecksumValidation).isEqualTo(expected);
}

function periodicBackupPayload(flag: boolean | undefined): any {
    const s3Settings: {
        bucketName: string;
        customServerUrl: string;
        forcePathStyle: boolean;
        disableChecksumValidation?: boolean;
    } = {
        bucketName: "bucket-a",
        customServerUrl: "http://localhost:9000",
        forcePathStyle: false
    };
    if (flag !== undefined) {
        s3Settings.disableChecksumValidation = flag;
    }

    const configuration: PeriodicBackupConfiguration = {
        backupType: "Backup",
        name: "s3-backup",
        s3Settings
    };
    const command = new UpdatePeriodicBackupOperation(configuration)
        .getCommand(new DocumentConventions());
    return JSON.parse(command.createRequest(node).body as string);
}

function remoteAttachmentsConfiguration(flag: boolean): RemoteAttachmentsConfiguration {
    const configuration = new RemoteAttachmentsConfiguration();
    const destination = new RemoteAttachmentsDestinationConfiguration();
    destination.disabled = false;
    const s3Settings = new RemoteAttachmentsS3Settings();
    s3Settings.bucketName = "bucket-a";
    s3Settings.awsAccessKey = "key";
    s3Settings.awsSecretKey = "secret";
    s3Settings.disableChecksumValidation = flag;
    destination.s3Settings = s3Settings;
    configuration.destinations["S3-Users"] = destination;
    return configuration;
}
