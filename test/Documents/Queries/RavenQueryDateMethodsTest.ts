import assert from "node:assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";
import { IDocumentStore, RavenQuery } from "../../../src/index.js";

describe("RavenQuery.now() and RavenQuery.today()", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("whereGreaterThan with now() generates server-side now() in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "orders" })
            .whereGreaterThan("createdAt", RavenQuery.now());

        const indexQuery = query.getIndexQuery();
        assert.ok(indexQuery.query.includes("createdAt > now()"),
            `Expected RQL to contain "createdAt > now()", got: ${indexQuery.query}`);
    });

    it("whereLessThan with now(offset) generates now($p0) with parameter", function () {
        const session = store.openSession();
        const query = session.query({ collection: "orders" })
            .whereLessThan("expiresAt", RavenQuery.now("+30d"));

        const indexQuery = query.getIndexQuery();
        assert.ok(indexQuery.query.includes("expiresAt < now($p0)"),
            `Expected RQL to contain "expiresAt < now($p0)", got: ${indexQuery.query}`);
        assert.strictEqual(indexQuery.queryParameters["p0"], "+30d",
            "Expected query parameter p0 to equal '+30d'");
    });

    it("whereGreaterThanOrEqual with today() generates server-side today() in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "orders" })
            .whereGreaterThanOrEqual("date", RavenQuery.today());

        const indexQuery = query.getIndexQuery();
        assert.ok(indexQuery.query.includes("date >= today()"),
            `Expected RQL to contain "date >= today()", got: ${indexQuery.query}`);
    });

    it("whereEquals with now() generates now() in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "orders" })
            .whereEquals("snapshotAt", RavenQuery.now());

        const indexQuery = query.getIndexQuery();
        assert.ok(indexQuery.query.includes("snapshotAt = now()"),
            `Expected RQL to contain "snapshotAt = now()", got: ${indexQuery.query}`);
    });

    it("now() without offset passes no query parameter", function () {
        const session = store.openSession();
        const query = session.query({ collection: "orders" })
            .whereGreaterThan("createdAt", RavenQuery.now());

        const indexQuery = query.getIndexQuery();
        assert.strictEqual(Object.keys(indexQuery.queryParameters).length, 0,
            "now() without offset should produce no query parameters");
    });

    it("today() passes no query parameter", function () {
        const session = store.openSession();
        const query = session.query({ collection: "orders" })
            .whereGreaterThanOrEqual("date", RavenQuery.today());

        const indexQuery = query.getIndexQuery();
        assert.strictEqual(Object.keys(indexQuery.queryParameters).length, 0,
            "today() should produce no query parameters");
    });
});
