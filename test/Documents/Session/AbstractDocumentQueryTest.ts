import assert from "node:assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";
import { IDocumentStore } from "../../../src/index.js";

describe("AbstractDocumentQuery - range queries with falsy values", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("whereBetween preserves 0 as a valid boundary value", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereBetween("age", 0, 100);
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, 0,
            "start value 0 should be preserved, not replaced with wildcard '*'");
        assert.strictEqual(indexQuery.queryParameters.p1, 100);
    });

    it("whereGreaterThan preserves 0 as a valid value", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereGreaterThan("count", 0);
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, 0,
            "value 0 should be preserved, not replaced with wildcard '*'");
    });

    it("whereLessThan preserves 0 as a valid value", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereLessThan("count", 0);
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, 0,
            "value 0 should be preserved, not replaced with 'NULL'");
    });

    it("whereGreaterThanOrEqual preserves 0 as a valid value", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereGreaterThanOrEqual("count", 0);
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, 0,
            "value 0 should be preserved, not replaced with wildcard '*'");
    });

    it("whereLessThanOrEqual preserves 0 as a valid value", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereLessThanOrEqual("count", 0);
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, 0,
            "value 0 should be preserved, not replaced with 'NULL'");
    });

    it("whereBetween with null start uses wildcard", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereBetween("age", null, 100);
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, "*",
            "null start should become wildcard '*'");
    });

    it("whereBetween with empty string preserves it as a value", function () {
        const session = store.openSession();

        const query = session.query({ collection: "users" }).whereBetween("name", "", "Z");
        const indexQuery = query.getIndexQuery();

        assert.strictEqual(indexQuery.queryParameters.p0, "",
            "empty string should be preserved, not replaced with wildcard '*'");
    });
});
