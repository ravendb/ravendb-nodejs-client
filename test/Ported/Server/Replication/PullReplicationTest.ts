import { IDocumentStore } from "../../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil";
import { ReplicationTestContext } from "../../../Utils/ReplicationTestContext";
import { PutPullReplicationAsHubOperation } from "../../../../src/Documents/Operations/Replication/PutPullReplicationAsHubOperation";
import { User } from "../../../Assets/Entities";
import { ModifyOngoingTaskResult } from "../../../../src/ServerWide/ModifyOnGoingTaskResult";
import { PullReplicationAsSink } from "../../../../src/Documents/Operations/Replication/PullReplicationAsSink";
import { assertThat } from "../../../Utils/AssertExtensions";
import { GetOngoingTaskInfoOperation } from "../../../../src/Documents/Operations/GetOngoingTaskInfoOperation";
import { OngoingTaskPullReplicationAsSink } from "../../../../src/Documents/Operations/OngoingTasks/OngoingTaskPullReplicationAsSink";
import { GetPullReplicationHubTasksInfoOperation } from "../../../../src/Documents/Operations/OngoingTasks/GetPullReplicationHubTasksInfoOperation";
import { PullReplicationDefinition } from "../../../../src/Documents/Operations/Replication/PullReplicationDefinition";
import { delay } from "../../../../src/Utility/PromiseUtil";

(RavenTestContext.isPullRequest ? describe.skip : describe)("PullReplicationTest", function () {

    let store: IDocumentStore;
    let replication: ReplicationTestContext;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        replication = new ReplicationTestContext();
    });

    afterEach(async () => {
        replication = null;
        await disposeTestDocumentStore(store);
    });

    it("canDefinePullReplication", async () => {
        const operation = new PutPullReplicationAsHubOperation("test");
        await store.maintenance.forDatabase(store.database).send(operation);
    });

    it("pullReplicationShouldWork", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();

            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();
                const name = "pull-replication" + sink.database;

                const putOperation = new PutPullReplicationAsHubOperation(name);

                await hub.maintenance.forDatabase(hub.database).send(putOperation);

                {
                    const s2 = hub.openSession();
                    await s2.store(new User(), "foo/bar");
                    await s2.saveChanges();
                }

                await setupPullReplication(name, sink, hub);

                await replication.waitForDocumentToReplicate<User>(sink, "foo/bar", 3_000, User);
            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("collectPullReplicationOngoingTaskInfo", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();

            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();

                const name = "pull-replication" + sink.database;

                const putOperation = new PutPullReplicationAsHubOperation(name);

                const hubTask = await hub.maintenance.forDatabase(hub.database).send(putOperation);

                {
                    const s2 = hub.openSession();
                    await s2.store(new User(), "foo/bar");
                    await s2.saveChanges();
                }

                const pullTasks = await setupPullReplication(name, sink, hub);

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "foo/bar", 3_000, User))
                    .isNotNull();

                const sinkResult = (await sink.maintenance.send(new GetOngoingTaskInfoOperation(pullTasks[0].taskId, "PullReplicationAsSink"))) as OngoingTaskPullReplicationAsSink;

                assertThat(sinkResult.destinationDatabase)
                    .isEqualTo(hub.database);
                assertThat(sinkResult.destinationUrl)
                    .isEqualTo(hub.urls[0]);
                assertThat(sinkResult.taskConnectionStatus)
                    .isEqualTo("Active");

                const hubResult = await hub.maintenance.send(new GetPullReplicationHubTasksInfoOperation(hubTask.taskId));
                const ongoing = hubResult.ongoingTasks[0];

                assertThat(ongoing.destinationDatabase)
                    .isEqualTo(sink.database);
                assertThat(ongoing.destinationUrl)
                    .isEqualTo(sink.urls[0]);
                assertThat(ongoing.taskConnectionStatus)
                    .isEqualTo("Active");
                assertThat(ongoing.taskType)
                    .isEqualTo("PullReplicationAsHub");
            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("deletePullReplicationFromHub", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();

            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();

                const name = "pull-replication" + sink.database;

                const putOperation = new PutPullReplicationAsHubOperation(name);

                const hubResult = await hub.maintenance.forDatabase(hub.database).send(putOperation);

                {
                    const s2 = hub.openSession();
                    await s2.store(new User(), "foo/bar");
                    await s2.saveChanges();
                }

                const pullTasks = await setupPullReplication(name, sink, hub);

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "foo/bar", 3_000, User))
                    .isNotNull();

                await replication.deleteOngoingTask(hub, hubResult.taskId, "PullReplicationAsHub");

                await delay(500);

                {
                    const session = hub.openSession();
                    await session.store(new User(), "foo/bar2");
                    await session.saveChanges();
                }

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "foo/bar2", 3_000, User))
                    .isNull();
            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("deletePullReplicationFromSink", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();

            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();

                const name = "pull-replication" + sink.database;

                const putOperation = new PutPullReplicationAsHubOperation(name);

                const hubResult = await hub.maintenance.forDatabase(hub.database).send(putOperation);

                {
                    const s2 = hub.openSession();
                    await s2.store(new User(), "foo/bar");
                    await s2.saveChanges();
                }

                const sinkResult = await setupPullReplication(name, sink, hub);

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "foo/bar", 3_000, User))
                    .isNotNull();

                await replication.deleteOngoingTask(sink, sinkResult[0].taskId, "PullReplicationAsSink");

                {
                    const session = hub.openSession();
                    await session.store(new User(), "foo/bar2");
                    await session.saveChanges();
                }

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "foo/bar2", 3_000, User))
                    .isNull();
            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("updatePullReplicationOnSink", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();
            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();
                let hub2: IDocumentStore;
                try {
                    hub2 = await testContext.getDocumentStore();

                    const definitionName1 = "pull-replication" + hub.database;
                    const definitionName2 = "pull-replication" + hub2.database;

                    const timeout = 3_000;

                    await hub.maintenance.forDatabase(hub.database).send(new PutPullReplicationAsHubOperation(definitionName1));
                    await hub2.maintenance.forDatabase(hub2.database).send(new PutPullReplicationAsHubOperation(definitionName2));

                    {
                        const main = hub.openSession();
                        await main.store(new User(), "hub1/1");
                        await main.saveChanges();
                    }

                    const pullTasks = await setupPullReplication(definitionName1, sink, hub);
                    await replication.waitForDocumentToReplicate<User>(sink, "hub1/1", timeout, User);

                    const pull: PullReplicationAsSink = {
                        database: hub2.database,
                        connectionStringName: "ConnectionString2-" + sink.database,
                        hubDefinitionName: definitionName2,
                        taskId: pullTasks[0].taskId,
                        mode: "HubToSink"
                    };

                    await ReplicationTestContext.addWatcherToReplicationTopology(sink, pull, ...hub2.urls);

                    await delay(500); // wait a bit to process update

                    {
                        const main = hub.openSession();
                        await main.store(new User(), "hub1/2");
                        await main.saveChanges();
                    }

                    assertThat(await replication.waitForDocumentToReplicate<User>(sink, "hub1/2", timeout, User))
                        .isNull();

                    {
                        const main = hub2.openSession();
                        await main.store(new User(), "hub2");
                        await main.saveChanges();
                    }

                    assertThat(await replication.waitForDocumentToReplicate<User>(sink, "hub2", timeout, User))
                        .isNotNull();
                } finally {
                    hub2.dispose();
                }
            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("updatePullReplicationOnHub", async function() {
        let sink: IDocumentStore;

        this.timeout(60_000);

        try {
            sink = await testContext.getDocumentStore();
            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();

                const definitionName = "pull-replication" + sink.database;

                const saveResult = await hub.maintenance.forDatabase(hub.database)
                    .send(new PutPullReplicationAsHubOperation(definitionName));

                {
                    const main = hub.openSession();
                    await main.store(new User(), "users/1");
                    await main.saveChanges();
                }

                await setupPullReplication(definitionName, sink, hub);
                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "users/1", 3_000, User))
                    .isNotNull();

                const pullDefinition: PullReplicationDefinition = {
                    name: definitionName,
                    delayReplicationFor: "1.00:00:00",
                    taskId: saveResult.taskId
                };

                await hub.maintenance.forDatabase(hub.database)
                    .send(new PutPullReplicationAsHubOperation(pullDefinition));

                {
                    const main = hub.openSession();
                    await main.store(new User(), "users/2");
                    await main.saveChanges();
                }

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "users/2", 3_000, User))
                    .isNull();

                const replicationDefinition: PullReplicationDefinition = {
                    name: definitionName,
                    taskId: saveResult.taskId
                };

                const hubOperation = new PutPullReplicationAsHubOperation(replicationDefinition)
                await hub.maintenance.forDatabase(hub.database)
                    .send(hubOperation);

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "users/2", 40_000, User))
                    .isNotNull();

            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("disablePullReplicationOnSink", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();
            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();

                const definitionName = "pull-replication" + hub.database;
                const timeout = 10_000;

                await hub.maintenance.forDatabase(hub.database)
                    .send(new PutPullReplicationAsHubOperation(definitionName));

                {
                    const main = hub.openSession();
                    await main.store(new User(), "hub/1");
                    await main.saveChanges();
                }

                const pullTasks = await setupPullReplication(definitionName, sink, hub);
                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "hub/1", timeout, User))
                    .isNotNull();

                const pull: PullReplicationAsSink = {
                    database: hub.database,
                    connectionStringName: "ConnectionString-" + sink.database,
                    hubDefinitionName: definitionName,
                    disabled: true,
                    taskId: pullTasks[0].taskId,
                    mode: "HubToSink"
                };

                await ReplicationTestContext.addWatcherToReplicationTopology(sink, pull, ...hub.urls);

                {
                    const main = hub.openSession();
                    await main.store(new User(), "hub/2");
                    await main.saveChanges();
                }

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "hub/2", timeout, User))
                    .isNull();

                pull.disabled = false;
                await ReplicationTestContext.addWatcherToReplicationTopology(sink, pull, ...hub.urls);

                {
                    const main = hub.openSession();
                    await main.store(new User(), "hub/3");
                    await main.saveChanges();
                }

                assertThat(await replication.waitForDocumentToReplicate(sink, "hub/2", timeout, User))
                    .isNotNull();
                assertThat(await replication.waitForDocumentToReplicate(sink, "hub/3", timeout, User))
                    .isNotNull();

            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("disablePullReplicationOnHub", async () => {
        let sink: IDocumentStore;
        try {
            sink = await testContext.getDocumentStore();
            let hub: IDocumentStore;
            try {
                hub = await testContext.getDocumentStore();

                const definitionName = "pull-replication" + hub.database;
                const timeout = 3_000;

                const pullDefinition: PullReplicationDefinition = {
                    name: definitionName
                }
                const saveResult = await hub.maintenance.forDatabase(hub.database)
                    .send(new PutPullReplicationAsHubOperation(pullDefinition));

                {
                    const main = hub.openSession();
                    await main.store(new User(), "users/1");
                    await main.saveChanges();
                }

                await setupPullReplication(definitionName, sink, hub);
                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "users/1", 3_000, User))
                    .isNotNull();

                pullDefinition.disabled = true;
                pullDefinition.taskId = saveResult.taskId;

                await hub.maintenance.forDatabase(hub.database)
                    .send(new PutPullReplicationAsHubOperation(pullDefinition));

                {
                    const main = hub.openSession();
                    await main.store(new User(), "users/2");
                    await main.saveChanges();
                }

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "users/2", timeout, User))
                    .isNull();

                pullDefinition.disabled = false;
                pullDefinition.taskId = saveResult.taskId;

                await hub.maintenance.forDatabase(hub.database)
                    .send(new PutPullReplicationAsHubOperation(pullDefinition));

                assertThat(await replication.waitForDocumentToReplicate<User>(sink, "users/2", 10 * timeout, User))
                    .isNotNull();
            } finally {
                hub.dispose();
            }
        } finally {
            sink.dispose();
        }
    });

    it("multiplePullExternalReplicationShouldWork", async () => {
        let sink1: IDocumentStore;
        try {
            sink1 = await testContext.getDocumentStore();
            let sink2: IDocumentStore;
            try {
                sink2 = await testContext.getDocumentStore();

                let hub: IDocumentStore;
                try {
                    hub = await testContext.getDocumentStore();

                    const name = "pull-replication" + hub.database;

                    await hub.maintenance.forDatabase(hub.database)
                        .send(new PutPullReplicationAsHubOperation(name));

                    {
                        const session = hub.openSession();
                        await session.store(new User(), "foo/bar");
                        await session.saveChanges();
                    }

                    await setupPullReplication(name, sink1, hub);
                    await setupPullReplication(name, sink2, hub);

                    assertThat(await replication.waitForDocumentToReplicate<User>(sink1, "foo/bar", 3_000, User))
                        .isNotNull();
                    assertThat(await replication.waitForDocumentToReplicate<User>(sink2, "foo/bar", 3_000, User))
                        .isNotNull();
                } finally {
                    hub.dispose();
                }
            } finally {
                sink2.dispose();
            }
        } finally {
            sink1.dispose();
        }
    })
});

async function setupPullReplication(remoteName: string, sink: IDocumentStore, ...hub: IDocumentStore[]) {
    const resList: ModifyOngoingTaskResult[] = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < hub.length; i++) {
        const store = hub[i];

        const pull: PullReplicationAsSink = {
            database: store.database,
            connectionStringName: "ConnectionString-" + store.database,
            hubDefinitionName: remoteName,
            mode: "HubToSink"
        };

        resList.push(await ReplicationTestContext.addWatcherToReplicationTopology(sink, pull, ...store.urls));
    }

    return resList;
}