import * as assert from "assert";
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    PointField, WktField, QueryStatistics,
} from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

(RavenTestContext.is60Server ? describe.skip : describe)("Issue RavenDB-8328", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can do spatial on auto index", async () => {
        {
            const session = store.openSession();
            const item = new Item();
            item.latitude = 10;
            item.longitude = 20;
            item.latitude2 = 10;
            item.longitude2 = 20;
            item.shapeWkt = "POINT(20 10)";
            item.name = "Name1";
            await session.store(item);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let q = session.query(Item)
                .spatial(new PointField("latitude", "longitude"), f => f.withinRadius(10, 10, 20));
            let iq = q.getIndexQuery();
            assert.strictEqual(iq.query, "from 'Items' " +
                "where spatial.within(spatial.point(latitude, longitude), spatial.circle($p0, $p1, $p2))");

            q = session.query(Item)
                .spatial(new WktField("shapeWkt"), f => f.withinRadius(10, 10, 20));
            iq = q.getIndexQuery();
            assert.strictEqual(iq.query,
                "from 'Items' where spatial.within(spatial.wkt(shapeWkt), spatial.circle($p0, $p1, $p2))");
        }

        {
            const session = store.openSession();

            let stats = null as QueryStatistics;

            let results = await session.query(Item)
                .statistics(x => stats = x)
                .spatial(new PointField("latitude", "longitude"), f => f.withinRadius(10, 10, 20))
                .all();

            assert.strictEqual(results.length, 1);
            assert.strictEqual(stats.indexName, "Auto/Items/BySpatial.point(latitude|longitude)");

            stats = null;

            results = await session.query(Item)
                .statistics(x => stats = x)
                .spatial(new PointField("latitude2", "longitude2"), f => f.withinRadius(10, 10, 20))
                .all();

            assert.strictEqual(results.length, 1);
            assertThat(stats.indexName)
                .contains("Auto/Items/BySpatial.point")
                .contains("AndSpatial.point");

            stats = null;

            results = await session.query(Item)
                .statistics(x => stats = x)
                .spatial(new WktField("shapeWkt"), f => f.withinRadius(10, 10, 20))
                .all();

            assert.strictEqual(results.length, 1);
            assertThat(stats.indexName)
                .contains("Auto/Items/BySpatial.point");
        }
    });

});

export class Item {
    public id: string;
    public name: string;
    public latitude: number;
    public longitude: number;
    public latitude2: number;
    public longitude2: number;
    public shapeWkt;
}
