import { ClusterTestContext, RavenTestContext } from "../../Utils/TestUtil";
import { DocumentStore } from "../../../src/Documents/DocumentStore";
import { DocumentConventions } from "../../../src/Documents/Conventions/DocumentConventions";
import { ServerNode } from "../../../src/Http/ServerNode";
import { Topology } from "../../../src/Http/Topology";
import { GetDatabaseTopologyCommand } from "../../../src/ServerWide/Commands/GetDatabaseTopologyCommand";
import { delay } from "../../../src/Utility/PromiseUtil";
import { DocumentSession } from "../../../src/Documents/Session/DocumentSession";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { RequestExecutor } from "../../../src/Http/RequestExecutor";
import { GetStatisticsOperation } from "../../../src/Documents/Operations/GetStatisticsOperation";
import { SessionInfo } from "../../../src/Documents/Session/IDocumentSession";
import { UpdateTopologyParameters } from "../../../src/Http/UpdateTopologyParameters";

(RavenTestContext.isPullRequest ? describe.skip : describe)("ClusterModesForRequestExecutorTest", function () {

    let testContext: ClusterTestContext;

    beforeEach(async function () {
        testContext = new ClusterTestContext();
    });

    afterEach(async () => testContext.dispose());

    it("round_robin_load_balancing_should_work", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {

            const initialLeader = cluster.getInitialLeader();
            const followers = cluster.nodes
                .filter(x => !x.leader);

            const conventionsForLoadBalancing = new DocumentConventions();
            conventionsForLoadBalancing.readBalanceBehavior = "RoundRobin";

            const databaseName = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName
            }, numberOfNodes, cluster.getInitialLeader().url);

            let leaderStore: DocumentStore;
            try {
                leaderStore = new DocumentStore(cluster.getInitialLeader().url, databaseName);
                leaderStore.conventions = conventionsForLoadBalancing;

                let follower1: DocumentStore;
                try {
                    follower1 = new DocumentStore(followers[0].url, databaseName);
                    follower1.conventions = conventionsForLoadBalancing;

                    let follower2: DocumentStore;

                    try {
                        follower2 = new DocumentStore(followers[1].url, databaseName);
                        follower2.conventions = conventionsForLoadBalancing;

                        leaderStore.initialize();
                        follower1.initialize();
                        follower2.initialize();

                        const leaderRequestExecutor = leaderStore.getRequestExecutor();

                        //make sure we have updated topology --> more deterministic test
                        const serverNode = new ServerNode({
                            clusterTag: "A",
                            database: databaseName,
                            url: initialLeader.url
                        });

                        const updateTopologyParameters = new UpdateTopologyParameters(serverNode);
                        updateTopologyParameters.timeoutInMs = 5000;
                        updateTopologyParameters.forceUpdate = true;
                        await leaderRequestExecutor.updateTopology(updateTopologyParameters);

                        //wait until all nodes in database cluster are members (and not promotables)
                        //GetDatabaseTopologyCommand -> does not retrieve promotables

                        let topology = new Topology();

                        while (!topology.nodes || topology.nodes.length !== 3) {
                            const topologyGetCommand = new GetDatabaseTopologyCommand();
                            await leaderRequestExecutor.execute(topologyGetCommand);

                            topology = topologyGetCommand.result;
                            await delay(50);
                        }

                        {
                            const session = leaderStore.openSession();

                            const user1 = new User();
                            user1.name = "John Dow";
                            await session.store(user1);

                            const user2 = new User();
                            user2.name = "Jack Dow";
                            await session.store(user2);

                            const user3 = new User();
                            user3.name = "Jane Dow";
                            await session.store(user3);

                            const marker = new User();
                            marker.name = "FooBar";
                            await session.store(marker, "marker");

                            await session.saveChanges();

                            await testContext.waitForDocumentInCluster(User, session as DocumentSession,
                                "marker", d => true, 10_000);
                        }

                        const usedUrls: String[] = [];

                        for (let i = 0; i < 3; i++) {
                            const session = leaderStore.openSession();
                            await session.query(User)
                                .whereStartsWith("name", "Ja")
                                .all();

                            const currentNode = await session.advanced.getCurrentSessionNode();
                            usedUrls.push(currentNode.url.toLocaleLowerCase());
                        }

                        assertThat(usedUrls)
                            .hasSize(3);
                    } finally {
                        follower2.dispose();
                    }
                } finally {
                    follower1.dispose();
                }
            } finally {
                leaderStore.dispose();
            }

        } finally {
            cluster.dispose();
        }
    });

    it("round_robin_load_balancing_with_failing_node_should_work", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {

            const initialLeader = cluster.getInitialLeader();
            const followers = cluster.nodes
                .filter(x => !x.leader);

            const conventionsForLoadBalancing = new DocumentConventions();
            conventionsForLoadBalancing.readBalanceBehavior = "RoundRobin";

            const databaseName = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName
            }, numberOfNodes, cluster.getInitialLeader().url);

            let leaderStore: DocumentStore;
            try {
                leaderStore = new DocumentStore(cluster.getInitialLeader().url, databaseName);
                leaderStore.conventions = conventionsForLoadBalancing;

                let follower1: DocumentStore;
                try {
                    follower1 = new DocumentStore(followers[0].url, databaseName);
                    follower1.conventions = conventionsForLoadBalancing;

                    let follower2: DocumentStore;

                    try {
                        follower2 = new DocumentStore(followers[1].url, databaseName);
                        follower2.conventions = conventionsForLoadBalancing;

                        leaderStore.initialize();
                        follower1.initialize();
                        follower2.initialize();

                        const leaderRequestExecutor = leaderStore.getRequestExecutor();

                        //make sure we have updated topology --> more deterministic test
                        const serverNode = new ServerNode({
                            clusterTag: "A",
                            database: databaseName,
                            url: initialLeader.url
                        });

                        const updateTopologyParameters = new UpdateTopologyParameters(serverNode);
                        updateTopologyParameters.timeoutInMs = 5000;
                        updateTopologyParameters.forceUpdate = true;

                        await leaderRequestExecutor.updateTopology(updateTopologyParameters);

                        //wait until all nodes in database cluster are members (and not promotables)
                        //GetDatabaseTopologyCommand -> does not retrieve promotables

                        let topology = new Topology();

                        while (!topology.nodes || topology.nodes.length !== 3) {
                            const topologyGetCommand = new GetDatabaseTopologyCommand();
                            await leaderRequestExecutor.execute(topologyGetCommand);

                            topology = topologyGetCommand.result;
                            await delay(50);
                        }

                        {
                            const session = leaderStore.openSession();

                            const user1 = new User();
                            user1.name = "John Dow";
                            await session.store(user1);

                            const user2 = new User();
                            user2.name = "Jack Dow";
                            await session.store(user2);

                            const user3 = new User();
                            user3.name = "Jane Dow";
                            await session.store(user3);

                            const marker = new User();
                            marker.name = "FooBar";
                            await session.store(marker, "marker");

                            await session.saveChanges();

                            await testContext.waitForDocumentInCluster(User, session as DocumentSession,
                                "marker", d => true, 10_000);
                        }

                        const requestExecutor = RequestExecutor.create(follower1.urls, databaseName, {
                            documentConventions: follower1.conventions
                        });

                        try {
                            do {
                                await delay(100);
                            } while (!requestExecutor.getTopologyNodes());

                            await cluster.disposeServer(initialLeader.nodeTag);

                            const failedRequests: string[] = [];

                            requestExecutor.on("failedRequest", event => {
                                failedRequests.push(event.url);
                            });

                            for (let sessionId = 0; sessionId < 5; sessionId++) {
                                requestExecutor.cache.clear(); // make sure we do not use request cache
                                const command = new GetStatisticsOperation().getCommand(new DocumentConventions());
                                await requestExecutor.execute(command, new SessionInfo(sessionId));
                            }

                        } finally {
                            requestExecutor.dispose();
                        }
                    } finally {
                        follower2.dispose();
                    }
                } finally {
                    follower1.dispose();
                }
            } finally {
                leaderStore.dispose();
            }

        } finally {
            cluster.dispose();
        }
    });

    it("RavenDB_7992", async () => {
        //here we test that when choosing Fastest-Node as the ReadBalanceBehavior,
        //we can execute commands that use a context, without it leading to a race condition

        const cluster = await testContext.createRaftCluster(3);
        try {
            const initialLeader = cluster.getInitialLeader();

            const conventionsForLoadBalancing = new DocumentConventions();
            conventionsForLoadBalancing.readBalanceBehavior = "FastestNode";

            const databaseName = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName
            }, numberOfNodes, cluster.getInitialLeader().url);

            {
                const leaderStore = new DocumentStore(initialLeader.url, databaseName);
                try {
                    leaderStore.conventions = conventionsForLoadBalancing;
                    leaderStore.initialize();

                    {
                        const session = leaderStore.openSession();
                        const user = new User();
                        user.name = "Jon Snow";
                        await session.store(user);
                        await session.saveChanges();
                    }

                    {
                        const session = leaderStore.openSession();
                        await session.query<User>(User)
                            .whereStartsWith("name", "Jo");
                    }
                } finally {
                    leaderStore.dispose();
                }
            }
        } finally {
            cluster.dispose();
        }
    });
});
