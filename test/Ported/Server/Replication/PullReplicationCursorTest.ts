import { Readable } from "node:stream";
import {
    DocumentConventions,
    GetOngoingTaskInfoOperation,
    IDocumentStore,
    ModifyOngoingTaskResult,
    OngoingTaskPullReplicationAsSink,
    PullReplicationAsSink,
    PutPullReplicationAsHubOperation
} from "../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil.js";
import { ReplicationTestContext } from "../../../Utils/ReplicationTestContext.js";
import { User } from "../../../Assets/Entities.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";
import { delay } from "../../../../src/Utility/PromiseUtil.js";
import { Stopwatch } from "../../../../src/Utility/Stopwatch.js";

// The exact task-info wire bytes a 7.2.5 server sends for an OngoingTaskPullReplicationAsSink:
// the reference's ToJson writes HubCursor/SinkCursor unconditionally, null for a sink that
// never ran and change-vector strings for a sink that has replicated.
const sinkTaskBody = (hubCursor: string | null, sinkCursor: string | null) => JSON.stringify({
    TaskId: 777,
    TaskType: "PullReplicationAsSink",
    ResponsibleNode: null,
    TaskState: "Enabled",
    TaskConnectionStatus: "NotActive",
    TaskName: "p5-sink",
    Error: null,
    DestinationUrl: "http://localhost:8081",
    TopologyDiscoveryUrls: ["http://localhost:8081"],
    DestinationDatabase: "target-db",
    HubName: "hub1",
    Mode: "HubToSink",
    ConnectionStringName: "cs1",
    CertificatePublicKey: null,
    AccessName: null,
    AllowedHubToSinkPaths: ["/a"],
    AllowedSinkToHubPaths: [],
    MentorNode: null,
    HubCursor: hubCursor,
    SinkCursor: sinkCursor
});

// setResponseAsync never touches the network, so the revival mapping runs on any environment.
describe("PullReplicationCursor", function () {
    it("revives change-vector hubCursor and sinkCursor verbatim", async () => {
        const result = await reviveSinkTaskInfo(sinkTaskBody("A:12-xyz", "A:5-xyz"));

        assertThat(result.hubCursor).isEqualTo("A:12-xyz");
        assertThat(result.sinkCursor).isEqualTo("A:5-xyz");
        assertThat(result.taskType).isEqualTo("PullReplicationAsSink");
        assertThat(result.taskName).isEqualTo("p5-sink");
        assertThat(result.destinationDatabase).isEqualTo("target-db");
        assertThat(result.hubName).isEqualTo("hub1");
        assertThat(result.mode).isEqualTo("HubToSink");
    });

    it("revives null hubCursor and sinkCursor as null", async () => {
        const result = await reviveSinkTaskInfo(sinkTaskBody(null, null));

        assertThat(result.hubCursor).isNull();
        assertThat(result.sinkCursor).isNull();
        assertThat(result.taskType).isEqualTo("PullReplicationAsSink");
        assertThat(result.taskName).isEqualTo("p5-sink");
        assertThat(result.destinationDatabase).isEqualTo("target-db");
        assertThat(result.hubName).isEqualTo("hub1");
    });
});

// Creating a sink task is license-gated; the live read-back needs a licensed 7.2 server.
(RavenTestContext.isPullRequest || !RavenTestContext.isRavenDbServerVersion("7.2") ? describe.skip : describe)("PullReplicationCursorLive", function () {
    let sink: IDocumentStore;
    let replication: ReplicationTestContext;

    beforeEach(async function () {
        sink = await testContext.getDocumentStore();
        replication = new ReplicationTestContext();
    });

    afterEach(async () => {
        replication = null;
        await disposeTestDocumentStore(sink);
    });

    it("reports non-empty hubCursor and sinkCursor after replication", async function () {
        this.timeout(60_000);

        let hub: IDocumentStore;
        try {
            hub = await testContext.getDocumentStore();

            const name = "pull-replication" + sink.database;

            await hub.maintenance.forDatabase(hub.database).send(new PutPullReplicationAsHubOperation(name));

            {
                const session = hub.openSession();
                await session.store(new User(), "foo/bar");
                await session.saveChanges();
            }

            const pullTasks = await setupPullReplication(name, sink, hub);

            assertThat(await replication.waitForDocumentToReplicate<User>(sink, "foo/bar", 8_000, User))
                .isNotNull();

            // The server persists the cursors to cluster state after the sink applies a batch; poll until both are set.
            const sinkResult = await waitForNonEmptyCursors(sink, pullTasks[0].taskId);

            assertThat(sinkResult).isNotNull();
            assertThat(sinkResult.hubCursor).isNotEmpty();
            assertThat(sinkResult.sinkCursor).isNotEmpty();
            assertThat(sinkResult.destinationDatabase).isEqualTo(hub.database);
            assertThat(sinkResult.taskConnectionStatus).isEqualTo("Active");
        } finally {
            hub.dispose();
        }
    });
});

async function reviveSinkTaskInfo(body: string): Promise<OngoingTaskPullReplicationAsSink> {
    const command = new GetOngoingTaskInfoOperation("p5-sink", "PullReplicationAsSink")
        .getCommand(new DocumentConventions());
    await command.setResponseAsync(Readable.from([body]), false);
    return command.result as OngoingTaskPullReplicationAsSink;
}

async function setupPullReplication(remoteName: string, sink: IDocumentStore, ...hub: IDocumentStore[]) {
    const resList: ModifyOngoingTaskResult[] = [];

    for (let i = 0; i < hub.length; i++) {
        const store = hub[i];

        const pull: PullReplicationAsSink = {
            database: store.database,
            connectionStringName: "ConnectionString-" + store.database,
            hubName: remoteName,
            mode: "HubToSink",
            url: sink.urls[0],
        };

        resList.push(await ReplicationTestContext.addWatcherToReplicationTopology(sink, pull, ...store.urls));
    }

    return resList;
}

async function waitForNonEmptyCursors(store: IDocumentStore, taskId: number): Promise<OngoingTaskPullReplicationAsSink> {
    const sw = Stopwatch.createStarted();

    while (sw.elapsed <= 15_000) {
        const info = await store.maintenance.send(new GetOngoingTaskInfoOperation(taskId, "PullReplicationAsSink")) as OngoingTaskPullReplicationAsSink;
        if (info
            && typeof info.hubCursor === "string" && info.hubCursor.length > 0
            && typeof info.sinkCursor === "string" && info.sinkCursor.length > 0) {
            return info;
        }

        await delay(250);
    }

    return null;
}
