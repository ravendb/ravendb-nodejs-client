import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import { PointField } from "../../../src/Documents/Queries/Spatial/PointField";
import { AbstractIndexCreationTask } from "../../../src/Documents/Indexes/AbstractIndexCreationTask";
import { CreateSampleDataOperation } from "../../Utils/CreateSampleDataOperation";
import { Order } from "../../Assets/Orders";

describe("RavenDB_13682", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canQueryByRoundedSpatialRanges", async () => {
        {
            const s = store.openSession();
            // 35.1, -106.3 - destination
            const item1 = Object.assign(new Item(), { // 3rd dist - 72.7 km
                lat: 35.1,
                lng: -107.1,
                name: "a"
            } as Item);
            await s.store(item1);

            const item2 = Object.assign(new Item(), { // 2nd dist - 64.04 km
                lat: 35.2,
                lng: -107.0,
                name: "b"
            } as Item);
            await s.store(item2);

            const item3 = Object.assign(new Item(), { // 1st dist - 28.71 km
                lat: 35.5,
                lng: -106.5,
                name: "c"
            } as Item);
            await s.store(item3);
            await s.saveChanges();
        }

        {
            const s = store.openSession();

            // we sort first by spatial distance (but round it up to 25km)
            // then we sort by name ascending, so within 25 range, we can apply a different sort

            const result: Item[] = await s.advanced.rawQuery<Item>("from Items as a " +
                "order by spatial.distance(spatial.point(a.lat, a.lng), spatial.point(35.1, -106.3), 25), name", Item)
                .all();

            assertThat(result)
                .hasSize(3);

            assertThat(result[0].name)
                .isEqualTo("c");
            assertThat(result[1].name)
                .isEqualTo("a");
            assertThat(result[2].name)
                .isEqualTo("b");
        }
        {
            const s = store.openSession();
            // we sort first by spatial distance (but round it up to 25km)
            // then we sort by name ascending, so within 25 range, we can apply a different sort

            const query = s.query<Item>(Item)
                .orderByDistance(new PointField("lat", "lng").roundTo(25), 35.1, -106.3);

            const result = await query.all();
            assertThat(result)
                .hasSize(3);

            assertThat(result[0].name)
                .isEqualTo("c");
            assertThat(result[1].name)
                .isEqualTo("a");
            assertThat(result[2].name)
                .isEqualTo("b");
        }

        await new SpatialIndex().execute(store);

        await testContext.waitForIndexing(store);

        {
            const s = store.openSession();
            // we sort first by spatial distance (but round it up to 25km)
            // then we sort by name ascending, so within 25 range, we can apply a different sort

            const query = s.query<Item>({ documentType: Item, indexName: SpatialIndex.name })
                .orderByDistance("coordinates", 35.1, -106.3, 25);

            const result = await query.all();

            assertThat(result)
                .hasSize(3);

            assertThat(result[0].name)
                .isEqualTo("c");
            assertThat(result[1].name)
                .isEqualTo("a");
            assertThat(result[2].name)
                .isEqualTo("b");
        }
    });

    it("canUseDynamicQueryOrderBySpatial_WithAlias", async () => {
        await store.maintenance.send(new CreateSampleDataOperation(["Documents", "Indexes"]));

        {
            const s = store.openSession();
            const d = await s.advanced.rawQuery("from Orders  as a\n" +
                "order by spatial.distance(\n" +
                "    spatial.point(a.ShipTo.Location.Latitude, a.ShipTo.Location.Longitude),\n" +
                "    spatial.point(35.2, -107.2 )\n" +
                ")\n" +
                "limit 1", Order)
            .first();

            const metadata = s.advanced.getMetadataFor(d);
            const spatial = metadata["@spatial"];
            assertThat(spatial.Distance)
                .isCloseTo(48.99, 0.01);
        }
    });

    it("canGetDistanceFromSpatialQuery", async () => {
        await store.maintenance.send(new CreateSampleDataOperation(["Documents", "Indexes"]));

        await testContext.waitForIndexing(store);

        {
            const s = store.openSession();
            const d = await s.query({ documentType: Order, indexName: "Orders/ByShipment/Location" })
                .whereEquals("id()", "orders/830-A")
                .orderByDistance("ShipmentLocation", 35.2, -107.1)
                .single();

            const metadata = s.advanced.getMetadataFor(d);

            const spatial = metadata["@spatial"];
            assertThat(spatial.Distance)
                .isCloseTo(40.1, 0.1);

        }
    });

});

class SpatialIndex extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = `docs.Items.Select(doc => new {
    name = doc.name, 
    coordinates = this.CreateSpatialField(doc.lat, doc.lng)
})`;
    }
}

class Item {
    public lat: number;
    public lng: number;
    public name: string;
}