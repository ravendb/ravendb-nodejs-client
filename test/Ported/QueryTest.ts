import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../src";

describe("QueryTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    // tslint:disable-next-line:no-empty
    it.skip("query simple", async () => {});
    it.skip("collection stats", async () => {});
    it.skip("query with where clause", async () => {});
    it.skip("query map reduce with count", async () => {});
    it.skip("query map reduce with sum", async () => {});
    it.skip("query map reduce index", async () => {});
    it.skip("query single property", async () => {});
    it.skip("query with select", async () => {});
    it.skip("query with where in", async () => {});
    it.skip("query with where between", async () => {});
    it.skip("query with where less than", async () => {});
    it.skip("query with where less than or equal", async () => {});
    it.skip("query with where greater than", async () => {});
    it.skip("query with where greater than or equal", async () => {});
    it.skip("query with projection", async () => {});
    it.skip("query with projection 2", async () => {});
    it.skip("query distinct", async () => {});
    it.skip("query search with or", async () => {});
    it.skip("query no tracking", async () => {});
    it.skip("query skip take", async () => {});
    it.skip("query skip take", async () => {});
    it.skip("raw query skip take", async () => {});
    it.skip("parameters in raw query", async () => {});
    it.skip("query lucene", async () => {});
    it.skip("query where exact", async () => {});
    it.skip("query where not", async () => {});
    it.skip("query first", async () => {});
    it.skip("query parameters", async () => {});
    it.skip("query random order", async () => {});
    it.skip("query where exists", async () => {});
    it.skip("query with boost", async () => {});
    it.skip("query with customize", async () => {});
    it.skip("query by index", async () => {});
});
