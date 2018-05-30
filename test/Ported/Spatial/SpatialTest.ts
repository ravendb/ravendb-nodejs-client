import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask,
    QueryStatistics,
} from "../../../src";

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

    class MyIndex extends AbstractIndexCreationTask {
        public constructor() {
            super();

            this.map =
                `docs.MyDocuments.SelectMany(doc => doc.items, (doc, item) => new {
                        doc = doc,
                        item = item
                    }).Select(this0 => new {
                        this0 = this0,
                        lat = ((double)(this0.item.latitude ?? 0))
                    }).Select(this1 => new {
                        this1 = this1,
                        lng = ((double)(this1.this0.item.longitude ?? 0))
                    }).Select(this2 => new {
                        id = Id(this2.this1.this0.doc),
                        date = this2.this1.this0.item.date,
                        latitude = this2.this1.lat,
                        longitude = this2.lng,
                        coordinates = this.CreateSpatialField(((double ? ) this2.this1.lat), ((double ? ) this2.lng))
                    })`;

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

            const result = await session.advanced
                .documentQuery<MyDocument>({
                    indexName: MyIndex.name,
                    documentType: MyDocument
                })
                .waitForNonStaleResults()
                .withinRadiusOf("coordinates", 0, 12.3456789, 12.3456789)
                .statistics($ => stats = $)
                .selectFields<MyProjection>(["id", "latitude", "longitude"], MyProjection)
                .take(50)
                .all();

            assert.equal(stats.totalResults, 0);
            assert.equal(result.length, 0);
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

            const result = await session.advanced
                .documentQuery<MyDocument>({
                    indexName: MyIndex.name,
                    documentType: MyDocument
                })
                .waitForNonStaleResults()
                .withinRadiusOf("coordinates", 0, 10, 10)
                .statistics($ => stats = $)
                .selectFields<MyProjection>(["id", "latitude", "longitude"], MyProjection)
                .take(50)
                .all();

            assert.equal(stats.totalResults, 1);
            assert.equal(result.length, 1);
        }
    });

});
