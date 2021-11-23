import {
    ExternalReplication,
    PutConnectionStringOperation,
    RavenConnectionString,
    UpdateExternalReplicationOperation
} from "../../../src";
import { RavenTestContext, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { HeartRateMeasure } from "../TimeSeries/TimeSeriesTypedSession";
import { assertThat } from "../../Utils/AssertExtensions";
import { ReplicationTestContext } from "../../Utils/ReplicationTestContext";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB_15076", function () {

    let replication: ReplicationTestContext;

    beforeEach(async function () {
        replication = new ReplicationTestContext();
    });

    afterEach(async () => {
        replication = null;
    });

    it("counters_and_force_revisions", async () => {
        const today = testContext.utcToday();

        {
            const storeA = await testContext.getDocumentStore();
            try {
                const storeB = await testContext.getDocumentStore();
                try {
                    {
                        const s = storeA.openSession();
                        const breed = new User();
                        breed.name = "German Shepherd";
                        await s.store(breed, "users/ayende/dogs/arava");

                        const color = new User();
                        color.name = "Gray/White";
                        await s.store(color, "users/pheobe");

                        const oren = new User();
                        oren.name = "Oren";
                        await s.store(oren, "users/ayende");

                        s.countersFor("users/ayende")
                            .increment("test");
                        s.countersFor("users/pheobe")
                            .increment("test");

                        const heartRateMeasure1 = new HeartRateMeasure();
                        heartRateMeasure1.heartRate = 34;
                        s.timeSeriesFor("users/pheobe", HeartRateMeasure)
                            .append(today.toDate(), heartRateMeasure1, "test/things/out");

                        const heartRateMeasure2 = new HeartRateMeasure()
                        heartRateMeasure2.heartRate = 55;
                        s.timeSeriesFor("users/ayende", HeartRateMeasure)
                            .append(today.toDate(), heartRateMeasure2, "test/things/out");

                        s.advanced.attachments.store("users/ayende", "test.bin", Buffer.from("hello", "utf-8"));
                        s.advanced.attachments.store("users/pheobe", "test.bin", Buffer.from("hello", "utf-8"));

                        s.advanced.revisions.forceRevisionCreationFor("users/ayende", "None");
                        s.advanced.revisions.forceRevisionCreationFor("users/pheobe", "None");

                        await s.saveChanges();
                    }

                    {
                        const s = storeA.openSession();
                        const color2 = new User();
                        color2.name = "Gray/White 2";
                        await s.store(color2, "users/pheobe");

                        const user2 = new User();
                        user2.name = "Oren 2";
                        await s.store(user2, "users/ayende");

                        s.advanced.revisions.forceRevisionCreationFor("users/ayende");
                        s.advanced.revisions.forceRevisionCreationFor("users/pheobe");

                        await s.saveChanges();
                    }

                    const ravenConnectionString = new RavenConnectionString();
                    ravenConnectionString.database = storeB.database;
                    ravenConnectionString.name = storeB.database + "ConStr";
                    ravenConnectionString.topologyDiscoveryUrls = storeA.urls;

                    const putConnectionStringOperation = new PutConnectionStringOperation(ravenConnectionString);
                    await storeA.maintenance.send(putConnectionStringOperation);

                    const externalReplication: ExternalReplication = {
                        name: "erpl",
                        connectionStringName: storeB.database + "ConStr",
                        database: null
                    };

                    const updateExternalReplicationOperation = new UpdateExternalReplicationOperation(externalReplication);
                    await storeA.maintenance.send(updateExternalReplicationOperation);

                    assertThat(await replication.waitForDocumentToReplicate(storeB, "users/ayende", 10_000, User))
                        .isNotNull();
                    assertThat(await replication.waitForDocumentToReplicate(storeB, "users/pheobe", 10_000, User))
                        .isNotNull();
                } finally {
                    storeB.dispose();
                }
            } finally {
                storeA.dispose();
            }
        }
    });
});
