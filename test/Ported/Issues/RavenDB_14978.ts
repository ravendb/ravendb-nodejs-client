import { ClusterTestContext, RavenTestContext, } from "../../Utils/TestUtil";
import { DocumentStore } from "../../../src";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB_14978", function () {

    let testContext: ClusterTestContext;

    beforeEach(async function () {
        testContext = new ClusterTestContext();
    });

    afterEach(async () => testContext.dispose());

    it("can_setup_write_load_balancing", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const databaseName = testContext.getDatabaseName();

            let context: string = "users/1";

            await cluster.createDatabase(databaseName, 3, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, databaseName);
            try {
                store.conventions.readBalanceBehavior = "RoundRobin";
                store.conventions.loadBalanceBehavior = "UseSessionContext";
                store.conventions.loadBalancerPerSessionContextSelector = () => context;
                store.initialize();

                {
                    const s0 = store.openSession();
                    await s0.load<User>("test/1", User);
                }

                let s1Ctx = -1;

                {
                    const s1 = store.openSession();
                    const sessionInfo = s1.advanced.sessionInfo;
                    s1Ctx = sessionInfo.getSessionId();
                }

                let s2Ctx = -1;

                {
                    const s2 = store.openSession();
                    const sessionInfo = s2.advanced.sessionInfo;
                    s2Ctx = sessionInfo.getSessionId();
                }

                assertThat(s2Ctx)
                    .isEqualTo(s1Ctx);

                context = "users/2";

                let s3Ctx = -1;

                {
                    const s3 = store.openSession();
                    const sessionInfo = s3.advanced.sessionInfo;
                    s3Ctx = sessionInfo.getSessionId();
                }

                assertThat(s3Ctx)
                    .isNotEqualTo(s2Ctx);

                const s4Ctx = -1;

                {
                    const s4 = store.openSession();
                    s4.advanced.sessionInfo.setContext("monkey");

                    const sessionInfo = s4.advanced.sessionInfo;
                    s3Ctx = sessionInfo.getSessionId();
                }

                assertThat(s4Ctx)
                    .isNotEqualTo(s3Ctx);

            } finally {
                store.dispose();
            }

        } finally {
            cluster.dispose();
        }
    });
});
