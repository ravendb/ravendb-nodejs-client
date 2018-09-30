import * as moment from "moment";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask,
    QueryStatistics,
} from "../../../src";

describe("SpatialSearchTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can do spatial search with client api", async () => {
        await new SpatialIdx().execute(store);

        {
            const session = store.openSession();
            await session.store(new Event("a/1", 38.9579000, -77.3572000, new Date(), 5000));
            await session.store(new Event("a/2", 38.9690000, -77.3862000, moment().add(1, "days").toDate(), 5000));
            await session.store(new Event("b/2", 38.9690000, -77.3862000, moment().add(2, "days").toDate(), 2000));
            await session.store(new Event("c/3", 38.9510000, -77.4107000, moment().add(3, "years").toDate(), 1500));
            await session.store(new Event("d/1", 37.9510000, -77.4107000, moment().add(3, "years").toDate(), 1500));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();

            let queryStats: QueryStatistics;
            const events = await session.query({
                indexName: "SpatialIdx",
                documentType: Event
            })
                .statistics(_queryStats => queryStats = _queryStats)
                .openSubclause()
                .whereGreaterThanOrEqual("capacity", 0)
                .andAlso()
                .whereLessThanOrEqual("capacity", 2000)
                .closeSubclause()
                .withinRadiusOf("coordinates", 6.0, 38.96939, -77.386398)
                .orderByDescending("date")
                .all();

            assert.strictEqual(queryStats.totalResults, 2);
            assert.deepStrictEqual(events.map(x => x.venue), ["c/3", "b/2"]);
        }
    });

    it("can do spatial search with client api 3", async () => {
        await new SpatialIdx().execute(store);
        {
            const session = store.openSession();
            const matchingValues = session.advanced.documentQuery({
                documentType: Event,
                indexName: SpatialIdx.name
            })
                .spatial("coordinates", f => f.withinRadius(5, 38.9103000, -77.3942))
                .waitForNonStaleResults();

            const iq = matchingValues.getIndexQuery();
            assert.strictEqual(
                iq.query,
                "from index 'SpatialIdx' where spatial.within(coordinates, spatial.circle($p0, $p1, $p2))");

            assert.strictEqual(iq.queryParameters["p0"], 5.0);
            assert.strictEqual(iq.queryParameters["p1"], 38.9103);
            assert.strictEqual(iq.queryParameters["p2"], -77.3942);
        }
    });

    it("can do spatial search with client api within given capacity", async () => {
        await new SpatialIdx().execute(store);

        {
            const session = store.openSession();
            await session.store(new Event("a/1", 38.9579000, -77.3572000, new Date(), 5000));
            await session.store(new Event("a/2", 38.9690000, -77.3862000, moment().add(1, "days").toDate(), 5000));
            await session.store(new Event("b/2", 38.9690000, -77.3862000, moment().add(2, "days").toDate(), 2000));
            await session.store(new Event("c/3", 38.9510000, -77.4107000, moment().add(3, "years").toDate(), 1500));
            await session.store(new Event("d/1", 37.9510000, -77.4107000, moment().add(3, "years").toDate(), 1500));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let queryStats: QueryStatistics;

            const events = await session.query({
                documentType: Event,
                indexName: "SpatialIdx"
            })
                .statistics($ => queryStats = $)
                .openSubclause()
                .whereGreaterThanOrEqual("capacity", 0)
                .andAlso()
                .whereLessThanOrEqual("capacity", 2000)
                .closeSubclause()
                .withinRadiusOf("coordinates", 6.0, 38.96939, -77.386398)
                .orderByDescending("date")
                .all();

            assert.strictEqual(queryStats.totalResults, 2);
            assert.deepStrictEqual(events.map(x => x.venue), ["c/3", "b/2"]);
        }
    });

    it("can do spatial search with client api add order", async () => {
        await new SpatialIdx().execute(store);

        {
            const session = store.openSession();
            await session.store(new Event("a/1", 38.9579000, -77.3572000));
            await session.store(new Event("b/1", 38.9579000, -77.3572000));
            await session.store(new Event("c/1", 38.9579000, -77.3572000));
            await session.store(new Event("a/2", 38.9690000, -77.3862000));
            await session.store(new Event("b/2", 38.9690000, -77.3862000));
            await session.store(new Event("c/2", 38.9690000, -77.3862000));
            await session.store(new Event("a/3", 38.9510000, -77.4107000));
            await session.store(new Event("b/3", 38.9510000, -77.4107000));
            await session.store(new Event("c/3", 38.9510000, -77.4107000));
            await session.store(new Event("d/1", 37.9510000, -77.4107000));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const events = await session.query<Event>({
                documentType: Event,
                indexName: "SpatialIdx"
            })
                .withinRadiusOf("coordinates", 6.0, 38.96939, -77.386398)
                .orderByDistance("coordinates", 38.96939, -77.386398)
                .addOrder("venue", false)
                .all();

            assert.deepStrictEqual(events.map(x => x.venue),
                ["a/2", "b/2", "c/2", "a/1", "b/1", "c/1", "a/3", "b/3", "c/3"]);
        }

        {
            const session = store.openSession();
            const events = await session.query({ documentType: Event, indexName: "SpatialIdx" })
                .withinRadiusOf("coordinates", 6.0, 38.96939, -77.386398)
                .addOrder("venue", false)
                .orderByDistance("coordinates", 38.96939, -77.386398)
                .all();

            assert.deepStrictEqual(events.map(x => x.venue),
                ["a/1", "a/2", "a/3", "b/1", "b/2", "b/3", "c/1", "c/2", "c/3"]);
        }
    });
});

export class SpatialIdx extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = `docs.Events.Select(e => new {
                capacity = e.capacity,
                venue = e.venue,
                date = e.date,
                coordinates = this.CreateSpatialField(((double ? ) e.latitude), ((double ? ) e.longitude))
            })`;

        this.index("venue", "Search");
    }
}

class Event {
    public venue: string;
    public latitude: number;
    public longitude: number;
    public date: Date;
    public capacity: number;

    public constructor(venue: string, latitude: number, longitude: number);
    public constructor(venue: string, latitude: number, longitude: number, date: Date);
    public constructor(venue: string, latitude: number, longitude: number, date: Date, capacity: number);
    public constructor(venue: string, latitude: number, longitude: number, date?: Date, capacity?: number) {
        this.venue = venue;
        this.latitude = latitude;
        this.longitude = longitude;
        this.date = date;
        this.capacity = capacity;
    }
}
