import { DatabaseRecord, DocumentStore } from "../../../src";
import { ClusterTestContext, RavenTestContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

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

                    await new Promise((resolve, reject) => {
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
});
