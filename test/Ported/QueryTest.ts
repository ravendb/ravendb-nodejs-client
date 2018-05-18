import { User } from '../Assets/Entities';
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    GetCollectionStatisticsOperation,
    AbstractIndexCreationTask,
} from "../../src";
import { GroupByField } from '../../src/Documents/Session/GroupByField';

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
        const users = [user1, user2, user3];
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

    it("collection stats", async () => {
        const session = store.openSession();
        const user1 = Object.assign(new User(), { name: "John" });
        const user2 = Object.assign(new User(), { name: "Jane" });

        await session.store(user1, "users/1");
        await session.store(user2, "users/2");
        await session.saveChanges();

        const stats = await store.maintenance.send(new GetCollectionStatisticsOperation());

        assert.equal(stats.countOfDocuments, 2);
        assert.equal(stats.collections["Users"], 2);
    });

    it("query with where clause", async () => {
        const session = store.openSession();
        const user1 = Object.assign(new User(), { name: "John" });
        const user2 = Object.assign(new User(), { name: "Jane" });
        const user3 = Object.assign(new User(), { name: "Tarzan" });

        await session.store(user1, "users/1");
        await session.store(user2, "users/2");
        await session.store(user3, "users/3");
        await session.saveChanges();

        const queryResult = await session.query<User>({ collection: "users" })
            .whereStartsWith("name", "J")
            .all();

        const queryResult2 = await session.query<User>({ collection: "users" })
            .whereEquals("name", "Tarzan")
            .all();

        const queryResult3 = await session.query<User>({ collection: "users" })
            .whereEndsWith("name", "n")
            .all();

        assert.equal(queryResult.length, 2);
        assert.equal(queryResult2.length, 1);
        assert.equal(queryResult3.length, 2);

        assert.equal(queryResult[0].constructor, User);
    });

    it("query map reduce with count", async () => {
        await addUsers(store);

        const session = store.openSession();
        const results = await session.query<User>(User)
            .groupBy("name")
            .selectKey()
            .selectCount()
            .orderByDescending("count")
            .ofType<ReduceResult>(ReduceResult)
            .all();

        assert.equal(results[0].constructor, ReduceResult);
        assert.equal(results[0].count, 2);
        assert.equal(results[0].name, "John");

        assert.equal(results[1].count, 1);
        assert.equal(results[1].name, "Tarzan");
    });

    it("query map reduce with sum", async () => { 
        await addUsers(store);

        const session = store.openSession();
        const results = await session.query<User>(User)
            .groupBy("name")
            .selectKey()
            .selectSum(new GroupByField("age"))
            .orderByDescending("age")
            .ofType<ReduceResult>(ReduceResult)
            .all();

        assert.equal(results[0].constructor, ReduceResult);
        assert.equal(results[0].age, 8);
        assert.equal(results[0].name, "John");

        assert.equal(results[1].age, 2);
        assert.equal(results[1].name, "Tarzan");
    });

    it("query map reduce index", async () => {
        await addUsers(store);
        const session = store.openSession();
        const results = await session.query<ReduceResult>({
            indexName: "UsersByName",
            documentType: ReduceResult
        })
        .orderByDescending("count")
        .all();

        assert.equal(results[0].count, 2);
        assert.equal(results[0].name, "John");

        assert.equal(results[1].count, 1);
        assert.equal(results[1].name, "Tarzan");
    });

    it.skip("query single property", async () => { });
    it.skip("query with select", async () => { });
    it.skip("query with where in", async () => { });
    it.skip("query with where between", async () => { });
    it.skip("query with where less than", async () => { });
    it.skip("query with where less than or equal", async () => { });
    it.skip("query with where greater than", async () => { });
    it.skip("query with where greater than or equal", async () => { });
    it.skip("query with projection", async () => { });
    it.skip("query with projection 2", async () => { });
    it.skip("query distinct", async () => { });
    it.skip("query search with or", async () => { });
    it.skip("query no tracking", async () => { });
    it.skip("query skip take", async () => { });
    it.skip("query skip take", async () => { });
    it.skip("raw query skip take", async () => { });
    it.skip("parameters in raw query", async () => { });
    it.skip("query lucene", async () => { });
    it.skip("query where exact", async () => { });
    it.skip("query where not", async () => { });
    it.skip("query first", async () => { });
    it.skip("query parameters", async () => { });
    it.skip("query random order", async () => { });
    it.skip("query where exists", async () => { });
    it.skip("query with boost", async () => { });
    it.skip("query with customize", async () => { });
    it.skip("query by index", async () => { });
});

export class UsersByName extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = `from c in docs.Users select new 
             {
                c.name, 
                count = 1 
            }`;

        this.reduce = `from result in results 
            group result by result.name 
            into g 
            select new 
            { 
              name = g.Key, 
              count = g.Sum(x => x.count) 
            }`;
    }
}

async function addUsers(store: IDocumentStore) {
    const session = store.openSession();
    const user1 = Object.assign(new User(), {
        name: "John",
        age: 3
    });
    const user2 = Object.assign(new User(), {
        name: "John",
        age: 5
    });
    const user3 = Object.assign(new User(), {
        name: "Tarzan",
        age: 2
    });

    await session.store(user1, "users/1");
    await session.store(user2, "users/2");
    await session.store(user3, "users/3");
    await session.saveChanges();

    await store.executeIndex(new UsersByName());
    await globalContext.waitForIndexing(store);
}

class ReduceResult {
    public count: number;
    public name: string;
    public age: number;
}