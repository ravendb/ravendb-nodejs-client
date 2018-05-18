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

    describe("with regular users set", () => {

        beforeEach(async () => await addUsers(store));

        it("query map reduce with count", async () => {
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

        it("query single property", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .addOrder("age", true, "LONG")
                .selectFields<number>("age")
                .all();

            assert.equal(results.length, 3);
            assert.deepEqual(results, [5, 3, 2]);

        });

        it("query with select", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .selectFields<User>("age", User)
                .all();

            for (const entry of results) {
                assert.equal(typeof entry, "object");
                assert.ok(entry.age > 0);
                assert.ok(entry.id);
            }
        });

        it("query with where in", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereIn("name", ["Tarzan", "no_such"])
                .all();

            assert.equal(results.length, 1);
        });

        it("query with where between", async () => {
            const session = store.openSession();
            const results = await session.query<User>(User)
                .whereBetween("age", 4, 5)
                .all();

            assert.equal(results.length, 1);
            assert.equal(results[0].name, "John");
        });

        it("query with where less than", async () => {
            const session = store.openSession();
            const results = await session.query<User>(User)
                .whereLessThan("age", 3)
                .all();

            assert.equal(results.length, 1);
            assert.equal(results[0].name, "Tarzan");
        });

        it("query with where less than or equal", async () => {
            const session = store.openSession();
            const results = await session.query<User>(User)
                .whereLessThanOrEqual("age", 3)
                .all();

            assert.equal(results.length, 2);
        });

        it("query with where greater than", async () => {
            const session = store.openSession();
            const results = await session.query<User>(User)
                .whereGreaterThan("age", 3)
                .all();

            assert.equal(results.length, 1);
            assert.equal(results[0].name, "John");
        });

        it("query with where greater than or equal", async () => {
            const session = store.openSession();
            const results = await session.query<User>(User)
                .whereGreaterThanOrEqual("age", 3)
                .all();

            assert.equal(results.length, 2);
        });

        class UserProjection {
            public id: string;
            public name: string;
        }

        it("query with projection", async () => { 
            const session = store.openSession();
            const results = await session.query(User)
                .selectFields<UserProjection>(["id", "name"], UserProjection)
                .all();

            assert.equal(results.length, 3);
            assert.equal(results[0].constructor, UserProjection);

            for (const entry of results) {
                assert.ok(entry);
                assert.ok(entry.id);
                assert.ok(entry.name);
            }
        });

        it("query with projection 2", async () => { 
            const session = store.openSession();
            const results = await session.query(User)
                .selectFields<UserProjection>(["lastName"], UserProjection)
                .all();

            assert.equal(results.length, 3);
            assert.equal(results[0].constructor, UserProjection);

            for (const entry of results) {
                assert.ok(entry);
                assert.ok(entry.id);
                assert.ok(!entry.name);
            }

        });

        it("query distinct", async () => {
            const session = store.openSession();
            const uniqueNames = await session.query(User)
                .selectFields<string>("name")
                .distinct()
                .all();

            assert.equal(uniqueNames.length, 2);
            assert.ok(uniqueNames.indexOf("Tarzan") !== -1);
            assert.ok(uniqueNames.indexOf("John") !== -1);
        });

        it("query search with or", async () => {
            const session = store.openSession();
            const results = await session.query<User>(User)
                .search("name", "Tarzan John", "OR")
                .all();

            assert.equal(results.length, 3);
        });

        it("query no tracking", async () => {
            const session = store.openSession();
            const users = await session.query<User>(User)
                .noTracking()
                .all();

            assert.equal(users.length, 3);

            for (const user of users) {
                assert.ok(user.id);
                assert.ok(!session.advanced.isLoaded(user.id));
            }
        });

        it("query skip take", async () => {
            const session = store.openSession();
            const users = await session.query<User>(User)
                .orderBy("name")
                .skip(2)
                .take(1)
                .all();

            assert.equal(users.length, 1);
            assert.equal(users[0].name, "Tarzan");
        });

        it("raw query skip take", async () => {
            const session = store.openSession();
            const users = await session.advanced.rawQuery<User>("from users order by name", User)
                .skip(2)
                .take(1)
                .all();

            assert.equal(users.length, 1);
            assert.equal(users[0].name, "Tarzan");
        });

        it("parameters in raw query", async () => {
            const session = store.openSession();
            const users = await session.advanced.rawQuery<User>("from users where age == $p0", User)
                .addParameter("p0", 5)
                .all();

            assert.equal(users.length, 1);
            assert.equal(users[0].name, "John");
        });

        it("query lucene", async () => {
            const session = store.openSession();
            const users = await session.query<User>(User)
                .whereLucene("name", "Tarzan")
                .all();

            assert.equal(users.length, 1);

            for (const user of users) {
                assert.equal(user.name, "Tarzan");
            }
        });

        it("query where exact", async () => {
            const session = store.openSession();
            let users = await session.query<User>(User)
                .whereEquals("name", "tarzan")
                .all();

            assert.equal(users.length, 1);

            users = await session.query<User>(User)
                .whereEquals("name", "tarzan", true)
                .all();

            assert.equal(users.length, 0);

            users = await session.query<User>(User)
                .whereEquals("name", "Tarzan", true)
                .all();
            assert.equal(users.length, 1);
        });

        it("query where not", async () => {
            const session = store.openSession();
            assert.equal((await session.query<User>(User)
                .not()
                .whereEquals("name", "tarzan")
                .all()).length, 2);

            assert.equal((await session.query<User>(User)
                .whereNotEquals("name", "tarzan")
                .all()).length, 2);

            assert.equal((await session.query<User>(User)
                .whereNotEquals("name", "Tarzan", true)
                .all()).length, 2);
         });

        it("query first and single", async () => {
            const session = store.openSession();
            const first = await session.query(User).first();
            assert.ok(first);

            assert.ok(await session.query(User)
                .whereEquals("name", "Tarzan")
                .single());

            try {
                await session.query(User).single();
                assert.fail("Should have thrown.");
            } catch (err) {
                assert.equal(err.name, "InvalidOperationException");
            }
         });

        it("query parameters", async () => {
            const session = store.openSession();
            assert.equal(await session.advanced.rawQuery("from Users where name = $name")
                .addParameter("name", "Tarzan")
                .count(), 1);
         });

        it.skip("query random order", async () => {
            const session = store.openSession();
            assert.equal((await session.query(User)
                .randomOrdering()
                .all()).length, 3);

            assert.equal((await session.query(User)
                .randomOrdering("123")
                .all()).length, 3);

         });

        it.skip("query where exists", async () => { 
            const session = store.openSession();

        });

        it.skip("query with boost", async () => {
            const session = store.openSession();

         });

        it.skip("query with customize", async () => {
            const session = store.openSession();

         });

        it.skip("query by index", async () => {
            const session = store.openSession();

         });
    });
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