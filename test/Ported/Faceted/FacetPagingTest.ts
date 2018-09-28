
import * as assert from "assert";
import {disposeTestDocumentStore, testContext} from "../../Utils/TestUtil";

import {
    IDocumentStore, IndexDefinition, PutIndexesOperation,
} from "../../../src";
import {Camera, FacetTestContext} from "../../Utils/FacetTestContext";
import {FacetOptions} from "../../../src/Documents/Queries/Facets";
import {Facet} from "../../../src/Documents/Queries/Facets/Facet";
import {FacetSetup} from "../../../src/Documents/Queries/Facets/FacetSetup";
import {FacetResultObject} from "../../../src/Documents/Queries/Facets/AggregationQueryBase";
import * as orderBy from "lodash.orderby";

describe("FacetPagingTest", function () {

    let store: IDocumentStore;
    let facetContext: FacetTestContext;

    const numCameras = 1000;
    let data: Camera[];

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        facetContext = new FacetTestContext();
        data = FacetTestContext.getCameras(numCameras);
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canPerformFacetedPagingSearchWithNoPageSizeNoMaxResults_HitsDesc", async () => {
        const facetOptions = new FacetOptions();
        facetOptions.start = 2;
        facetOptions.termSortMode = "CountDesc";
        facetOptions.includeRemainingTerms = true;

        const facet = new Facet();
        facet.fieldName = "manufacturer";
        facet.options = facetOptions;

        const facets = [facet];

        await setup();

        {
            const session = store.openSession();
            const facetSetup = new FacetSetup();
            facetSetup.id = "facets/CameraFacets";
            facetSetup.facets = facets;
            await session.store(facetSetup);
            await session.saveChanges();

            const facetResults = await session.query({
                indexName: "CameraCost",
                documentType: Camera
            })
                .aggregateUsing("facets/CameraFacets")
                .execute();

            const cameraCounts: any = data.reduce((p, c) => {
                p[c.manufacturer] = (p[c.manufacturer] || 0) + 1;
                return p;
            }, {});

            const camerasByHits =
                orderBy(Object.keys(cameraCounts).map(k => ({ manufacturer: k, count: cameraCounts[k] })),
                    ["count", "manufacturer"],
                    ["desc", "asc"])
                    .splice(2)
                    .map(x => x.manufacturer.toLocaleLowerCase());

            assert.strictEqual(facetResults["manufacturer"].values.length, 3);

            assert.strictEqual(facetResults["manufacturer"].values[0].range, camerasByHits[0]);
            assert.strictEqual(facetResults["manufacturer"].values[1].range, camerasByHits[1]);
            assert.strictEqual(facetResults["manufacturer"].values[2].range, camerasByHits[2]);

            for (const f of facetResults["manufacturer"].values) {
                const inMemoryCount
                    = data.filter(x => x.manufacturer.toLocaleLowerCase() === f.range.toLocaleLowerCase()).length;

                assert.strictEqual(f.count, inMemoryCount);

                assert.strictEqual(facetResults["manufacturer"].remainingTermsCount, 0);
                assert.strictEqual(facetResults["manufacturer"].remainingTerms.length, 0);
                assert.strictEqual(facetResults["manufacturer"].remainingHits, 0);
            }
        }
    });

    it("canPerformFacetedPagingSearchWithNoPageSizeWithMaxResults_HitsDesc", async () => {
        const facetOptions = new FacetOptions();
        facetOptions.start = 2;
        facetOptions.pageSize = 2;
        facetOptions.termSortMode = "CountDesc";
        facetOptions.includeRemainingTerms = true;

        const facet = new Facet();
        facet.fieldName = "manufacturer";
        facet.options = facetOptions;

        const facets = [facet];

        await setup();

        {
            const session = store.openSession();
            const facetSetup = new FacetSetup();
            facetSetup.id = "facets/CameraFacets";
            facetSetup.facets = facets;
            await session.store(facetSetup);
            await session.saveChanges();

            const facetResults = await session.query({
                indexName: "CameraCost",
                documentType: Camera
            })
                .aggregateUsing("facets/CameraFacets")
                .execute();

            const cameraCounts: any = data.reduce((p, c) => {
                p[c.manufacturer] = (p[c.manufacturer] || 0) + 1;
                return p;
            }, {});

            const camerasByHits =
                orderBy(Object.keys(cameraCounts).map(k => ({ manufacturer: k, count: cameraCounts[k] })),
                    ["count", "manufacturer"],
                    ["desc", "asc"])
                    .splice(2)
                    .slice(0, 2)
                    .map(x => x.manufacturer.toLocaleLowerCase());

            assert.strictEqual(facetResults["manufacturer"].values.length, 2);

            assert.strictEqual(facetResults["manufacturer"].values[0].range, camerasByHits[0]);
            assert.strictEqual(facetResults["manufacturer"].values[1].range, camerasByHits[1]);

            for (const f of facetResults["manufacturer"].values) {
                const inMemoryCount
                    = data.filter(x => x.manufacturer.toLocaleLowerCase() === f.range.toLocaleLowerCase()).length;

                assert.strictEqual(f.count, inMemoryCount);

                assert.strictEqual(facetResults["manufacturer"].remainingTermsCount, 1);
                assert.strictEqual(facetResults["manufacturer"].remainingTerms.length, 1);

                const counts =
                    orderBy(Object.keys(cameraCounts).map(k => ({ manufacturer: k, count: cameraCounts[k] })),
                        ["count", "manufacturer"],
                        ["desc", "asc"])
                        .map(x => x.count);

                assert.strictEqual(counts[counts.length - 1], facetResults["manufacturer"].remainingHits);
            }
        }
    });

    const setup = async () => {
        {
            const s = store.openSession();

            const indexDefinition = new IndexDefinition();
            indexDefinition.name = "CameraCost";
            indexDefinition.maps =
                new Set(["from camera in docs " +
                "select new { " +
                "camera.manufacturer, camera.model, " +
                "camera.cost, camera.dateOfListing, " +
                "camera.megapixels } "]);

            await store.maintenance.send(new PutIndexesOperation(indexDefinition));

            let counter = 0;
            for (const camera of data) {
                await s.store(camera);
                counter++;

                if (counter % (numCameras / 25) === 0) {
                    await s.saveChanges();
                }
            }

            await s.saveChanges();
        }

        await testContext.waitForIndexing(store);
    };
});
