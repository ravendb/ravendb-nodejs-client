import * as assert from "node:assert";
import { addDays, addHours } from "date-fns";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { IDocumentSession, IDocumentStore } from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_22959", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const baseTime = new Date(Date.UTC(2024, 0, 1, 1, 30, 0));
    const from = addHours(baseTime, 12);
    const to = addHours(baseTime, 60);
    const tags = ["watches/apple", "watches/galaxy", "watches/fitbit", "watches/garmin"];

    async function appendTimeSeries(ids: string[]) {
        const session = store.openSession();
        let time = baseTime;
        for (let i = 0; i < tags.length; i++) {
            for (let t = 1; t <= 3; t++) {
                for (const id of ids) {
                    session.timeSeriesFor(id, "TimeSeries" + t).append(time, t * 10 + i, tags[i]);
                }
            }
            await session.saveChanges();

            time = addDays(time, 1);
        }
    }

    async function assertRangeEntries(session: IDocumentSession, user: User) {
        for (let t = 1; t <= 3; t++) {
            const entries = await session.timeSeriesFor(user, "TimeSeries" + t).get(from, to);
            assert.strictEqual(entries.length, 2);
            assert.strictEqual(entries[0].tag, tags[1]);
            assert.strictEqual(entries[1].tag, tags[2]);
        }
    }

    async function assertEntriesBeforeRangeNotIncluded(session: IDocumentSession, user: User, expectedRequests: number) {
        const entries = await session.timeSeriesFor(user, "TimeSeries1").get(baseTime, addHours(baseTime, 1));
        assert.strictEqual(entries.length, 1);
        assert.strictEqual(entries[0].tag, tags[0]);
        assert.strictEqual(session.advanced.numberOfRequests, expectedRequests);
    }

    async function assertAllEntries(session: IDocumentSession, user: User) {
        for (let t = 1; t <= 3; t++) {
            const entries = await session.timeSeriesFor(user, "TimeSeries" + t).get();
            assert.strictEqual(entries.length, 4);
        }
    }

    it("sessionLoadWithIncludeAllTimeSeriesByRange", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { id: "Users/1", name: "Shahar" });
            await session.store(user);
            await session.saveChanges();
        }

        await appendTimeSeries(["Users/1"]);

        {
            const session = store.openSession();
            const queryResults = await session.query(User)
                .whereEquals("id", "Users/1")
                .include(i => i.includeAllTimeSeries(from, to))
                .all();

            assert.strictEqual(queryResults.length, 1);
            await assertRangeEntries(session, queryResults[0]);

            assert.strictEqual(session.advanced.numberOfRequests, 1);

            await assertEntriesBeforeRangeNotIncluded(session, queryResults[0], 2);
        }

        {
            const session = store.openSession();
            const user = await session.load("Users/1", {
                documentType: User,
                includes: i => i.includeAllTimeSeries(from, to)
            });

            await assertRangeEntries(session, user);

            assert.strictEqual(session.advanced.numberOfRequests, 1);

            await assertEntriesBeforeRangeNotIncluded(session, user, 2);
        }

        {
            const session = store.openSession();
            const queryResults = await session.query(User)
                .whereEquals("id", "Users/1")
                .include(i => i.includeAllTimeSeries())
                .all();

            assert.strictEqual(queryResults.length, 1);
            await assertAllEntries(session, queryResults[0]);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }

        {
            const session = store.openSession();
            const user = await session.load("Users/1", {
                documentType: User,
                includes: i => i.includeAllTimeSeries()
            });

            await assertAllEntries(session, user);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }
    });

    it("sessionLoadWithIncludeAllTimeSeriesByRangeWithMultipleDocs", async () => {
        const ids = ["Users/1", "Users/2", "Users/3", "Users/4"];

        {
            const session = store.openSession();
            for (let i = 0; i < ids.length; i++) {
                const name = i % 2 === 0 ? "Shahar" : "Omer";
                await session.store(Object.assign(new User(), { id: ids[i], name }));
                await session.saveChanges();
            }
        }

        await appendTimeSeries(ids);

        for (const includeRange of [true, false]) {
            const session = store.openSession();
            const shaharResults = await session.query(User)
                .whereEquals("name", "Shahar")
                .waitForNonStaleResults()
                .include(i => includeRange ? i.includeAllTimeSeries(from, to) : i.includeAllTimeSeries())
                .all();

            assert.strictEqual(shaharResults.length, 2);
            for (const user of shaharResults) {
                await assertRangeEntries(session, user);
            }

            assert.strictEqual(session.advanced.numberOfRequests, 1);

            const omerResults = await session.query(User)
                .whereEquals("name", "Omer")
                .waitForNonStaleResults()
                .all();

            for (const user of omerResults) {
                await assertRangeEntries(session, user);
            }

            assert.strictEqual(session.advanced.numberOfRequests, 8);

            await assertEntriesBeforeRangeNotIncluded(session, shaharResults[0], includeRange ? 9 : 8);
        }
    });

});
