import assert from "node:assert";
import { DocumentStore } from "../../src/index.js";
import {disposeTestDocumentStore, testContext} from "../Utils/TestUtil.js";

describe("RavenDB_26091", function () {
    let store: DocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("orderBy with NullsOrdering 'First' emits 'nulls first' in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderBy("name", "First");
        const rql = query.getIndexQuery().query;

        assert.ok(rql.includes("nulls first"), `Expected 'nulls first' in RQL, got: ${rql}`);
        assert.ok(!rql.includes("desc"), `Expected ascending order (no 'desc'), got: ${rql}`);
    });

    it("orderBy with NullsOrdering 'Last' emits 'nulls last' in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderBy("name", "Last");
        const rql = query.getIndexQuery().query;

        assert.ok(rql.includes("nulls last"), `Expected 'nulls last' in RQL, got: ${rql}`);
        assert.ok(!rql.includes("desc"), `Expected ascending order (no 'desc'), got: ${rql}`);
    });

    it("orderBy with NullsOrdering 'Default' does not emit nulls clause in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderBy("name", "Default");
        const rql = query.getIndexQuery().query;

        assert.ok(!rql.includes("nulls"), `Expected no 'nulls' in RQL for Default ordering, got: ${rql}`);
    });

    it("orderByDescending with NullsOrdering 'First' emits 'desc nulls first' in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderByDescending("name", "First");
        const rql = query.getIndexQuery().query;

        assert.ok(rql.includes("desc"), `Expected 'desc' in RQL, got: ${rql}`);
        assert.ok(rql.includes("nulls first"), `Expected 'nulls first' in RQL, got: ${rql}`);
    });

    it("orderByDescending with NullsOrdering 'Last' emits 'desc nulls last' in RQL", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderByDescending("name", "Last");
        const rql = query.getIndexQuery().query;

        assert.ok(rql.includes("desc"), `Expected 'desc' in RQL, got: ${rql}`);
        assert.ok(rql.includes("nulls last"), `Expected 'nulls last' in RQL, got: ${rql}`);
    });

    it("standard orderBy without NullsOrdering does not emit nulls clause", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderBy("name");
        const rql = query.getIndexQuery().query;

        assert.ok(!rql.includes("nulls"), `Expected no 'nulls' in standard orderBy RQL, got: ${rql}`);
    });

    it("orderBy with OrderingType 'Long' and NullsOrdering 'First' emits both 'as long' and 'nulls first'", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderBy("age", "First", "Long");
        const rql = query.getIndexQuery().query;

        assert.ok(rql.includes("as long"), `Expected 'as long' in RQL, got: ${rql}`);
        assert.ok(rql.includes("nulls first"), `Expected 'nulls first' in RQL, got: ${rql}`);
    });

    it("orderByDescending without NullsOrdering does not emit nulls clause", function () {
        const session = store.openSession();
        const query = session.query({ collection: "items" }).orderByDescending("name");
        const rql = query.getIndexQuery().query;

        assert.ok(!rql.includes("nulls"), `Expected no 'nulls' in orderByDescending without NullsOrdering, got: ${rql}`);
        assert.ok(rql.includes("desc"), `Expected 'desc' in RQL, got: ${rql}`);
    });
});
