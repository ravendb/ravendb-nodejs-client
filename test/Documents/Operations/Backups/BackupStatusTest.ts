import assert from "node:assert";
import { JsonSerializer } from "../../../../src/Mapping/Json/Serializer.js";
import type { BackupStatus } from "../../../../src/Documents/Operations/Backups/BackupStatus.js";
import type { PeriodicBackupStatus } from "../../../../src/Documents/Operations/Backups/PeriodicBackupStatus.js";

describe("BackupStatus field naming", function () {

    const serializer = JsonSerializer.getDefaultForCommandPayload();

    describe("incrementalBackupDurationInMs", function () {
        it("should have correctly named field that matches server wire format", function () {
            const serverJson = '{"FullBackupDurationInMs": 500, "IncrementalBackupDurationInMs": 1500}';
            const result = serializer.deserialize<BackupStatus>(serverJson);

            // Access via the typed interface field — this verifies the interface
            // field name matches the camelCase form of the server's PascalCase key
            assert.strictEqual(result.incrementalBackupDurationInMs, 1500,
                "BackupStatus.incrementalBackupDurationInMs should map from server's IncrementalBackupDurationInMs");
        });
    });

    describe("UploadToGoogleCloud", function () {
        it("should have correctly named field that matches server wire format", function () {
            const serverJson = '{"UploadToGoogleCloud": {"Skipped": true}, "UploadToS3": null}';
            const result = serializer.deserialize<PeriodicBackupStatus>(serverJson);

            // Access via the typed interface field — verifies the field name is
            // uploadToGoogleCloud (not updateToGoogleCloud)
            assert.ok(result.uploadToGoogleCloud, "Expected uploadToGoogleCloud to exist");
            assert.strictEqual(result.uploadToGoogleCloud.skipped, true);
        });
    });
});
