import { DocumentStore, IDocumentStore } from "../../../src";
import { ClusterTestContext, RavenTestContext } from "../../Utils/TestUtil";
import { URL } from "url";
import { assertThat } from "../../Utils/AssertExtensions";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB_18364", function () {

    let testContext: ClusterTestContext;

    beforeEach(async function () {
        testContext = new ClusterTestContext();
    });

    afterEach(async () => testContext.dispose());

    it("lazilyLoad_WhenCachedResultAndFailover_ShouldNotReturnReturnNull", async () => {
        const cluster = await testContext.createRaftCluster(2);

        try {
            const databaseName = testContext.getDatabaseName();

            await cluster.createDatabase(databaseName, 2, cluster.getInitialLeader().url);

            let store: IDocumentStore;
            try {
                store = new DocumentStore(cluster.getInitialLeader().url, databaseName);
                store.initialize();

                const id = "testObject/0";

                {
                    const session = store.openSession();
                    const o = new TestObj();
                    o.largeContent = "abcd";
                    await session.store(o, id);
                    session.advanced.waitForReplicationAfterSaveChanges({
                       replicas: 1
                    });
                    await session.saveChanges();
                }

                let firstNodeUrl: string;

                {
                    const session = store.openSession();
                    session.advanced.requestExecutor.on("succeedRequest", event => {
                        firstNodeUrl = "http://" + new URL(event.url).host;
                    });

                    await session.load(id, TestObj);
                }

                const firstServer = cluster.nodes.find(x => x.url === firstNodeUrl);
                await cluster.disposeServer(firstServer.nodeTag);

                {
                    const session = store.openSession();
                    const lazilyLoaded0 = session.advanced.lazily.load(id, TestObj);
                    const loaded0 = await lazilyLoaded0.getValue();
                    assertThat(loaded0)
                        .isNotNull();
                }

                {
                    const session = store.openSession();
                    const lazilyLoaded0 = session.advanced.lazily.load(id, TestObj);
                    const loaded0 = await lazilyLoaded0.getValue();
                    assertThat(loaded0)
                        .isNotNull();
                }
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    });
});


class TestObj {
    id: string;
    largeContent: string;
}
