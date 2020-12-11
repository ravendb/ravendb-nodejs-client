import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    QueryStatistics,
} from "../../../src";
import { AbstractJavaScriptIndexCreationTask } from "../../../src/Documents/Indexes/AbstractJavaScriptIndexCreationTask";

describe("SpatialTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    class MyDocumentItem {
        public date: Date;
        public latitude: number;
        public longitude: number;
    }

    class MyDocument {
        public id: string;
        public items: MyDocumentItem[];
    }

    class MyProjection {
        public id: string;
        public date: Date;
        public latitude: number;
        public longitude: number;
    }

    class MyIndex extends AbstractJavaScriptIndexCreationTask<MyDocument, MyProjection> {
        public constructor() {
            super();

            const { createSpatialField } = this.mapUtils();

            this.map(MyDocument, doc => {
                const results: MyProjection[] = [];

                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < doc.items.length; i++) {
                    const item = doc.items[i];
                    const lat = item.latitude || 0;
                    const lng = item.longitude || 0;

                    return {
                        id: doc.id,
                        date: item.date,
                        latitude: lat,
                        longitude: lng,
                        coordinates: createSpatialField(lat, lng)
                    }
                }

                return results;
            });

            this.store("id", "Yes");
            this.store("date", "Yes");

            this.store("latitude", "Yes");
            this.store("longitude", "Yes");
        }
    }

    it("weird spatial results", async () => {
        {
            const session = store.openSession();
            const myDocument = new MyDocument();
            myDocument.id = "First";

            const myDocumentItem = new MyDocumentItem();
            myDocumentItem.date = new Date();
            myDocumentItem.latitude = 10.0;
            myDocumentItem.longitude = 10.0;

            myDocument.items = [myDocumentItem];

            await session.store(myDocument);
            await session.saveChanges();
        }

        await new MyIndex().execute(store);
        {
            const session = store.openSession();
            let stats: QueryStatistics;

            const result = await session.query(MyProjection, MyIndex)
                .waitForNonStaleResults()
                .withinRadiusOf("coordinates", 0, 12.3456789, 12.3456789)
                .statistics($ => stats = $)
                .selectFields<MyProjection>(["id", "latitude", "longitude"], MyProjection)
                .take(50)
                .all();

            assert.strictEqual(stats.totalResults, 0);
            assert.strictEqual(result.length, 0);
        }
    });

    it("match spatial results", async () => {
        {
            const session = store.openSession();
            const myDocument = new MyDocument();
            myDocument.id = "First";

            const myDocumentItem = new MyDocumentItem();
            myDocumentItem.date = new Date();
            myDocumentItem.latitude = 10.0;
            myDocumentItem.longitude = 10.0;

            myDocument.items = [myDocumentItem];

            await session.store(myDocument);
            await session.saveChanges();
        }

        await new MyIndex().execute(store);

        {
            const session = store.openSession();
            let stats: QueryStatistics;

            const result = await session.query(MyDocument, MyIndex)
                .waitForNonStaleResults()
                .withinRadiusOf("coordinates", 0, 10, 10)
                .statistics($ => stats = $)
                .selectFields<MyProjection>(["id", "latitude", "longitude"], MyProjection)
                .take(50)
                .all();

            assert.strictEqual(stats.totalResults, 1);
            assert.strictEqual(result.length, 1);
        }
    });

});
