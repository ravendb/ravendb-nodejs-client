import {User} from '../Assets/Entities';
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
    it("query simple", async () => {
        const session = store.openSession();
        const user1 = Object.assign(new User(), { name: "John" });
        const user2 = Object.assign(new User(), { name: "Jane" });
        const user3 = Object.assign(new User(), { name: "Tarzan" });
        const users = [ user1, user2, user3 ];
        await session.store(user1, "users/1");
        await session.store(user2, "users/2");
        await session.store(user3, "users/3");
        await session.saveChanges();

        const queryResult = await session.advanced.documentQuery<User>({
            collection: "users",
            isMapReduce: false,
            documentType: User
        }).all();
        assert.equal(queryResult.length, 3);

        const names = new Set(queryResult.map(x => x.name));
        const expectedNames = new Set(users.map(x => x.name));
        for (const name of names) {
            assert.ok(names.has(name));
        }
    });

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
