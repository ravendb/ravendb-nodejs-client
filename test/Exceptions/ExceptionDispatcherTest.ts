import assert from "node:assert";
import { ExceptionDispatcher, RavenErrorType } from "../../src/Exceptions/index.js";
import { HttpResponse } from "../../src/Primitives/Http.js";

describe("ExceptionDispatcherTest", function () {

    function dispatch(status: number, payload: Record<string, unknown>): Error & Record<string, any> {
        try {
            ExceptionDispatcher.throwException({ status } as HttpResponse, JSON.stringify({
                Url: "/databases/test/docs",
                Message: "message",
                Error: "error",
                ...payload
            }));
        } catch (error) {
            return error;
        }

        assert.fail("throwException did not throw");
    }

    const serverTypes: [string, RavenErrorType][] = [
        ["Raven.Client.Exceptions.Commercial.LicenseLimitException", "LicenseLimitException"],
        ["Raven.Client.Exceptions.Commercial.PortInUseException", "PortInUseException"],
        ["Raven.Client.Exceptions.Database.BackupAlreadyRunningException", "BackupAlreadyRunningException"],
        ["Raven.Client.Exceptions.Database.DatabaseNotRelevantException", "DatabaseNotRelevantException"],
        ["Raven.Client.Exceptions.SchemaValidation.SchemaValidationException", "SchemaValidationException"],
        [
            "Raven.Client.Exceptions.Security.InsufficientTransportLayerProtectionException",
            "InsufficientTransportLayerProtectionException"
        ],
        ["Raven.Client.Exceptions.Sharding.ExecutionForShardException", "ExecutionForShardException"],
        ["Raven.Client.Exceptions.Documents.Indexes.IndexAlreadyExistException", "IndexAlreadyExistException"],
        ["Raven.Client.Exceptions.Documents.Indexes.IndexCreationException", "IndexCreationException"],
        ["Raven.Client.Exceptions.Documents.Indexes.IndexDeletionException", "IndexDeletionException"],
        ["Raven.Client.Exceptions.Documents.Revisions.RevisionsDisabledException", "RevisionsDisabledException"],
        ["Raven.Client.Exceptions.LegacyReplicationViolationException", "LegacyReplicationViolationException"]
    ];

    for (const [serverType, expectedName] of serverTypes) {
        it(`names the error ${expectedName}`, () => {
            const error = dispatch(500, { Type: serverType });

            assert.strictEqual(error.name, expectedName);
            assert.strictEqual(error.message, "error");
        });
    }

    it("carries the limit type of a license limit", () => {
        const error = dispatch(500, {
            Type: "Raven.Client.Exceptions.Commercial.LicenseLimitException",
            LimitType: "DocumentsCompression"
        });

        assert.strictEqual(error.limitType, "DocumentsCompression");
    });

    it("leaves the limit type unset when the server does not send one", () => {
        const error = dispatch(500, { Type: "Raven.Client.Exceptions.Commercial.LicenseLimitException" });

        assert.strictEqual(error.limitType, undefined);
    });

    it("marks a timeout the server asked to fail immediately", () => {
        const error = dispatch(500, {
            Type: "Raven.Client.Exceptions.RavenTimeoutException",
            FailImmediately: true
        });

        assert.strictEqual(error.name, "RavenTimeoutException");
        assert.strictEqual(error.failImmediately, true);
    });

    it("does not mark an ordinary timeout to fail immediately", () => {
        const error = dispatch(500, { Type: "Raven.Client.Exceptions.RavenTimeoutException" });

        assert.strictEqual(error.failImmediately, false);
    });
});
