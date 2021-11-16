import * as moment from "moment";
import { User, Event } from "../Assets/Entities";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    GetCollectionStatisticsOperation,
    GroupByField,
    IDocumentSession, AbstractJavaScriptIndexCreationTask, DocumentQuery
} from "../../src";
import { DateUtil } from "../../src/Utility/DateUtil";
import { TypeUtil } from "../../src/Utility/TypeUtil";
import { assertThat } from "../Utils/AssertExtensions";

describe("QueryTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async store => {
            store.conventions.storeDatesInUtc = true;
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("query_CreateClausesForQueryDynamicallyWithOnBeforeQueryEvent", async function () {
        const id1 = "users/1";
        const id2 = "users/2";

        {
            const session = store.openSession();
            const article1 = new Article();
            article1.title = "foo";
            article1.description = "bar";
            article1.isDeleted = false;
            await session.store(article1, id1);

            const article2 = new Article();
            article2.title = "foo";
            article2.description = "bar";
            article2.isDeleted = true;
            await session.store(article2, id2);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.on("beforeQuery", eventArgs => {
                const queryToBeExecuted = eventArgs.queryCustomization.getQuery() as DocumentQuery<Article>;
                queryToBeExecuted.andAlso(true);
                queryToBeExecuted.whereEquals("isDeleted", true);
            });

            const query = session.query(Article)
                .search("title", "foo")
                .search("description", "bar", "OR");

            const result = await query.all();

            assertThat(query.toString())
                .isEqualTo("from 'Articles' where (search(title, $p0) or search(description, $p1)) and isDeleted = $p2");

            assertThat(result)
                .hasSize(1);
        }
    });

    it("query_CreateClausesForQueryDynamicallyWhenTheQueryEmpty", async function () {
        const id1 = "users/1";
        const id2 = "users/2";

        {
            const session = store.openSession();
            const article1 = new Article();
            article1.title = "foo";
            article1.description = "bar";
            article1.isDeleted = false;
            await session.store(article1, id1);

            const article2 = new Article();
            article2.title = "foo";
            article2.description = "bar";
            article2.isDeleted = true;
            await session.store(article2, id2);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.advanced.documentQuery(Article)
                .andAlso(true);

            assertThat(query.toString())
                .isEqualTo("from 'Articles'");

            const queryResult = await query.all();
            assertThat(queryResult)
                .hasSize(2);
        }
    });

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

        const queryResult = await session.advanced.documentQuery({
            collection: "users",
            isMapReduce: false,
            documentType: User
        }).all();
        assert.strictEqual(queryResult.length, 3);

        const names = new Set(queryResult.map(x => x.name));
        const expectedNames = new Set(users.map(x => x.name));
        for (const name of names) {
            assert.ok(expectedNames.has(name));
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

        assert.strictEqual(stats.countOfDocuments, 2);
        assert.strictEqual(stats.collections["Users"], 2);
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

        assert.strictEqual(queryResult.length, 2);
        assert.strictEqual(queryResult2.length, 1);
        assert.strictEqual(queryResult3.length, 2);

        assert.strictEqual(queryResult[0].constructor, User);
    });

    describe("with regular users set", () => {

        beforeEach(async () => await addUsers(store));

        it("query map reduce with count", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .groupBy("name")
                .selectKey()
                .selectCount()
                .orderByDescending("count")
                .ofType<ReduceResult>(ReduceResult)
                .all();

            assert.strictEqual(results[0].constructor, ReduceResult);
            assert.strictEqual(results[0].count, 2);
            assert.strictEqual(results[0].name, "John");

            assert.strictEqual(results[1].count, 1);
            assert.strictEqual(results[1].name, "Tarzan");
        });

        it("query map reduce with sum", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .groupBy("name")
                .selectKey()
                .selectSum(new GroupByField("age"))
                .orderByDescending("age")
                .ofType<ReduceResult>(ReduceResult)
                .all();

            assert.strictEqual(results[0].constructor, ReduceResult);
            assert.strictEqual(results[0].age, 8);
            assert.strictEqual(results[0].name, "John");

            assert.strictEqual(results[1].age, 2);
            assert.strictEqual(results[1].name, "Tarzan");
        });

        it("query map reduce index", async () => {
            const session = store.openSession();
            const results = await session.query(ReduceResult, UsersByName)
                .orderByDescending("count")
                .all();

            assert.strictEqual(results[0].count, 2);
            assert.strictEqual(results[0].name, "John");

            assert.strictEqual(results[1].count, 1);
            assert.strictEqual(results[1].name, "Tarzan");
        });

        it("query single property", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .addOrder("age", true, "Long")
                .selectFields<number>("age")
                .all();

            assert.strictEqual(results.length, 3);
            assert.deepStrictEqual(results, [5, 3, 2]);

        });

        it("query with select", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .selectFields<User>(["age", "id"], User)
                .all();

            for (const entry of results) {
                assert.strictEqual(typeof entry, "object");
                assert.ok(entry.age > 0);
                assert.ok(entry.id);
            }
        });

        it("query with where in", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereIn("name", ["Tarzan", "no_such"])
                .all();

            assert.strictEqual(results.length, 1);
        });

        it("query with where between", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereBetween("age", 4, 5)
                .all();

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].name, "John");
        });

        it("query with where less than", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereLessThan("age", 3)
                .all();

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].name, "Tarzan");
        });

        it("query with where less than or equal", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereLessThanOrEqual("age", 3)
                .all();

            assert.strictEqual(results.length, 2);
        });

        it("query with where greater than", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereGreaterThan("age", 3)
                .all();

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].name, "John");
        });

        it("query with where greater than or equal", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .whereGreaterThanOrEqual("age", 3)
                .all();

            assert.strictEqual(results.length, 2);
        });

        class UserProjection {
            public id: string;
            public name: string;
        }

        it("query with projection", async () => {
            const session = store.openSession();
            const query = session.query(User)
                .selectFields<UserProjection>(["id", "name"], UserProjection);

            const results = await query.all();
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].constructor, UserProjection);

            for (const entry of results) {
                assert.ok(entry);
                assert.ok(entry.id);
                assert.ok(entry.name);
            }
        });

        it("query with projection 2", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .selectFields<UserProjection>(["lastName", "id"], UserProjection)
                .all();

            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].constructor, UserProjection);

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

            assert.strictEqual(uniqueNames.length, 2);
            assert.ok(uniqueNames.indexOf("Tarzan") !== -1);
            assert.ok(uniqueNames.indexOf("John") !== -1);
        });

        it("query search with or", async () => {
            const session = store.openSession();
            const results = await session.query(User)
                .search("name", "Tarzan John", "OR")
                .all();

            assert.strictEqual(results.length, 3);
        });

        it("query no tracking", async () => {
            const session = store.openSession();
            const users = await session.query(User)
                .noTracking()
                .all();

            assert.strictEqual(users.length, 3);

            for (const user of users) {
                assert.ok(user.id);
                assert.ok(!session.advanced.isLoaded(user.id));
            }
        });

        it("query skip take", async () => {
            const session = store.openSession();
            const users = await session.query(User)
                .orderBy("name")
                .skip(2)
                .take(1)
                .all();

            assert.strictEqual(users.length, 1);
            assert.strictEqual(users[0].name, "Tarzan");
        });

        it("raw query skip take", async () => {
            const session = store.openSession();
            const users = await session.advanced.rawQuery("from users order by name", User)
                .skip(2)
                .take(1)
                .all();

            assert.strictEqual(users.length, 1);
            assert.strictEqual(users[0].name, "Tarzan");
        });

        it("parameters in raw query", async () => {
            const session = store.openSession();
            const users = await session.advanced.rawQuery("from users where age == $p0", User)
                .addParameter("p0", 5)
                .all();

            assert.strictEqual(users.length, 1);
            assert.strictEqual(users[0].name, "John");
        });

        it("query lucene", async () => {
            const session = store.openSession();
            const users = await session.query(User)
                .whereLucene("name", "Tarzan")
                .all();

            assert.strictEqual(users.length, 1);

            for (const user of users) {
                assert.strictEqual(user.name, "Tarzan");
            }
        });

        it("query where exact", async () => {
            const session = store.openSession();
            let users = await session.query(User)
                .whereEquals("name", "tarzan")
                .all();

            assert.strictEqual(users.length, 1);

            users = await session.query(User)
                .whereEquals("name", "tarzan", true)
                .all();

            assert.strictEqual(users.length, 0);

            users = await session.query(User)
                .whereEquals("name", "Tarzan", true)
                .all();
            assert.strictEqual(users.length, 1);
        });

        it("query where not", async () => {
            const session = store.openSession();
            assert.strictEqual((await session.query(User)
                .not()
                .whereEquals("name", "tarzan")
                .all()).length, 2);

            assert.strictEqual((await session.query(User)
                .whereNotEquals("name", "tarzan")
                .all()).length, 2);

            assert.strictEqual((await session.query(User)
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
                assert.strictEqual(err.name, "InvalidOperationException");
            }
        });

        it("query parameters", async () => {
            const session = store.openSession();
            assert.strictEqual(await session.advanced.rawQuery("from Users where name = $name")
                .addParameter("name", "Tarzan")
                .count(), 1);
        });

        it("query random order", async () => {
            const session = store.openSession();
            assert.strictEqual((await session.query(User)
                .randomOrdering()
                .all()).length, 3);

            assert.strictEqual((await session.query(User)
                .randomOrdering("123")
                .all()).length, 3);

        });

        it("query where exists", async () => {
            const session = store.openSession();
            assert.strictEqual(
                (await session.query(User).whereExists("name").all()).length,
                3);

            assert.strictEqual((await session.query(User)
                .whereExists("name")
                .andAlso()
                .not()
                .whereExists("no_such_field")
                .all()).length, 3);
        });

        it("query with boost", async () => {
            const session = store.openSession();
            let users = await session.query(User)
                .whereEquals("name", "Tarzan")
                .boost(5)
                .orElse()
                .whereEquals("name", "John")
                .boost(2)
                .orderByScore()
                .all();

            assert.strictEqual(users.length, 3);

            let names = users.map(x => x.name);
            assert.deepStrictEqual(names, ["Tarzan", "John", "John"]);

            users = await session.query(User)
                .whereEquals("name", "Tarzan")
                .boost(2)
                .orElse()
                .whereEquals("name", "John")
                .boost(5)
                .orderByScore()
                .all();

            assert.strictEqual(users.length, 3);

            names = users.map(x => x.name);
            assert.deepStrictEqual(names, ["John", "John", "Tarzan"]);
        });

        it("query with customize", async () => {
            await new DogsIndex().execute(store);

            {
                const session = store.openSession();
                await createDogs(session);
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();

                const queryResult = await session.query(DogsIndexResult, DogsIndex)
                    .waitForNonStaleResults(null)
                    .orderBy("name", "AlphaNumeric")
                    .whereGreaterThan("age", 2)
                    .all();

                assert.strictEqual(queryResult.length, 4);
                assert.deepStrictEqual(
                    queryResult.map(x => x.name),
                    ["Brian", "Django", "Lassie", "Snoopy"]
                );
            }

        });

    });

    async function createDogs(newSession: IDocumentSession) {
        const dogs = [
            {
                name: "Snoopy",
                breed: "Beagle",
                color: "White",
                age: 6,
                vaccinated: true,
            },
            {

                name: "Brian",
                breed: "Labrador",
                color: "White",
                age: 12,
                vaccinated: false,
            },
            {

                name: "Django",
                breed: "Jack Russel",
                color: "Black",
                age: 3,
                vaccinated: true,
            },
            {
                name: "Beethoven",
                breed: "St. Bernard",
                color: "Brown",
                age: 1,
                vaccinated: false,
            },
            {
                name: "Scooby Doo",
                breed: "Great Dane",
                color: "Brown",
                age: 0,
                vaccinated: false,
            },
            {
                name: "Old Yeller",
                breed: "Black Mouth Cur",
                color: "White",
                age: 2,
                vaccinated: true,
            },
            {
                name: "Benji",
                breed: "Mixed",
                color: "White",
                age: 0,
                vaccinated: false,

            },
            {
                name: "Lassie",
                breed: "Collie",
                color: "Brown",
                age: 6,
                vaccinated: true,
            }
        ];

        for (let i = 0; i < dogs.length; i++) {
            const dogInstance = Object.assign(new Dog(), dogs[i]);
            await newSession.store(dogInstance, `docs/${i + 1}`);
        }
    }

    it("query by index", async () => {
        await new DogsIndex().execute(store);
        {
            const session = store.openSession();
            await createDogs(session);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const queryResult = await session.query(DogsIndexResult, DogsIndex)
                .whereGreaterThan("age", 2)
                .andAlso()
                .whereEquals("vaccinated", false)
                .all();

            assert.strictEqual(queryResult.length, 1);
            assert.strictEqual(queryResult[0].name, "Brian");

            const queryResult2 = await session.query(DogsIndexResult, DogsIndex)
                .whereLessThanOrEqual("age", 2)
                .andAlso()
                .whereEquals("vaccinated", false)
                .all();
            assert.strictEqual(queryResult2.length, 3);

            const list = queryResult2.map(x => x.name);
            list.sort();

            assert.deepStrictEqual(list, ["Beethoven", "Benji", "Scooby Doo"]);
        }
    });

    it("query long request", async () => {
        const session = store.openSession();
        const longName = "x".repeat(2048);
        const user = new User();
        user.name = longName;
        await session.store(user, "users/1");
        await session.saveChanges();

        const queryResult = await session
            .advanced
            .documentQuery({
                documentType: User,
                collection: "Users",
                isMapReduce: false
            })
            .waitForNonStaleResults()
            .whereEquals("name", longName)
            .all();

        assert.strictEqual(queryResult.length, 1);
    });

    it("query where between is inclusive", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { age: 1 }));
            await session.store(Object.assign(new User(), { age: 2 }));
            await session.store(Object.assign(new User(), { age: 3 }));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const results = await session.query({
                collection: "users"
            })
                .whereBetween("age", 1, 3)
                .all();

            assert.strictEqual(results.length, 3);
        }
    });

    it("query where between with dates", async () => {
        const cocartFestival = new Event({
            name: "CoCArt Festival",
            date: moment("2018-03-08T00:00:00Z").toDate()
        });
        const openerFestival = new Event({
            name: "Open'er Festival",
            date: moment("2018-07-04T00:00:00Z").toDate()
        });
        const offFestival = new Event({
            name: "OFF Festival",
            date: moment("2018-08-03T00:00:00Z").toDate()
        });

        {
            const session = store.openSession();
            await session.store(cocartFestival);
            await session.store(openerFestival);
            await session.store(offFestival);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const q = session.query({
                collection: "events"
            })
                .whereBetween("date", cocartFestival.date, offFestival.date);

            const indexQuery = q.getIndexQuery();
            assert.strictEqual(indexQuery.query, "from 'events' where date between $p0 and $p1");
            assert.strictEqual(
                indexQuery.queryParameters["p0"], 
                DateUtil.utc.stringify(cocartFestival.date));
            assert.strictEqual(
                indexQuery.queryParameters["p1"], 
                DateUtil.utc.stringify(offFestival.date));
            assert.strictEqual(indexQuery.query, "from 'events' where date between $p0 and $p1");

            const festivalsHappeningBetweenCocartAndOffInclusive: any[] = await q.all();

            assert.strictEqual(festivalsHappeningBetweenCocartAndOffInclusive.length, 3);
            assert.ok(TypeUtil.isDate(festivalsHappeningBetweenCocartAndOffInclusive[0].date));

            const festivalsHappeningBetweenCocartAndOffExclusive = await session.query({
                collection: "events"
            })
                .whereBetween(
                    "date",
                    moment(cocartFestival.date).add(1, "d").toDate(),
                    moment(offFestival.date).add(-1, "d").toDate())
                .all();

            assert.strictEqual(festivalsHappeningBetweenCocartAndOffExclusive.length, 1);
        }
    });

    it("query lazily", async () => {
        const session = store.openSession();

        const user1 = new User();
        user1.name = "John";

        const user2 = new User();
        user2.name = "Jane";

        const user3 = new User();
        user3.name = "Tarzan";

        await session.store(user1, "users/1");
        await session.store(user2, "users/2");
        await session.store(user3, "users/3");
        await session.saveChanges();

        const lazyQuery = session.query<User>({
            collection: "Users"
        }).lazily();

        const queryResult = await lazyQuery.getValue();
        assert.strictEqual(queryResult.length, 3);
        assert.strictEqual(queryResult[0].name, "John");
    });

    it("query count lazily", async () => {
        const session = store.openSession();

        const user1 = new User();
        user1.name = "John";

        const user2 = new User();
        user2.name = "Jane";

        const user3 = new User();
        user3.name = "Tarzan";

        await session.store(user1, "users/1");
        await session.store(user2, "users/2");
        await session.store(user3, "users/3");
        await session.saveChanges();

        const lazyQuery = session.query<User>({
            collection: "Users"
        }).countLazily();

        const queryResult = await lazyQuery.getValue();
        assert.strictEqual(queryResult, 3);
    });
});

export class Dog {
    public id: string;
    public name: string;
    public breed: string;
    public color: string;
    public age: number;
    public vaccinated: boolean;
}

export class DogsIndexResult {
    public name: string;
    public age: number;
    public vaccinated: boolean;
}

export class DogsIndex extends AbstractJavaScriptIndexCreationTask<Dog, Pick<Dog, "name" | "age" | "vaccinated">> {
    public constructor() {
        super();
        this.map(Dog, d => {
            return {
                name: d.name,
                age: d.age,
                vaccinated: d.vaccinated
            }
        });
    }
}

export class UsersByName extends AbstractJavaScriptIndexCreationTask<User, { name: string, count: number }> {
    public constructor() {
        super();

        this.map(User, c => {
            return {
                name: c.name,
                count: 1
            }
        });

        this.reduce(c => c.groupBy(x => x.name).aggregate(g => {
            return {
                name: g.key,
                count: g.values.reduce((a, b) => a + b.count, 0)
            }
        }));
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
    await testContext.waitForIndexing(store);
}

class ReduceResult {
    public count: number;
    public name: string;
    public age: number;
}


class Article {
    public title: string;
    public description: string;
    public isDeleted: boolean;
}
