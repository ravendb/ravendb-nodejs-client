import assert from "node:assert";
import { DatabaseRecord, DocumentStore, ObjectUtil } from "../../../src/index.js";
import { ClusterTestContext, RavenTestContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RDBC_538Test", function () {

    let testContext: ClusterTestContext;

    beforeEach(async function () {
        testContext = new ClusterTestContext();
    });

    afterEach(async () => testContext.dispose());

    it("canHandleSubscriptionRedirect", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const leader = cluster.getInitialLeader();

            const databaseName = testContext.getDatabaseName();

            // create database on single node

            const databaseRecord: DatabaseRecord = {
                databaseName
            };

            await cluster.createDatabase(databaseRecord, 3, cluster.getInitialLeader().url);

            let id: string;

            {
                // save document
                const store = new DocumentStore(leader.url, databaseName);
                try {
                    store.initialize();

                    {
                        const session = store.openSession();
                        const user1 = new User();
                        user1.age = 31;
                        await session.store(user1, "users/1");
                        await session.saveChanges();
                    }

                    id = await store.subscriptions.create(User);
                } finally {
                    store.dispose();
                }
            }


            // now open store on leader
            {
                const store = new DocumentStore(leader.url, databaseName);
                try {
                    store.initialize();

                    const subscription = store.subscriptions.getSubscriptionWorker({
                        documentType: User,
                        subscriptionName: id
                    });

                    let key: string;

                    await new Promise<void>((resolve, reject) => {
                        subscription.on("error", reject);
                        subscription.on("batch", (batch, callback) => {
                            key = batch.items[0].id;
                            callback();
                            resolve();
                        })
                    })

                    assertThat(key)
                        .isNotNull()
                        .isEqualTo("users/1");

                    await store.subscriptions.delete(id);

                } finally {
                    store.dispose();
                }
            }
        } finally {
            cluster.dispose();
        }
    });

    it("redirectsSubscriptionToNodeNamedByServer", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const leader = cluster.getInitialLeader();
            const databaseName = testContext.getDatabaseName();

            await cluster.createDatabase({ databaseName }, 3, leader.url);

            await assertSubscriptionFollowsRedirect(leader.url, databaseName, false);
            await assertSubscriptionFollowsRedirect(leader.url, databaseName, true);
        } finally {
            cluster.dispose();
        }
    });
});

async function assertSubscriptionFollowsRedirect(url: string, databaseName: string, camelCaseServerFields: boolean) {
    const store = new DocumentStore(url, databaseName);
    if (camelCaseServerFields) {
        store.conventions.serverToLocalFieldNameConverter = ObjectUtil.camel;
        store.conventions.localToServerFieldNameConverter = ObjectUtil.pascal;
    }

    try {
        store.initialize();

        const session = store.openSession();
        await session.store(new User(), "users/1");
        await session.saveChanges();

        const requestExecutor = store.getRequestExecutor();
        const preferredNode = (await requestExecutor.getPreferredNode()).currentNode.clusterTag;
        const mentorNode = requestExecutor.getTopologyNodes()
            .find(x => x.clusterTag !== preferredNode)
            .clusterTag;

        const subscriptionName = await store.subscriptions.create({ documentType: User, mentorNode });

        const worker = store.subscriptions.getSubscriptionWorker({
            documentType: User,
            subscriptionName,
            timeToWaitBeforeConnectionRetry: 100
        });

        try {
            const retryErrors: Error[] = [];
            worker.on("connectionRetry", error => retryErrors.push(error));

            await new Promise<void>((resolve, reject) => {
                worker.on("error", reject);
                worker.on("batch", (batch, callback) => {
                    callback();
                    resolve();
                });
            });

            assertThat(retryErrors).hasSize(1);

            const [redirect] = retryErrors;
            assertThat(redirect.name).isEqualTo("SubscriptionDoesNotBelongToNodeException");
            assertThat((redirect as any).appropriateNode).isEqualTo(mentorNode);
            assertThat(redirect.message)
                .contains("current node '" + preferredNode + "'")
                .contains("redirected to " + mentorNode);
            assert.match(redirect.message, new RegExp("^" + mentorNode + ":", "m"));

            assertThat(worker.currentNodeTag).isEqualTo(mentorNode);
        } finally {
            worker.dispose();
        }
    } finally {
        store.dispose();
    }
}
