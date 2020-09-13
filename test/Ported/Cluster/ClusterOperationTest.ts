import { ClusterTestContext } from "../../Utils/TestUtil";
import { DocumentStore } from "../../../src/Documents/DocumentStore";
import { NextIdentityForOperation } from "../../../src/Documents/Operations/Identities/NextIdentityForOperation";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { Stopwatch } from "../../../src/Utility/Stopwatch";
import { DatabaseTopology } from "../../../src/ServerWide/Operations/index";
import { DatabaseRecord } from "../../../src/ServerWide/index";
import { DocumentChange } from "../../../src/Documents/Changes/DocumentChange";
import { User } from "../../Assets/Entities";
import { GetDatabaseTopologyCommand } from "../../../src/ServerWide/Commands/GetDatabaseTopologyCommand";
import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { GetDatabaseRecordOperation } from "../../../src/ServerWide/Operations/GetDatabaseRecordOperation";
import { ReorderDatabaseMembersOperation } from "../../../src/ServerWide/Operations/ReorderDatabaseMembersOperation";
import { TypeUtil } from "../../../src/Utility/TypeUtil";

describe("ClusterOperationTest", function () {

    let testContext = new ClusterTestContext();

    it("nextIdentityForOperationShouldBroadcast", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const database = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName: database
            }, numberOfNodes, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const re = store.getRequestExecutor(database);
                let result = await store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|"));
                assertThat(result)
                    .isEqualTo(1);

                const preferred = await re.getPreferredNode();
                const tag = preferred.currentNode.clusterTag;

                await cluster.executeJsScript(tag, "server.ServerStore.InitializationCompleted.Reset(true);" +
                    " server.ServerStore.Initialized = false; " +
                    " var leader = server.ServerStore.Engine.CurrentLeader; " +
                    " if (leader) leader.StepDown();");

                const sw = Stopwatch.createStarted();
                result = await store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|"));
                sw.stop();

                assertThat(sw.elapsed)
                    .isLessThan(10_000);

                const newPreferred = await re.getPreferredNode();
                assertThat(newPreferred.currentNode.clusterTag)
                    .isNotEqualTo(tag);
                assertThat(result)
                    .isEqualTo(2);
            } finally {
                store.dispose();
            }

        } finally {
            cluster.dispose();
        }
    });

    //TODO: disable?
    it("nextIdentityForOperationShouldBroadcastAndFail", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const database = testContext.getDatabaseName();
            const numberOfNodes = 3;

            await cluster.createDatabase({
                databaseName: database
            }, numberOfNodes, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const re = store.getRequestExecutor(database);
                let result = await store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|"));
                assertThat(result)
                    .isEqualTo(1);

                const node = cluster.nodes.find(x => !x.leader);

                const leaderNodeTag = await cluster.getCurrentLeader(store);

                await cluster.executeJsScript(node.nodeTag, "server.ServerStore.InitializationCompleted.Reset(true);\n" +
                    " server.ServerStore.Initialized = false;");

                await cluster.disposeServer(leaderNodeTag);

                const sw = Stopwatch.createStarted();
                await assertThrows(() => store.maintenance.forDatabase(database).send(new NextIdentityForOperation("person|")), e => {
                    assertThat(e.name)
                        .isEqualTo("AllTopologyNodesDownException");

                    assertThat(e.message)
                        .contains("Could not send command");
                    assertThat(e.message)
                        .contains("there is no leader, and we timed out waiting for one");
                    assertThat(e.message)
                        .contains("failed with timeout after 00:00:30");

                    assertThat(sw.elapsed)
                        .isLessThan(45_000);
                });

            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    }).timeout(60_000);

    it.skip("changesApiFailOver", async () => {
        const db = "Test";

        const topology = {
            dynamicNodesDistribution: true
        } as DatabaseTopology;

        const customSettings = {
            "Cluster.TimeBeforeAddingReplicaInSec": "1",
            "Cluster.TimeBeforeMovingToRehabInSec": "0",
            "Cluster.StatsStabilizationTimeInSec": "1",
            "Cluster.ElectionTimeoutInMs": "50"
        };

        const cluster = await testContext.createRaftCluster(3, customSettings);
        try {
            const databaseRecord: DatabaseRecord = {
                databaseName: db,
                topology
            };

            await cluster.createDatabase(databaseRecord, 2, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, db);
            try {
                store.initialize();

                const changesList: DocumentChange[] = [];

                const taskObservable = store.changes();
                await taskObservable.ensureConnectedNow();

                taskObservable.on("error", TypeUtil.NOOP);

                const observable = taskObservable.forDocument("users/1");
                const handler = (change: DocumentChange) => changesList.push(change);

                observable.on("error", () => {
                    // ignore
                });

                observable.on("data", handler);

                {
                    const session = store.openSession();
                    await session.store(new User(), "users/1");
                    await session.saveChanges();
                }

                await testContext.waitForDocument<User>(User, store, "users/1");

                let value = await testContext.waitForValue(async () => changesList.length, 1);

                let currentUrl = store.getRequestExecutor().getUrl();
                await cluster.disposeServer(cluster.getNodeByUrl(currentUrl).nodeTag);

                await taskObservable.ensureConnectedNow();

                await waitForTopologyStabilization(testContext, db, cluster.getWorkingServer().url, 1, 2);

                {
                    const session = store.openSession();
                    await session.store(new User(), "users/1");
                    await session.saveChanges();
                }

                value = await testContext.waitForValue(async () => changesList.length, 2);
                assertThat(value)
                    .isEqualTo(2);

                currentUrl = store.getRequestExecutor().getUrl();

                await cluster.disposeServer(cluster.getNodeByUrl(currentUrl).nodeTag);

                await taskObservable.ensureConnectedNow();

                await waitForTopologyStabilization(testContext, db, cluster.getWorkingServer().url, 2, 1);

                {
                    const session = store.openSession();
                    await session.store(new User(), "users/1");
                    await session.saveChanges();
                }

                value = await testContext.waitForValue(async () => changesList.length, 2);
                assertThat(value)
                    .isEqualTo(3);
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    });

    it("changesApiReorderDatabaseNodes", async () => {
        const db = "ReorderDatabaseNodes";

        const cluster = await testContext.createRaftCluster(2);
        try {
            await cluster.createDatabase(db, 2, cluster.getInitialLeader().url);

            const leader = cluster.getInitialLeader();
            const store = new DocumentStore(leader.url, db);
            try {
                store.initialize();

                const list: DocumentChange[] = [];
                const taskObservable = store.changes();

                await taskObservable.ensureConnectedNow();

                const observable = taskObservable.forDocument("users/1");

                const handler = (change: DocumentChange) => list.push(change);

                observable.on("error", () => {
                    // ignore
                });

                observable.on("data", handler);

                {
                    const session = store.openSession();
                    await session.store(new User(), "users/1");
                    await session.saveChanges();
                }

                const url1 = store.getRequestExecutor().getUrl();
                assertThat(await testContext.waitForDocument<User>(User, store, "users/1"))
                    .isTrue();

                let value = await testContext.waitForValue<number>(async () => list.length, 1);
                assertThat(value)
                    .isEqualTo(1);

                await reverseOrderSuccessfully(store, db);

                await testContext.waitForValue<boolean>(async () => {
                    const url2 = store.getRequestExecutor().getUrl();
                    return url1 !== url2;
                }, true);

                {
                    const session = store.openSession();
                    await session.store(new User(), "users/1");
                    await session.saveChanges();
                }

                value = await testContext.waitForValue(async () => list.length, 2);
                assertThat(value)
                    .isEqualTo(2);
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    });
});

async function waitForTopologyStabilization(context: ClusterTestContext, s: string, serverUrl: string, rehabCount: number, memberCount: number) {
    const tempStore = new DocumentStore(serverUrl, s);
    try {
        tempStore.conventions.disableTopologyUpdates = true;
        tempStore.initialize();

        const value = await context.waitForValue<[number, number]>(async () => {
            const topologyGetCommand = new GetDatabaseTopologyCommand();
            await tempStore.getRequestExecutor().execute(topologyGetCommand);
            const topo = topologyGetCommand.result;

            let rehab = 0;
            let members = 0;

            topo.nodes.forEach(n => {
                switch (n.serverRole) {
                    case "Rehab":
                        rehab++;
                        break;
                    case "Member":
                        members++;
                        break;
                }
            });

            return [rehab, members];
        }, [rehabCount, memberCount], {
            equal: (a, b) => {
                return a[0] === b[0] && a[1] === b[1];
            }
        });

    } finally {
        tempStore.dispose();
    }
}

async function reverseOrderSuccessfully(store: IDocumentStore, db: string) {
    let record = await store.maintenance.server.send(new GetDatabaseRecordOperation(db));
    record.topology.members.reverse();

    const copy = [ ...record.topology.members ];

    await store.maintenance.server.send(new ReorderDatabaseMembersOperation(db, record.topology.members))
    record = await store.maintenance.server.send(new GetDatabaseRecordOperation(db));
}
