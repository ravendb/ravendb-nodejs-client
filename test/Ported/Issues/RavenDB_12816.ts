import { Facet, FacetSetup, IDocumentStore, RangeFacet } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Camera, CameraCostIndex, FacetTestContext } from "../../Utils/FacetTestContext";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_12816Test", function () {

    let store: IDocumentStore;
    let facetContext: FacetTestContext;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        facetContext = new FacetTestContext();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSendFacetedRawQuery", async () => {
        const index = new CameraCostIndex();
        await index.execute(store);

        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                const camera = new Camera();
                camera.id = "cameras/" + i;
                camera.manufacturer = i % 2 === 0 ? "Manufacturer1" : "Manufacturer2";
                camera.cost = i * 100;
                camera.megapixels = i;
                await session.store(camera);
            }

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        const facets: Facet[] = [];

        const facet1 = new Facet();
        facet1.fieldName = "manufacturer";
        facets.push(facet1);

        const rangeFacet1 = new RangeFacet();
        rangeFacet1.ranges = [
            "cost <= 200",
            "cost >= 300 and cost <= 400",
            "cost >= 500 and cost <= 600",
            "cost >= 700 and cost <= 800",
            "cost >= 900"
        ];

        const rangeFacet2 = new RangeFacet();
        rangeFacet2.ranges = [
            "megapixels <= 3",
            "megapixels >= 4 and megapixels <= 7",
            "megapixels >= 8 and megapixels <= 10",
            "megapixels >= 11"
        ];

        const rangeFacets = [rangeFacet1, rangeFacet2];

        {
            const session = store.openSession();
            const facetSetup = new FacetSetup();
            facetSetup.id = "facets/CameraFacets";
            facetSetup.facets = facets;
            facetSetup.rangeFacets = rangeFacets;
            await session.store(facetSetup);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const facetResults = await session.advanced.rawQuery("from index 'CameraCost' select facet(id('facets/CameraFacets'))", Camera)
                .executeAggregation();

            assertThat(facetResults)
                .hasSize(3);

            assertThat(facetResults.manufacturer.values)
                .hasSize(2);
            assertThat(facetResults.manufacturer.values[0].range)
                .isEqualTo("manufacturer1");
            assertThat(facetResults.manufacturer.values[0].count)
                .isEqualTo(5);
            assertThat(facetResults.manufacturer.values[1].range)
                .isEqualTo("manufacturer2");
            assertThat(facetResults.manufacturer.values[1].count)
                .isEqualTo(5);

            assertThat(facetResults.cost.values)
                .hasSize(5);

            assertThat(facetResults.cost.values[0].range)
                .isEqualTo("cost <= 200");
            assertThat(facetResults.cost.values[0].count)
                .isEqualTo(3);
            assertThat(facetResults.cost.values[1].range)
                .isEqualTo("cost >= 300 and cost <= 400");
            assertThat(facetResults.cost.values[1].count)
                .isEqualTo(2);
            assertThat(facetResults.cost.values[2].range)
                .isEqualTo("cost >= 500 and cost <= 600");
            assertThat(facetResults.cost.values[2].count)
                .isEqualTo(2);
            assertThat(facetResults.cost.values[3].range)
                .isEqualTo("cost >= 700 and cost <= 800");
            assertThat(facetResults.cost.values[3].count)
                .isEqualTo(2);
            assertThat(facetResults.cost.values[4].range)
                .isEqualTo("cost >= 900");
            assertThat(facetResults.cost.values[4].count)
                .isEqualTo(1);

            assertThat(facetResults.megapixels.values)
                .hasSize(4);

            assertThat(facetResults.megapixels.values[0].range)
                .isEqualTo("megapixels <= 3");
            assertThat(facetResults.megapixels.values[0].count)
                    .isEqualTo(4);
            assertThat(facetResults.megapixels.values[1].range)
                    .isEqualTo("megapixels >= 4 and megapixels <= 7");
            assertThat(facetResults.megapixels.values[1].count)
                    .isEqualTo(4);
            assertThat(facetResults.megapixels.values[2].range)
                    .isEqualTo("megapixels >= 8 and megapixels <= 10");
            assertThat(facetResults.megapixels.values[2].count)
                    .isEqualTo(2);
            assertThat(facetResults.megapixels.values[3].range)
                    .isEqualTo("megapixels >= 11");
            assertThat(facetResults.megapixels.values[3].count)
                    .isEqualTo(0);
        }

        {
            const session = store.openSession();
            const r1 = await session.advanced.rawQuery("from index 'CameraCost' where cost < 200 select facet(id('facets/CameraFacets'))", Camera)
                .executeAggregation();
            const r2 = await session.advanced.rawQuery("from index 'CameraCost' where megapixels < 3 select facet(id('facets/CameraFacets'))", Camera)
                .executeAggregation();

            const multiFacetResults = [r1, r2];

            assertThat(multiFacetResults[0])
                .hasSize(3);

            assertThat(multiFacetResults[0].manufacturer.values)
                .hasSize(2);
            assertThat(multiFacetResults[0].manufacturer.values[0].range)
                .isEqualTo("manufacturer1");
            assertThat(multiFacetResults[0].manufacturer.values[0].count)
                .isEqualTo(1);
            assertThat(multiFacetResults[0].manufacturer.values[1].range)
                .isEqualTo("manufacturer2");
            assertThat(multiFacetResults[0].manufacturer.values[1].count)
                .isEqualTo(1);

            assertThat(multiFacetResults[0].cost.values)
                .hasSize(5);

            assertThat(multiFacetResults[0].cost.values[0].range)
                .isEqualTo("cost <= 200");
            assertThat(multiFacetResults[0].cost.values[0].count)
                .isEqualTo(2);
            assertThat(multiFacetResults[0].cost.values[1].range)
                .isEqualTo("cost >= 300 and cost <= 400");
            assertThat(multiFacetResults[0].cost.values[1].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[0].cost.values[2].range)
                .isEqualTo("cost >= 500 and cost <= 600");
            assertThat(multiFacetResults[0].cost.values[2].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[0].cost.values[3].range)
                .isEqualTo("cost >= 700 and cost <= 800");
            assertThat(multiFacetResults[0].cost.values[3].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[0].cost.values[4].range)
                .isEqualTo("cost >= 900");
            assertThat(multiFacetResults[0].cost.values[4].count)
                .isEqualTo(0);


            assertThat(multiFacetResults[0].megapixels.values)
                .hasSize(4);

            assertThat(multiFacetResults[0].megapixels.values[0].range)
                .isEqualTo("megapixels <= 3");
            assertThat(multiFacetResults[0].megapixels.values[0].count)
                .isEqualTo(2);
            assertThat(multiFacetResults[0].megapixels.values[1].range)
                .isEqualTo("megapixels >= 4 and megapixels <= 7");
            assertThat(multiFacetResults[0].megapixels.values[1].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[0].megapixels.values[2].range)
                .isEqualTo("megapixels >= 8 and megapixels <= 10");
            assertThat(multiFacetResults[0].megapixels.values[2].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[0].megapixels.values[3].range)
                .isEqualTo("megapixels >= 11");
            assertThat(multiFacetResults[0].megapixels.values[3].count)
                .isEqualTo(0);

            assertThat(multiFacetResults[1])
                .hasSize(3);

            assertThat(multiFacetResults[1].manufacturer.values)
                .hasSize(2);
            assertThat(multiFacetResults[1].manufacturer.values[0].range)
                .isEqualTo("manufacturer1");
            assertThat(multiFacetResults[1].manufacturer.values[0].count)
                .isEqualTo(2);
            assertThat(multiFacetResults[1].manufacturer.values[1].range)
                .isEqualTo("manufacturer2");
            assertThat(multiFacetResults[1].manufacturer.values[1].count)
                .isEqualTo(1);

            assertThat(multiFacetResults[1].cost.values)
                .hasSize(5);

            assertThat(multiFacetResults[1].cost.values[0].range)
                .isEqualTo("cost <= 200");
            assertThat(multiFacetResults[1].cost.values[0].count)
                .isEqualTo(3);
            assertThat(multiFacetResults[1].cost.values[1].range)
                .isEqualTo("cost >= 300 and cost <= 400");
            assertThat(multiFacetResults[1].cost.values[1].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[1].cost.values[2].range)
                .isEqualTo("cost >= 500 and cost <= 600");
            assertThat(multiFacetResults[1].cost.values[2].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[1].cost.values[3].range)
                .isEqualTo("cost >= 700 and cost <= 800");
            assertThat(multiFacetResults[1].cost.values[3].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[1].cost.values[4].range)
                .isEqualTo("cost >= 900");
            assertThat(multiFacetResults[1].cost.values[4].count)
                .isEqualTo(0);

            assertThat(multiFacetResults[1].megapixels.values)
                .hasSize(4);

            assertThat(multiFacetResults[1].megapixels.values[0].range)
                .isEqualTo("megapixels <= 3");
            assertThat(multiFacetResults[1].megapixels.values[0].count)
                .isEqualTo(3);
            assertThat(multiFacetResults[1].megapixels.values[1].range)
                .isEqualTo("megapixels >= 4 and megapixels <= 7");
            assertThat(multiFacetResults[1].megapixels.values[1].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[1].megapixels.values[2].range)
                .isEqualTo("megapixels >= 8 and megapixels <= 10");
            assertThat(multiFacetResults[1].megapixels.values[2].count)
                .isEqualTo(0);
            assertThat(multiFacetResults[1].megapixels.values[3].range)
                .isEqualTo("megapixels >= 11");
            assertThat(multiFacetResults[1].megapixels.values[3].count)
                .isEqualTo(0);
        }
    });

    it("usingToListOnRawFacetQueryShouldThrow", async () => {
        const index = new CameraCostIndex();
        await index.execute(store);

        const facets: Facet[] = [];

        const facet1 = new Facet();
        facet1.fieldName = "manufacturer";
        facets.push(facet1);

        const rangeFacet1 = new RangeFacet();
        rangeFacet1.ranges = [
            "cost <= 200",
            "cost >= 300 and cost <= 400",
            "cost >= 500 and cost <= 600",
            "cost >= 700 and cost <= 800",
            "cost >= 900"
        ];

        const rangeFacet2 = new RangeFacet();
        rangeFacet2.ranges = [
            "megapixels <= 3",
            "megapixels >= 4 and megapixels <= 7",
            "megapixels >= 8 and megapixels <= 10",
            "megapixels >= 11"
        ];

        const rangeFacets = [rangeFacet1, rangeFacet2];

        {
            const session = store.openSession();
            const facetSetup = new FacetSetup();
            facetSetup.id = "facets/CameraFacets";
            facetSetup.facets = facets;
            facetSetup.rangeFacets = rangeFacets;
            await session.store(facetSetup);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await assertThrows(async () => {
                await session.advanced.rawQuery("from index 'CameraCost' select facet(id('facets/CameraFacets'))", Camera)
                    .all();
            }, err => {
                assertThat(err.message)
                    .contains("Raw query with aggregation by facet should be called by executeAggregation method");
            })
        }
    })
});