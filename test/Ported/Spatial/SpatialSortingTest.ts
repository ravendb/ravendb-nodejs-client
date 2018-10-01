import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    IndexDefinition,
    IndexFieldOptions,
    PutIndexesOperation,
} from "../../../src";

describe("SpatialSortingTest", function () {

    let store: IDocumentStore;

    const FILTERED_LAT = 44.419575;
    const FILTERED_LNG = 34.042618;
    const SORTED_LAT = 44.417398;
    const SORTED_LNG = 34.042575;
    const FILTERED_RADIUS = 100;

    class Shop {
        public id: string;
        public latitude: number;
        public longitude: number;

        public constructor();
        public constructor(latitude: number, longitude: number);
        public constructor(latitude?: number, longitude?: number) {
            this.latitude = latitude;
            this.longitude = longitude;
        }
    }

    let expectedShops: Shop[];

    //shop/1:0.36KM, shop/2:0.26KM, shop/3 0.15KM from (34.042575,  44.417398)
    const sortedExpectedOrder = ["shops/3-A", "shops/2-A", "shops/1-A"];

    //shop/1:0.12KM, shop/2:0.03KM, shop/3 0.11KM from (34.042618,  44.419575)
    const filteredExpectedOrder = ["shops/2-A", "shops/3-A", "shops/1-A"];

    // tslint:disable-next-line:no-shadowed-variable
    async function createData(store: IDocumentStore) {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "eventsByLatLng";
        indexDefinition.maps = new Set([`from e in docs.Shops 
            select new { e.venue, coordinates = CreateSpatialField(e.latitude, e.longitude) }`]);

        const fields: { [key: string]: IndexFieldOptions } = {};
        const options = new IndexFieldOptions();
        options.indexing = "Exact";
        fields["tag"] = options;
        indexDefinition.fields = fields;

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        const indexDefinition2 = new IndexDefinition();
        indexDefinition2.name = "eventsByLatLngWSpecialField";
        indexDefinition2.maps = new Set([
            "from e in docs.Shops select new { e.venue, mySpacialField = CreateSpatialField(e.latitude, e.longitude) }"
        ]);

        const indexFieldOptions = new IndexFieldOptions();
        indexFieldOptions.indexing = "Exact";
        indexDefinition2.fields = { tag: indexFieldOptions };

        await store.maintenance.send(new PutIndexesOperation(indexDefinition2));

        {
            const session = store.openSession();
            for (const shop of expectedShops) {
                await session.store(shop);
            }

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);
    }

    beforeEach(() => {
        expectedShops = [
            new Shop(44.420678, 34.042490),
            new Shop(44.419712, 34.042232),
            new Shop(44.418686, 34.043219)];
    });

    beforeEach(async () => {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canFilterByLocationAndSortByDistanceFromDifferentPointWDocQuery", async () => {
        await createData(store);

        const session = store.openSession();
        const shops = await session.query({
            documentType: Shop,
            indexName: "eventsByLatLng"
        })
            .spatial("coordinates", f => f.within(getQueryShapeFromLatLon(FILTERED_LAT, FILTERED_LNG, FILTERED_RADIUS)))
            .orderByDistance("coordinates", SORTED_LAT, SORTED_LNG)
            .all();

        assert.deepStrictEqual(shops.map(x => x.id), sortedExpectedOrder);
    });

    it("canSortByDistanceWOFilteringWDocQuery", async () => {
        await createData(store);

        const session = store.openSession();
        const shops = await session.query({ documentType: Shop, indexName: "eventsByLatLng" })
            .orderByDistance("coordinates", SORTED_LAT, SORTED_LNG)
            .all();

        assert.deepStrictEqual(shops.map(x => x.id), sortedExpectedOrder);
    });

    it("canSortByDistanceWOFilteringWDocQueryBySpecifiedField", async () => {
        await createData(store);
        {
            const session = store.openSession();
            const shops = await session.query<Shop>({
                documentType: Shop,
                indexName: "eventsByLatLngWSpecialField"
            })
                .orderByDistance("mySpacialField", SORTED_LAT, SORTED_LNG)
                .all();

            assert.deepStrictEqual(shops.map(x => x.id), sortedExpectedOrder);
        }
    });

    it("canSortByDistanceWOFiltering", async () => {

        await createData(store);

        {
            const session = store.openSession();
            const shops = await session.query<Shop>({
                documentType: Shop,
                indexName: "eventsByLatLng"
            })
                .orderByDistance("coordinates", FILTERED_LAT, FILTERED_LNG)
                .all();

            assert.deepStrictEqual(shops.map(x => x.id), filteredExpectedOrder);
        }

        {
            const session = store.openSession();
            const shops = await session.query<Shop>({
                documentType: Shop,
                indexName: "eventsByLatLng"
            })
                .orderByDistanceDescending("coordinates", FILTERED_LAT, FILTERED_LNG)
                .all();

            const strings = shops.map(x => x.id);
            strings.reverse();
            assert.deepStrictEqual(strings, filteredExpectedOrder);
        }
    });

    it("canSortByDistanceWOFilteringBySpecifiedField", async () => {
        await createData(store);

        {
            const session = store.openSession();
            const shops = await session.query<Shop>({
                documentType: Shop, indexName: "eventsByLatLngWSpecialField"
            })
                .orderByDistance("mySpacialField", FILTERED_LAT, FILTERED_LNG)
                .all();

            assert.deepStrictEqual(shops.map(x => x.id), filteredExpectedOrder);
        }

        {
            const session = store.openSession();
            const shops = await session.query<Shop>({
                documentType: Shop,
                indexName: "eventsByLatLngWSpecialField"
            })
                .orderByDistanceDescending("mySpacialField", FILTERED_LAT, FILTERED_LNG)
                .all();

            const strings = shops.map(x => x.id);
            strings.reverse();
            assert.deepStrictEqual(strings, filteredExpectedOrder);
        }
    });

});

function getQueryShapeFromLatLon(lat: number, lng: number, radius: number) {
    return "Circle(" + lng + " " + lat + " d=" + radius + ")";
}
