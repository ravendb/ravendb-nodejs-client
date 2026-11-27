import { IDocumentStore, RavenCommand, ServerNode, SingleNodeBatchCommand } from "../../../src/index.js";
import { ClusterWideBatchCommand } from "../../../src/Documents/Commands/Batches/ClusterWideBatchCommand.js";
import { HttpRequestParameters } from "../../../src/Primitives/Http.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_13890", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("create request", async () => {
        const requestExecutor = store.getRequestExecutor();
        const dummy = new ServerNode({
            clusterTag: "A",
            database: "dummy",
            serverRole: "Member",
            url: "http://dummy:1234"
        });

        const createRequestUri = (command: RavenCommand<unknown>): string =>
            ((requestExecutor as any)._createRequest(dummy, command, () => {}) as HttpRequestParameters).uri;

        assertThat(createRequestUri(new SingleNodeBatchCommand(store.conventions, [])).includes("raft")).isFalse();
        assertThat(createRequestUri(new ClusterWideBatchCommand(store.conventions, []))).contains("raft");
    });
});
