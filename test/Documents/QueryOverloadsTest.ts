import assert from "node:assert";
import { IDocumentStore, QueryData } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { User } from "../Assets/Entities.js";

describe("QueryOverloadsTest", function () {

    const wkt = "POINT(10 20)";
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("accepts isMapReduce in session.query options", () => {
        const query = store.openSession().query<User>({ indexName: "Users/ByName", isMapReduce: true });

        assert.strictEqual(query.toString(), "from index 'Users/ByName'");
    });

    it("selects fields from query data without a projection class", () => {
        const query = store.openSession().query(User).selectFields<User>(new QueryData(["name"], ["name"]));

        assert.ok(query.toString().startsWith("from 'Users' select name"));
    });

    it("orders by distance to a shape with a round factor", () => {
        const session = store.openSession();

        assert.strictEqual(session.query(User).orderByDistance("location", wkt, 2).toString(),
            "from 'Users' order by spatial.distance(location, spatial.wkt($p1), $p0)");
        assert.strictEqual(session.query(User).orderByDistanceDescending("location", wkt, 2).toString(),
            "from 'Users' order by spatial.distance(location, spatial.wkt($p1), $p0) desc");
    });

    it("relates to a shape with units and the default distance error", () => {
        const query = store.openSession().query(User).relatesToShape("location", wkt, "Within", "Miles");

        assert.strictEqual(query.toString(), "from 'Users' where spatial.within(location, spatial.wkt($p0, 'Miles'))");
    });

    it("adds an ascending order when descending is not given", () => {
        assert.strictEqual(store.openSession().query(User).addOrder("name").toString(), "from 'Users' order by name");
    });

    it("creates a subscription for a document type in a given database", async () => {
        const name = await store.subscriptions.create(User, store.database);

        const state = await store.subscriptions.getSubscriptionState(name, store.database);
        assert.strictEqual(state.query, "from 'Users' as doc");
    });
});
