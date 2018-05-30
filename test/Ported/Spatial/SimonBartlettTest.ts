import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask,
    SpatialOptions,
} from "../../../src";

describe("SimonBartlettTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("lineStringsShouldIntersect", async () => {

        await store.executeIndex(new GeoIndex());

        {
            const session = store.openSession();
            const geoDocument = new GeoDocument();
            geoDocument.WKT = "LINESTRING (0 0, 1 1, 2 1)";
            await session.store(geoDocument);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let count = await session.query({
                indexName: GeoIndex.name
            })
                .spatial("WKT", f => f.relatesToShape("LINESTRING (1 0, 1 1, 1 2)", "Intersects"))
                .waitForNonStaleResults()
                .count();

            assert.equal(count, 1);

            count = await session.query({ indexName: GeoIndex.name })
                .relatesToShape("WKT", "LINESTRING (1 0, 1 1, 1 2)", "Intersects")
                .waitForNonStaleResults()
                .count();

            assert.equal(count, 1);
        }

    });

    it("circlesShouldNotIntersect", async () => {
        await store.executeIndex(new GeoIndex());

        {
            const session = store.openSession();
            // 110km is approximately 1 degree
            const geoDocument = new GeoDocument();
            geoDocument.WKT = "CIRCLE(0.000000 0.000000 d=110)";
            await session.store(geoDocument);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            // Should not intersect, as there is 1 Degree between the two shapes
            let count = await session.query({
                indexName: GeoIndex.name
            })
            .spatial("WKT", f => f.relatesToShape("CIRCLE(0.000000 3.000000 d=110)", "Intersects"))
            .waitForNonStaleResults()
            .count();

            assert.equal(count, 0);

            count = await session.query({ indexName: GeoIndex.name })
                .relatesToShape("WKT", "CIRCLE(0.000000 3.000000 d=110)", "Intersects")
                .waitForNonStaleResults()
                .count();

            assert.equal(count, 0);
        }
    });

});
class GeoDocument {
    public WKT: string;
}
class GeoIndex extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = "docs.GeoDocuments.Select(doc => new {\n" +
            "    WKT = this.CreateSpatialField(doc.WKT)\n" +
            "})";

        const spatialOptions = new SpatialOptions();
        spatialOptions.strategy = "GeohashPrefixTree";

        this.spatialOptionsStrings["WKT"] = spatialOptions;
    }
}
