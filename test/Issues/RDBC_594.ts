import { IDocumentStore, PointField } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { User } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";


describe("RDBC_594", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("can use zero as distError", function () {
        it("relatedToShape", () => {
            const session = store.openSession();

            const q1 = session.query(User)
                .spatial("WKT",
                    f => f.relatesToShape("LINESTRING (1 0, 1 1, 1 2)", "Intersects", "Kilometers", 0))
                .toString();

            assertThat(q1)
                .contains("spatial.intersects(WKT, spatial.wkt($p0, 'Kilometers'), 0)");
        });

        it("intersects", () => {
            const session = store.openSession();

            const q1 = session.query(User)
                .spatial("WKT",
                    f => f.intersects("LINESTRING (1 0, 1 1, 1 2)", 0))
                .toString();

            assertThat(q1)
                .contains("spatial.intersects(WKT, spatial.wkt($p0), 0)");
        });

        it("contains", () => {
            const session = store.openSession();

            const q1 = session.query(User)
                .spatial("WKT",
                    f => f.contains("LINESTRING (1 0, 1 1, 1 2)", 0))
                .toString();

            assertThat(q1)
                .contains("spatial.contains(WKT, spatial.wkt($p0), 0)");
        });

        it("withinRadius", () => {
            const session = store.openSession();

            const q1 = session.query(User)
                .spatial(new PointField("latitude2", "longitude2"), f => f.withinRadius(10, 10, 20, "Kilometers", 0))
                .toString();

            assertThat(q1)
                .contains("spatial.within(spatial.point(latitude2, longitude2), spatial.circle($p0, $p1, $p2, 'Kilometers'), 0)");
        })
    })
});
