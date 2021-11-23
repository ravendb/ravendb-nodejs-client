import { disposeTestDocumentStore, RavenTestContext, testContext } from "../Utils/TestUtil";
import {
    IDocumentStore, PullReplicationAsSink,
    PullReplicationDefinition, PutConnectionStringOperation,
    PutPullReplicationAsHubOperation,
    RavenConnectionString, TimeSeriesValue, UpdatePullReplicationAsSinkOperation
} from "../../src";
import { ReplicationTestContext } from "../Utils/ReplicationTestContext";
import { ReplicationHubAccess } from "../../src/Documents/Operations/Replication/ReplicationHubAccess";
import { RegisterReplicationHubAccessOperation } from "../../src/Documents/Operations/Replication/RegisterReplicationHubAccessOperation";
import { GenerateCertificateOperation } from "../Infrastructure/GenerateCertificateOperation";
import { assertThat } from "../Utils/AssertExtensions";
import { User } from "../Assets/Entities";
import moment = require("moment");
import { UnregisterReplicationHubAccessOperation } from "../../src/Documents/Operations/Replication/UnregisterReplicationHubAccessOperation";
import { GetReplicationHubAccessOperation } from "../../src/Documents/Operations/Replication/GetReplicationHubAccessOperation";

(RavenTestContext.isPullRequest ? describe.skip : describe)("FilteredReplicationTest", function () {

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

    it("seasame_st", async function () {
        this.timeout(60_000);

        const hooper = await testContext.getSecuredDocumentStore();
        try {
            const bert = await testContext.getSecuredDocumentStore();
            try {
                const certificate = await hooper.maintenance.send(new GenerateCertificateOperation());

                {
                    const session = hooper.openSession();
                    await session.store(Item.ofType("Eggs"), "menus/breakfast");
                    await session.store(Item.ofName("Bird Seed Milkshake"), "recipes/bird-seed-milkshake");
                    await session.store(Item.ofName("3 USD"), "prices/eastus/2");
                    await session.store(Item.ofName("3 EUR"), "prices/eu/1");
                    await session.saveChanges();
                }

                {
                    const s = bert.openSession();
                    await s.store(Item.ofName("Candy"), "orders/bert/3");
                    await s.saveChanges();
                }

                const pullReplicationDefinition: PullReplicationDefinition = {
                    name: "Franchises",
                    mode: "HubToSink,SinkToHub",
                    withFiltering: true
                };

                await hooper.maintenance.send(new PutPullReplicationAsHubOperation(pullReplicationDefinition));

                const replicationHubAccess: ReplicationHubAccess = {
                    name: "Franchises",
                    allowedSinkToHubPaths: ["orders/bert/*"],
                    allowedHubToSinkPaths: ["menus/*", "prices/eastus/*", "recipes/*"],
                    certificateBase64: certificate.publicKey
                };

                await hooper.maintenance.send(new RegisterReplicationHubAccessOperation("Franchises", replicationHubAccess));

                const ravenConnectionString: RavenConnectionString = {
                    database: hooper.database,
                    name: "HopperConStr",
                    topologyDiscoveryUrls: hooper.urls,
                    type: "Raven"
                };

                await bert.maintenance.send(new PutConnectionStringOperation(ravenConnectionString));

                const pullReplicationAsSink: PullReplicationAsSink = {
                    name: "sink",
                    connectionStringName: "HopperConStr",
                    certificateWithPrivateKey: certificate.certificate,
                    hubName: "Franchises",
                    mode: "HubToSink,SinkToHub"
                };

                await bert.maintenance.send(new UpdatePullReplicationAsSinkOperation(pullReplicationAsSink));

                assertThat(await replication.waitForDocumentToReplicate(bert, "menus/breakfast", 10_000, Item))
                    .isNotNull();
                assertThat(await replication.waitForDocumentToReplicate(bert, "recipes/bird-seed-milkshake", 10_000, Item))
                    .isNotNull();
                assertThat(await replication.waitForDocumentToReplicate(bert, "prices/eastus/2", 10_000, Item))
                    .isNotNull();
                assertThat(await replication.waitForDocumentToReplicate(hooper, "orders/bert/3", 10_000, Item))
                    .isNotNull();

                {
                    const session = bert.openSession();
                    assertThat(await session.load("prices/eu/1", Item))
                        .isNull();
                }

                const hubConfig = await hooper.maintenance.send(new GetReplicationHubAccessOperation("Franchises"));
                assertThat(hubConfig)
                    .hasSize(1);

                const firstHubConfig = hubConfig[0];
                assertThat(firstHubConfig)
                    .isNotNull();
                assertThat(firstHubConfig.thumbprint.toLocaleLowerCase())
                    .isEqualTo(certificate.thumbprint.toLocaleLowerCase());
                assertThat(firstHubConfig.notAfter instanceof Date)
                    .isTrue();
                assertThat(firstHubConfig.notBefore instanceof Date)
                    .isTrue();

                assertThat(firstHubConfig.allowedHubToSinkPaths)
                    .hasSize(3);

                assertThat(firstHubConfig.allowedHubToSinkPaths[0])
                    .isEqualTo("menus/*");
                assertThat(firstHubConfig.allowedHubToSinkPaths[1])
                    .isEqualTo("prices/eastus/*");
                assertThat(firstHubConfig.allowedHubToSinkPaths[2])
                    .isEqualTo("recipes/*");

                assertThat(firstHubConfig.allowedSinkToHubPaths)
                    .hasSize(1);
                assertThat(firstHubConfig.allowedSinkToHubPaths[0])
                    .isEqualTo("orders/bert/*");

                await hooper.maintenance.send(new UnregisterReplicationHubAccessOperation("Franchises", certificate.thumbprint));

                const hubConfigAfterCleanup = await hooper.maintenance.send(new GetReplicationHubAccessOperation("Franchises"));
                assertThat(hubConfigAfterCleanup)
                    .hasSize(0);
            } finally {
                bert.dispose();
            }
        } finally {
            hooper.dispose();
        }
    });

    it("can_pull_via_filtered_replication", async function () {
        const storeA = await testContext.getSecuredDocumentStore();
        try {
            const storeB = await testContext.getSecuredDocumentStore();
            try {
                const dbNameA = storeA.database;
                const dbNameB = storeB.database;

                const certificate = await storeA.maintenance.send(new GenerateCertificateOperation());

                {
                    const s = storeA.openSession();
                    const user1 = new User();
                    user1.name = "German Shepherd";
                    await s.store(user1, "users/ayende/dogs/arava");

                    const user2 = new User();
                    user2.name = "Gray/White";
                    await s.store(user2, "users/pheobe");

                    const user3 = new User();
                    user3.name = "Oren";
                    await s.store(user3, "users/ayende");

                    s.countersFor("users/ayende")
                        .increment("test");
                    s.countersFor("users/pheobe")
                        .increment("test");

                    s.timeSeriesFor("users/pheobe", HeartRateMeasure)
                        .append(moment().startOf("day").toDate(), HeartRateMeasure.create(34), "test/things/out");

                    s.timeSeriesFor("users/ayende", HeartRateMeasure)
                        .append(moment().startOf("day").toDate(), HeartRateMeasure.create(55), "test/things/out");

                    s.advanced.attachments.store("users/ayende", "test.bin", Buffer.from("hello"));
                    s.advanced.attachments.store("users/pheobe", "test.bin", Buffer.from("hello"));

                    s.advanced.revisions.forceRevisionCreationFor("users/ayende", "None");
                    s.advanced.revisions.forceRevisionCreationFor("users/pheobe", "None");

                    await s.saveChanges();
                }

                {
                    const s = storeA.openSession();
                    await s.load("users/pheobe", User);
                    await s.load("users/ayende", User);
                }

                {
                    const s = storeA.openSession();
                    const user1 = new User();
                    user1.name = "Gray/White 2";
                    await s.store(user1, "users/pheobe");

                    const user2 = new User();
                    user2.name = "Oren 2";
                    await s.store(user2, "users/ayende");

                    s.advanced.revisions.forceRevisionCreationFor("users/ayende");
                    s.advanced.revisions.forceRevisionCreationFor("users/pheobe");

                    await s.saveChanges();
                }

                {
                    const s = storeB.openSession();
                    await s.load("users/pheobe", User);
                    await s.load("users/ayende", User);
                }

                const pullReplicationDefinition: PullReplicationDefinition = {
                    name: "pull",
                    mode: "HubToSink,SinkToHub",
                    withFiltering: true
                };

                await storeA.maintenance.send(new PutPullReplicationAsHubOperation(pullReplicationDefinition));

                const replicationHubAccess: ReplicationHubAccess = {
                    name: "Arava",
                    allowedHubToSinkPaths: ["users/ayende", "users/ayende/*"],
                    certificateBase64: certificate.publicKey
                };

                await storeA.maintenance.send(new RegisterReplicationHubAccessOperation("pull", replicationHubAccess));

                const ravenConnectionString: RavenConnectionString = {
                    database: dbNameA,
                    name: dbNameA + "ConStr",
                    topologyDiscoveryUrls: storeA.urls,
                    type: "Raven"
                };

                await storeB.maintenance.send(new PutConnectionStringOperation(ravenConnectionString));

                const pullReplicationAsSink: PullReplicationAsSink =  {
                    connectionStringName: dbNameA + "ConStr",
                    certificateWithPrivateKey: certificate.certificate,
                    hubName: "pull",
                    mode: "HubToSink"
                };

                await storeB.maintenance.send(new UpdatePullReplicationAsSinkOperation(pullReplicationAsSink));

                assertThat(await replication.waitForDocumentToReplicate(storeB, "users/ayende", 10_000, User))
                    .isNotNull();

                {
                    const s = storeB.openSession();
                    assertThat(await s.load("users/pheobe"))
                        .isNull();
                    assertThat(await s.advanced.revisions.get("users/pheobe", moment().startOf("day").add(1, "day").toDate()))
                        .isNull();
                    assertThat(await s.countersFor("users/pheobe").get("test"))
                        .isNull();
                    assertThat(await s.timeSeriesFor("users/pheobe", HeartRateMeasure).get())
                        .isNull();
                    const att = await s.advanced.attachments.get("users/pheobe", "test.bin");
                    assertThat(att)
                        .isNull();
                    assertThat(await s.load("users/ayende/dogs/arava", User))
                        .isNotNull();
                    assertThat(await s.load("users/ayende", User))
                        .isNotNull();
                    assertThat(await s.advanced.revisions.get("users/ayende", moment().startOf("day").add(1, "day").toDate()))
                        .isNotNull();
                    assertThat(await s.countersFor("users/ayende").get("test"))
                        .isNotNull();
                    assertThat(await s.timeSeriesFor("users/ayende", HeartRateMeasure).get())
                        .isNotEmpty();
                    const attachmentResult = await s.advanced.attachments.get("users/ayende", "test.bin");
                    assertThat(attachmentResult)
                        .isNotNull();
                    attachmentResult.dispose();
                }

                {
                    const s = storeA.openSession();
                    await s.delete("users/ayende/dogs/arava");
                    await s.saveChanges();
                }

                await testContext.waitForDocumentDeletion(storeB, "users/ayende/dogs/arava");

                {
                    const s = storeB.openSession();
                    assertThat(await s.load("users/pheobe", User))
                        .isNull();
                    assertThat(await s.load("users/aynede/dogs/arava", User))
                        .isNull();

                    assertThat(await s.load("users/ayende", User))
                        .isNotNull();

                    assertThat(await s.advanced.revisions.get("users/ayende", moment().startOf("day").add(1, "day").toDate()))
                        .isNotNull();

                    assertThat(await s.countersFor("users/ayende").get("test"))
                        .isNotNull();
                    assertThat(await s.timeSeriesFor("users/ayende", HeartRateMeasure).get())
                        .isNotEmpty();
                    const attachmentResult = await s.advanced.attachments.get("users/ayende", "test.bin");
                    assertThat(attachmentResult)
                        .isNotNull();
                    attachmentResult.dispose();
                }
            } finally {
                storeB.dispose();
            }
        } finally {
            storeA.dispose();
        }
    });

    it("can_push_via_filtered_replication", async function () {
        const storeA = await testContext.getSecuredDocumentStore();
        try {
            const storeB = await testContext.getSecuredDocumentStore();
            try {
                const dbNameA = storeA.database;
                const dbNameB = storeB.database;

                const certificate = await storeA.maintenance.send(new GenerateCertificateOperation());

                {
                    const s = storeA.openSession();
                    const user1 = new User();
                    user1.name = "German Shepherd";
                    await s.store(user1, "users/ayende/dogs/arava");

                    const user2 = new User();
                    user2.name = "Gray/White";
                    await s.store(user2, "users/pheobe");

                    const user3 = new User();
                    user3.name = "Oren";
                    await s.store(user3, "users/ayende");

                    s.countersFor("users/ayende")
                        .increment("test");
                    s.countersFor("users/pheobe")
                        .increment("test");

                    s.timeSeriesFor("users/pheobe", HeartRateMeasure)
                        .append(moment().startOf("day").toDate(), HeartRateMeasure.create(34), "test/things/out");

                    s.timeSeriesFor("users/ayende", HeartRateMeasure)
                        .append(moment().startOf("day").toDate(), HeartRateMeasure.create(55), "test/things/out");

                    s.advanced.attachments.store("users/ayende", "test.bin", Buffer.from("hello"));
                    s.advanced.attachments.store("users/pheobe", "test.bin", Buffer.from("hello"));

                    s.advanced.revisions.forceRevisionCreationFor("users/ayende", "None");
                    s.advanced.revisions.forceRevisionCreationFor("users/pheobe", "None");

                    await s.saveChanges();
                }

                {
                    const s = storeA.openSession();
                    await s.load("users/pheobe", User);
                    await s.load("users/ayende", User);
                }

                {
                    const s = storeA.openSession();
                    const user1 = new User();
                    user1.name = "Gray/White 2";
                    await s.store(user1, "users/pheobe");

                    const user2 = new User();
                    user2.name = "Oren 2";
                    await s.store(user2, "users/ayende");

                    s.advanced.revisions.forceRevisionCreationFor("users/ayende");
                    s.advanced.revisions.forceRevisionCreationFor("users/pheobe");

                    await s.saveChanges();
                }

                {
                    const s = storeB.openSession();
                    await s.load("users/pheobe", User);
                    await s.load("users/ayende", User);
                }

                const pullReplicationDefinition: PullReplicationDefinition = {
                    name: "push",
                    mode: "HubToSink,SinkToHub",
                    withFiltering: true
                };

                await storeB.maintenance.send(new PutPullReplicationAsHubOperation(pullReplicationDefinition));

                const replicationHubAccess: ReplicationHubAccess = {
                    name: "Arava",
                    allowedSinkToHubPaths: ["users/ayende", "users/ayende/*"],
                    certificateBase64: certificate.publicKey
                };


                await storeB.maintenance.send(new RegisterReplicationHubAccessOperation("push", replicationHubAccess));

                const ravenConnectionString: RavenConnectionString = {
                    database: dbNameB,
                    name: dbNameB + "ConStr",
                    topologyDiscoveryUrls: storeA.urls,
                    type: "Raven"
                };

                await storeA.maintenance.send(new PutConnectionStringOperation(ravenConnectionString));

                const pullReplicationAsSink: PullReplicationAsSink = {
                    connectionStringName: dbNameB + "ConStr",
                    mode: "SinkToHub",
                    certificateWithPrivateKey: certificate.certificate,
                    hubName: "push"
                };

                await storeA.maintenance.send(new UpdatePullReplicationAsSinkOperation(pullReplicationAsSink));

                assertThat(await replication.waitForDocumentToReplicate(storeB, "users/ayende", 10_000, User))
                    .isNotNull();

                {
                    const s = storeB.openSession();
                    assertThat(await s.load("users/pheobe", User))
                        .isNull();
                    assertThat(await s.advanced.revisions.get("users/pheobe", moment().startOf("day").add(1, "day").toDate()))
                        .isNull();
                    assertThat(await s.countersFor("users/pheobe").get("test"))
                        .isNull();
                    assertThat(await s.timeSeriesFor("users/pheobe", HeartRateMeasure).get())
                        .isNull();
                    const att = await s.advanced.attachments.get("users/pheobe", "test.bin");
                    assertThat(att)
                        .isNull();

                    assertThat(await s.load("users/ayende/dogs/arava", User))
                        .isNotNull();
                    assertThat(await s.load("users/ayende", User))
                        .isNotNull();
                    assertThat(await s.advanced.revisions.get("users/ayende", moment().startOf("day").add(1, "day").toDate()))
                        .isNotNull();
                    assertThat(await s.countersFor("users/ayende").get("test"))
                        .isNotNull();
                    assertThat(await s.timeSeriesFor("users/ayende", HeartRateMeasure).get())
                        .isNotEmpty();
                    const attachmentResult = await s.advanced.attachments.get("users/ayende", "test.bin");
                    assertThat(attachmentResult)
                        .isNotNull();
                    attachmentResult.dispose();
                }

                {
                    const s = storeA.openSession();
                    await s.delete("users/ayende/dogs/arava");
                    await s.saveChanges();
                }

                await testContext.waitForDocumentDeletion(storeB, "users/ayende/dogs/arava");

                {
                    const s = storeB.openSession();
                    assertThat(await s.load("users/pheobe", User))
                        .isNull();
                    assertThat(await s.load("users/aynede/dogs/arava", User))
                        .isNull();

                    assertThat(await s.load("users/ayende", User))
                        .isNotNull();

                    assertThat(await s.advanced.revisions.get("users/ayende", moment().startOf("day").add(1, "day").toDate()))
                        .isNotNull();

                    assertThat(await s.countersFor("users/ayende").get("test"))
                        .isNotNull();
                    assertThat(await s.timeSeriesFor("users/ayende", HeartRateMeasure).get())
                        .isNotEmpty();
                    const attachmentResult = await s.advanced.attachments.get("users/ayende", "test.bin");
                    assertThat(attachmentResult)
                        .isNotNull();
                    attachmentResult.dispose();
                }
            } finally {
                storeB.dispose();
            }
        } finally {
            storeA.dispose();
        }
    });
});

export class HeartRateMeasure {
    public static readonly TIME_SERIES_VALUES: TimeSeriesValue<HeartRateMeasure> = ["heartRate"];

    public heartRate: number;

    public static create(heartRate: number) {
        const heartRateMeasure = new HeartRateMeasure();
        heartRateMeasure.heartRate = heartRate;
        return heartRateMeasure;
    }
}

class Item {
    public type: string;
    public name: string;

    public static ofType(type: string) {
        const item = new Item();
        item.type = type;
        return item;
    }

    public static ofName(name: string) {
        const item = new Item();
        item.name = name;
        return item;
    }
}