import { randomUUID } from "node:crypto";
import { CONSTANTS, IDocumentSession, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class User {
    public id: string;
    public name: string;
}

describe("RavenDB_20883", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function addBeforeStoreListener() {
        store.addSessionListener("beforeStore", event => {
            if (event.getEntity() instanceof User) {
                event.getDocumentMetadata()["@collection"] = "Users";
                event.getDocumentMetadata()["Prop"] = randomUUID();
            }
        });
    }

    function assertMetadata(session: IDocumentSession, user: User, key: string, flag: string) {
        const metadata = session.advanced.getMetadataFor(user);
        assertThat(key in metadata).isTrue();
        assertThat(metadata[CONSTANTS.Documents.Metadata.FLAGS]).contains(flag);
    }

    function assertAttachments(session: IDocumentSession, user: User) {
        assertMetadata(session, user, CONSTANTS.Documents.Metadata.ATTACHMENTS, "HasAttachments");
        assertThat(session.advanced.attachments.getNames(user)).hasSize(1);
    }

    it("number of attachments needs to match async", async () => {
        addBeforeStoreListener();

        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Test" });
            await session.store(user, "users/1");
            session.advanced.attachments.store(user, "attachment-1", Buffer.from([1, 2, 3]));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let user = await session.load("users/1", User);
            assertAttachments(session, user);

            user.name = "Test 2";
            await session.saveChanges();
            assertAttachments(session, user);

            session.advanced.clear();
            user = await session.load("users/1", User);
            assertAttachments(session, user);
        }
    });

    it("number of time series needs to match async", async () => {
        addBeforeStoreListener();

        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Test" });
            await session.store(user, "users/1");
            session.timeSeriesFor(user, "timeseries-1").append(new Date(), 1);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let user = await session.load("users/1", User);
            assertMetadata(session, user, CONSTANTS.Documents.Metadata.TIME_SERIES, "HasTimeSeries");

            user.name = "Test 2";
            await session.saveChanges();
            assertMetadata(session, user, CONSTANTS.Documents.Metadata.TIME_SERIES, "HasTimeSeries");

            session.advanced.clear();
            user = await session.load("users/1", User);
            assertMetadata(session, user, CONSTANTS.Documents.Metadata.TIME_SERIES, "HasTimeSeries");
        }
    });

    it("number of counters needs to match async", async () => {
        addBeforeStoreListener();

        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Test" });
            await session.store(user, "users/1");
            session.countersFor(user).increment("counter-1", 3);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let user = await session.load("users/1", User);
            assertMetadata(session, user, CONSTANTS.Documents.Metadata.COUNTERS, "HasCounters");

            user.name = "Test 2";
            await session.saveChanges();
            assertMetadata(session, user, CONSTANTS.Documents.Metadata.COUNTERS, "HasCounters");

            session.advanced.clear();
            user = await session.load("users/1", User);
            assertMetadata(session, user, CONSTANTS.Documents.Metadata.COUNTERS, "HasCounters");
        }
    });

    it("changing metadata should not remove any system properties", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "Test" });
            await session.store(user, "users/1");
            session.countersFor(user).increment("counter-1", 3);
            await session.saveChanges();
        }

        {
            const session = store.openSession({ transactionMode: "ClusterWide" });
            const user = await session.load("users/1", User);
            user.name = "Test2";

            session.advanced.getMetadataFor(user)["Prop"] = randomUUID();

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name).isEqualTo("RavenException");
                assertThat(err.message).contains("has counters, this is not supported in cluster wide transaction");
            });
        }
    });
});
