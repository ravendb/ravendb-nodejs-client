import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask,
    IndexDefinition,
    PutIndexesOperation,
} from "../../../src";

describe("SpatialQueriesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can run spatial queries in memory", async () => {
        await new SpatialQueriesInMemoryTestIdx()
            .execute(store);
    });

    it("can successfully do spatial query of nearby locations", async () => {
        // These items is in a radius of 4 miles (approx 6,5 km)
        const areaOneDocOne = new DummyGeoDoc(55.6880508001, 13.5717346673);
        const areaOneDocTwo = new DummyGeoDoc(55.6821978456, 13.6076183965);
        const areaOneDocThree = new DummyGeoDoc(55.673251569, 13.5946697607);

        // This item is 12 miles (approx 19 km) from the closest in areaOne
        const closeButOutsideAreaOne = new DummyGeoDoc(55.8634157297, 13.5497731987);

        // This item is about 3900 miles from areaOne
        const newYork = new DummyGeoDoc(40.7137578228, -74.0126901936);

        {
            const session = store.openSession();                
            await session.store(areaOneDocOne);
            await session.store(areaOneDocTwo);
            await session.store(areaOneDocThree);
            await session.store(closeButOutsideAreaOne);
            await session.store(newYork);
            await session.saveChanges();

            const indexDefinition = new IndexDefinition();
            indexDefinition.name = "FindByLatLng";
            indexDefinition.maps = new Set([`from doc in docs 
                select new { 
                    coordinates = CreateSpatialField(doc.latitude, doc.longitude) 
                }`]);
            
            await store.maintenance.send(new PutIndexesOperation(indexDefinition));

            await session.query({
                indexName: indexDefinition.name,
                documentType: DummyGeoDoc
            })
            .waitForNonStaleResults()
            .all(); 

            const lat = 55.6836422426;
            const lng = 13.5871808352; // in the middle of AreaOne
            const radius = 5.0;

            const nearbyDocs = await session.query({
                documentType: DummyGeoDoc,
                indexName: "FindByLatLng"
            })
            .withinRadiusOf("coordinates", radius, lat, lng)
            .waitForNonStaleResults()
            .all();

            assert.ok(nearbyDocs);
            assert.strictEqual(nearbyDocs.length, 3);
        }
    });

    it("can successfully query by miles", async () => {
        const myHouse = new DummyGeoDoc(44.757767, -93.355322);

        // The gym is about 7.32 miles (11.79 kilometers) from my house.
        const gym = new DummyGeoDoc(44.682861, -93.25);
        {
            const session = store.openSession();
            await session.store(myHouse);
            await session.store(gym);
            await session.saveChanges();

            const indexDefinition = new IndexDefinition();
            indexDefinition.name = "FindByLatLng";
            indexDefinition.maps = new Set([
                "from doc in docs select new { coordinates = CreateSpatialField(doc.latitude, doc.longitude) }"
            ]);
            
            await store.maintenance.send(new PutIndexesOperation(indexDefinition));

            // Wait until the index is built
            await session.query({ indexName: "FindByLatLng" })
                .waitForNonStaleResults()
                .all();

            const radius = 8; 
            
            // Find within 8 miles.
            // We should find both my house and the gym.
            const matchesWithinMiles = await session.query({
                indexName: "FindByLatLng"
            })
            .withinRadiusOf("coordinates", radius, myHouse.latitude, myHouse.longitude, "Miles")
            .waitForNonStaleResults()
            .all();

            assert.ok(matchesWithinMiles);
            assert.strictEqual(matchesWithinMiles.length, 2);

            // Find within 8 kilometers.
            // We should find only my house, since the gym is ~11 kilometers out.

            const matchesWithinKilometers = await session.query({
                indexName: "FindByLatLng"
            })
            .withinRadiusOf("coordinates", radius, myHouse.latitude, myHouse.longitude, "Kilometers")
            .waitForNonStaleResults()
            .all();

            assert.strictEqual(matchesWithinKilometers.length, 1);
        }
    });

});

export class Listing {
    public classCodes: string;
    public latitude: number;
    public longitude: number;
}

export class DummyGeoDoc {
    public id: string;
    public latitude: number;
    public longitude: number;

    public constructor(latitude: number, longitude: number) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}

class SpatialQueriesInMemoryTestIdx extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = `docs.Listings.Select(listingItem => new {
                classCodes = listingItem.classCodes,
                latitude = listingItem.latitude,
                longitude = listingItem.longitude,
                coordinates = this.CreateSpatialField(
                    ((double ? )((double)(listingItem.latitude))), 
                    ((double ? )((double)(listingItem.longitude))))
            })`;
    }
}
