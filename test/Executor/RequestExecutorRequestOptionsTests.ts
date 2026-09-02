import { RequestExecutor } from "../../src/Http/RequestExecutor.js";
import { DocumentConventions } from "../../src/Documents/Conventions/DocumentConventions.js";
import { GetNextOperationIdCommand } from "../../src/Documents/Commands/GetNextOperationIdCommand.js";
import { HttpRequestParameters } from "../../src/Primitives/Http.js";
import { TypeUtil } from "../../src/Utility/TypeUtil.js";
import assert from "node:assert";

function createExecutor(): RequestExecutor {
    return RequestExecutor.createForSingleNodeWithoutConfigurationUpdates(
        "https://localhost:8080", "db", { documentConventions: new DocumentConventions() });
}

function createRequest(executor: RequestExecutor): HttpRequestParameters {
    const node = executor.getTopologyNodes()[0];
    return (executor as any)._createRequest(node, new GetNextOperationIdCommand(), TypeUtil.NOOP);
}

describe("RequestExecutor default request options", function () {

    it("keeps customHttpRequestOptions per executor - they must not leak across stores", function () {
        const first = createExecutor();
        const second = createExecutor();
        let third: RequestExecutor;

        try {
            first.customHttpRequestOptions = { keepalive: true };
            // an executor created after the options were set must not inherit them either
            third = createExecutor();

            assert.strictEqual(createRequest(first).keepalive, true);
            assert.strictEqual(createRequest(second).keepalive, undefined);
            assert.strictEqual(createRequest(third).keepalive, undefined);
        } finally {
            first.dispose();
            second.dispose();
            third?.dispose();
        }
    });
});
