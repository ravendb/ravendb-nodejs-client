import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    IDocumentSession,
} from "../../../src";
import { Order, Company, Employee } from "../../Assets/Entities";

class User {
    public name: string;
    public age: number;
    public friendId: string;
}

interface CounterResult {
    downloads: number;
    likes: number;
    name: string;
}

interface CounterResult2 {
    downloadsCount: number;
    likesCount: number;
}

interface CounterResult3 {
    downloads: { [key: string]: number };
}

interface CounterResult4 {
    downloads: number;
    name: string;
    likes: { [key: string]: number };
}

interface CounterResult5 {
    counters: { [key: string]: number };
}

interface CounterResult6 {
    counter: number;
}
interface CounterResult7 {
    downloads: number;
    friendsDownloads: number;
    name: string;
}

describe("QueryOnCountersTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.enableFiddler();
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("rawQuerySelectSingleCounter", async () => {
        {
            const session = store.openSession();
            await storeNewUser(session, "Jerry", "users/1-A");
            await storeNewUser(session, "Bob", "users/2-A");
            await storeNewUser(session, "Pigpen", "users/3-A");
            incCounter(session, "users/1-A", "Downloads", 100);
            incCounter(session, "users/2-A", "Downloads", 200);
            incCounter(session, "users/3-A", "Likes", 300);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.advanced
                .rawQuery<CounterResult>("from users select counter(\"Downloads\") as downloads")
                .all();
            assert.strictEqual(query.length, 3);
            assert.strictEqual(query[0].downloads, 100);
            assert.strictEqual(query[1].downloads, 200);
            assert.ok("downloads" in query[2]);
        }
    });

    it("rawQuerySelectSingleCounterWithDocAlias", async function () {
        {
            const session = store.openSession();
            await storeNewUser(session, "Jerry", "users/1-A");
            await storeNewUser(session, "Bob", "users/2-A");
            await storeNewUser(session, "Pigpen", "users/3-A");
            incCounter(session, "users/1-A", "Downloads", 100);
            incCounter(session, "users/2-A", "Downloads", 200);
            incCounter(session, "users/3-A", "Likes", 300);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const query = await session.advanced
                .rawQuery<CounterResult>("from users as u select counter(u, \"Downloads\") as downloads")
                .all();
            assert.strictEqual(query.length, 3);
            assert.strictEqual(query[0].downloads, 100);
            assert.strictEqual(query[1].downloads, 200);
            assert.ok(query[2].downloads === null);
        }
    });

    it("rawQuerySelectMultipleCounters", async function () {
        {
            const session = store.openSession();
            await storeNewUser(session, "Jerry", "users/1-A");
            await storeNewUser(session, "Bob", "users/2-A");
            await storeNewUser(session, "Pigpen", "users/3-A");
            incCounter(session, "users/1-A", "downloads", 100);
            incCounter(session, "users/1-A", "likes", 200);
            incCounter(session, "users/2-A", "downloads", 400);
            incCounter(session, "users/2-A", "likes", 800);
            incCounter(session, "users/3-A", "likes", 1600);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.advanced.rawQuery<CounterResult>(
                "from users select counter(\"downloads\"), counter(\"likes\")")
                .all();
            assert.strictEqual(query.length, 3);
            assert.strictEqual(query[0].downloads, 100);
            assert.strictEqual(query[0].likes, 200);

            assert.strictEqual(query[1].downloads, 400);
            assert.strictEqual(query[1].likes, 800);

            assert.strictEqual(query[2].downloads, null);
            assert.strictEqual(query[2].likes, 1600);
        }

    });

    it("rawQuerySimpleProjectionWithCounter", async function () {
        {
            const session = store.openSession();
            await storeNewUser(session, "Jerry", "users/1-A");
            await storeNewUser(session, "Bob", "users/2-A");
            await storeNewUser(session, "Pigpen", "users/3-A");
            incCounter(session, "users/1-A", "downloads", 100);
            incCounter(session, "users/2-A", "downloads", 200);
            incCounter(session, "users/3-A", "likes", 400);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const query = await session.advanced.rawQuery<CounterResult>(
                "from users select name, counter('downloads')")
                .all();
            assert.strictEqual(query.length, 3);
            assert.strictEqual(query[0].name, "Jerry");
            assert.strictEqual(query[0].downloads, 100);

            assert.strictEqual(query[1].name, "Bob");
            assert.strictEqual(query[1].downloads, 200);

            assert.strictEqual(query[2].name, "Pigpen");
            assert.strictEqual(query[2].downloads, null);
        }
    });

    it("rawQueryJsProjectionWithCounterRawValues", async function () {
        {
            const session = store.openSession();
            await storeNewUser(session, "Jerry", "users/1-A");
            await storeNewUser(session, "Bob", "users/2-A");
            await storeNewUser(session, "Pigpen", "users/3-A");
            incCounter(session, "users/1-A", "downloads", 100);
            incCounter(session, "users/1-A", "likes", 200);
            incCounter(session, "users/2-A", "downloads", 300);
            incCounter(session, "users/2-A", "likes", 400);
            incCounter(session, "users/3-A", "likes", 500);
            await session.saveChanges();
        }
        {
            const session = store.openSession();

            const query = await session.advanced
                .rawQuery<CounterResult4>(`
            from Users as u select { name: u.name, downloads: counter(u, 'downloads'), likes: counterRaw(u, 'likes') }`)
                .all();
            assert.strictEqual(query.length, 3);
            assert.strictEqual(query[0].name, "Jerry");
            assert.strictEqual(query[0].downloads, 100);
            assert.strictEqual(
                getFirstObjectValue(query[0].likes), 200);

            assert.strictEqual(query[1].name, "Bob");
            assert.strictEqual(query[1].downloads, 300);
            assert.strictEqual(
                getFirstObjectValue(query[1].likes), 400);

            assert.strictEqual(query[2].name, "Pigpen");
            assert.strictEqual(
                getFirstObjectValue(query[2].likes), 500);
            assert.strictEqual(query[2].downloads, null);
        }
    });

    it("sessionQueryIncludeSingleCounter", async function () {
        {
            const session = store.openSession();
            for (let i = 1; i <= 3; i++) {
                await storeNewOrder(session, {
                    company: `companies/${i}-A`
                }, `orders/${i}-A`);
            }
            incCounter(session, "orders/1-A", "downloads", 100);
            incCounter(session, "orders/2-A", "downloads", 200);
            incCounter(session, "orders/3-A", "downloads", 300);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "orders" })
                .include(i => i.includeCounter("downloads"));
            assert.strictEqual(query.toString(), "from orders include counters($p0)");

            const queryResult = await query.all();
            assert.strictEqual(session.advanced.numberOfRequests, 1);

            let order = queryResult[0];
            assert.strictEqual(order["id"], "orders/1-A");
            let val = await session.countersFor(order).get("downloads");
            assert.strictEqual(val, 100);

            order = queryResult[1];
            assert.strictEqual(order["id"], "orders/2-A");
            val = await session.countersFor(order).get("downloads");
            assert.strictEqual(val, 200);

            order = queryResult[2];
            assert.strictEqual(order["id"], "orders/3-A");
            val = await session.countersFor(order).get("downloads");
            assert.strictEqual(val, 300);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }
    });

    it("sessionQueryIncludeMultipleCounters", async function () {
        {
            const session = store.openSession();
            for (let i = 1; i <= 3; i++) {
                await storeNewOrder(session, {
                    company: `companies/${i}-A`
                }, `orders/${i}-A`);
            }
            incCounter(session, "orders/1-A", "downloads", 100);
            incCounter(session, "orders/2-A", "downloads", 200);
            incCounter(session, "orders/3-A", "downloads", 300);
            incCounter(session, "orders/1-A", "likes", 1000);
            incCounter(session, "orders/2-A", "likes", 2000);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "orders" })
                .include(i => i.includeCounters(["downloads", "likes"]));
            assert.strictEqual(query.toString(), "from orders include counters($p0)");

            const queryResult = await query.all();
            assert.strictEqual(session.advanced.numberOfRequests, 1);

            let order = queryResult[0];
            assert.strictEqual(order["id"], "orders/1-A");
            assert.strictEqual(await session.countersFor(order).get("downloads"), 100);
            assert.strictEqual(await session.countersFor(order).get("likes"), 1000);

            order = queryResult[1];
            assert.strictEqual(order["id"], "orders/2-A");
            assert.strictEqual(await session.countersFor(order).get("downloads"), 200);
            assert.strictEqual(await session.countersFor(order).get("likes"), 2000);

            order = queryResult[2];
            assert.strictEqual(order["id"], "orders/3-A");
            assert.strictEqual(await session.countersFor(order).get("downloads"), 300);
            assert.strictEqual(await session.countersFor(order).get("likes"), null);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }
    });

    it("sessionQueryIncludeAllCounters", async function () {
        {
            const session = store.openSession();
            for (let i = 1; i <= 3; i++) {
                await storeNewOrder(session, {
                    company: `companies/${i}-A`
                }, `orders/${i}-A`);
            }
            incCounter(session, "orders/1-A", "Downloads", 100);
            incCounter(session, "orders/2-A", "Downloads", 200);
            incCounter(session, "orders/3-A", "Downloads", 300);
            incCounter(session, "orders/1-A", "Likes", 1000);
            incCounter(session, "orders/2-A", "Likes", 2000);
            incCounter(session, "orders/1-A", "Votes", 10000);
            incCounter(session, "orders/3-A", "Cats", 5);
            await session.saveChanges();
        }
        {
            {
                const session = store.openSession();
                const query = session.query<Order>({ collection: "orders" })
                    .include(i => i.includeAllCounters());
                assert.strictEqual(query.toString(), "from orders include counters()");

                const queryResult = await query.all();
                assert.strictEqual(session.advanced.numberOfRequests, 1);

                let order = queryResult[0];
                assert.strictEqual(order["id"], "orders/1-A");
                let counters = await session.countersFor(order).getAll();
                assert.strictEqual(counters["Downloads"], 100);
                assert.strictEqual(counters["Likes"], 1000);
                assert.strictEqual(counters["Votes"], 10000);

                order = queryResult[1];
                assert.strictEqual(order["id"], "orders/2-A");
                counters = await session.countersFor(order).getAll();
                assert.strictEqual(counters["Downloads"], 200);
                assert.strictEqual(counters["Likes"], 2000);

                order = queryResult[2];
                assert.strictEqual(order["id"], "orders/3-A");
                counters = await session.countersFor(order).getAll();
                assert.strictEqual(counters["Cats"], 5);
                assert.strictEqual(counters["Downloads"], 300);

                assert.strictEqual(session.advanced.numberOfRequests, 1);
            }

        }

    });

    it("sessionQueryIncludeCounterAndDocument", async function () {

        {
            const session = store.openSession();
            for (let i = 1; i <= 3; i++) {
                await storeNewOrder(session, {
                    company: `companies/${i}-A`
                }, `orders/${i}-A`);
            }
            const companies = ["HR", "HP", "Google"];
            for (let i = 1; i <= 3; i++) {
                await storeNewCompany(session, {
                    name: companies[i - 1]
                }, `companies/${i}-A`);
            }

            incCounter(session, "orders/1-A", "Downloads", 100);
            incCounter(session, "orders/2-A", "Downloads", 200);
            incCounter(session, "orders/3-A", "Downloads", 300);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "Orders" })
                .include(i => i
                    .includeCounter("downloads")
                    .includeDocuments("company"));
            assert.strictEqual(query.toString(), "from Orders include company,counters($p0)");
            const queryResult = await query.all();

            assert.strictEqual(session.advanced.numberOfRequests, 1);
            await session.load(["companies/1-A", "companies/2-A", "companies/3-A"]);
            assert.strictEqual(session.advanced.numberOfRequests, 1);

            let order = queryResult[0];
            assert.strictEqual(order["id"], "orders/1-A");
            assert.strictEqual(await session.countersFor(order).get("downloads"), 100);

            order = queryResult[1];
            assert.strictEqual(order["id"], "orders/2-A");
            assert.strictEqual(await session.countersFor(order).get("downloads"), 200);

            order = queryResult[2];
            assert.strictEqual(order["id"], "orders/3-A");
            assert.strictEqual(await session.countersFor(order).get("downloads"), 300);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }
    });

    it("sessionQueryIncludeCounterOfRelatedDocument", async function () {
        {
            const session = store.openSession();
            for (let i = 1; i <= 3; i++) {
                await storeNewOrder(session, {
                    employee: `employees/${i}-A`
                }, `orders/${i}-A`);
            }
            const empNames = ["Aviv", "Jerry", "Bob"];
            for (let i = 1; i <= 3; i++) {
                await storeNewDoc(session, {
                    name: empNames[i - 1]
                }, `employees/${i}-A`, Employee);
            }
            incCounter(session, "employees/1-A", "Downloads", 100);
            incCounter(session, "employees/2-A", "Downloads", 200);
            incCounter(session, "employees/3-A", "Downloads", 300);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "Orders" })
                .include(i => i.includeCounter("employee", "downloads"));
            assert.strictEqual(query.toString(), "from Orders include counters(employee, $p0)");
            const queryResult = await query.all();
            assert.strictEqual(session.advanced.numberOfRequests, 1);

            assert.strictEqual(await session.countersFor("employees/1-A").get("downloads"), 100);
            assert.strictEqual(await session.countersFor("employees/2-A").get("downloads"), 200);
            assert.strictEqual(await session.countersFor("employees/3-A").get("downloads"), 300);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }

    });
});

async function storeNewDoc(
    session: IDocumentSession, data: object, id: string, clazz: any) {
    const order = Object.assign(new clazz(), data);
    await session.store(order, id);
    return order;
}

async function storeNewUser(session: IDocumentSession, name: string, id: string): Promise<User> {
    const user = Object.assign(new User(), { name });
    await session.store(user, id);
    return user;
}

async function storeNewOrder(
    session: IDocumentSession, data: object, id: string) {
    const order = Object.assign(new Order(), data);
    await session.store(order, id);
    return order;
}

async function storeNewCompany(
    session: IDocumentSession, data: object, id: string) {
    const company = Object.assign(new Company(), data);
    await session.store(company, id);
    return company;
}

async function incCounter(
    session: IDocumentSession, id: string, counter: string, val: number) {
    session.countersFor(id).increment(counter, val);
}

function getFirstObjectValue(o: object) {
    const keys = Object.keys(o);
    return o[keys[0]];
}

    /*TODO
       [Fact]
       public void SessionQueryIncludeCountersOfRelatedDocument()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A"
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A"
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A"
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("employees/1-A").Increment("Downloads", 100);
                   session.CountersFor("employees/2-A").Increment("Downloads", 200);
                   session.CountersFor("employees/3-A").Increment("Downloads", 300);
                    session.CountersFor("employees/1-A").Increment("Likes", 1000);
                   session.CountersFor("employees/2-A").Increment("Likes", 2000);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i.IncludeCounters(o => o.Employee, new[] { "Downloads", "Likes" }));
                    Assert.Equal("from Orders as o " +
                                "include counters(o.Employee, $p0)"
                       , query.ToString());
                    var results = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   var dic = session.CountersFor("employees/1-A").Get(new[] { "Downloads", "Likes" });
                   Assert.Equal(100, dic["Downloads"]);
                   Assert.Equal(1000, dic["Likes"]);
                    dic = session.CountersFor("employees/2-A").Get(new[] { "Downloads", "Likes" });
                   Assert.Equal(200, dic["Downloads"]);
                   Assert.Equal(2000, dic["Likes"]);
                    dic = session.CountersFor("employees/3-A").Get(new[] { "Downloads", "Likes" });
                   Assert.Equal(300, dic["Downloads"]);
                   Assert.Null(dic["Likes"]);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
        [Fact]
       public void SessionQueryIncludeCountersOfDocumentAndOfRelatedDocument()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A"
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A"
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A"
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Downloads", 3000);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i
                           .IncludeCounter("Likes")
                           .IncludeCounter(x => x.Employee, "Downloads"));
                    Assert.Equal("from Orders as x " +
                                "include counters(x, $p0),counters(x.Employee, $p1)"
                       , query.ToString());
                    var orders = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   var order = orders[0];
                   Assert.Equal("orders/1-A", order.Id);
                   var val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(100, val);
                    order = orders[1];
                   Assert.Equal("orders/2-A", order.Id);
                   val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(200, val);
                    order = orders[2];
                   Assert.Equal("orders/3-A", order.Id);
                   val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(300, val);
                    val = session.CountersFor("employees/1-A").Get("Downloads");
                   Assert.Equal(1000, val);
                    val = session.CountersFor("employees/2-A").Get("Downloads");
                   Assert.Equal(2000, val);
                    val = session.CountersFor("employees/3-A").Get("Downloads");
                   Assert.Equal(3000, val);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
        [Fact]
       public async Task AsyncSessionQueryIncludeCountersOfDocumentAndOfRelatedDocument()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A"
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A"
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A"
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Downloads", 3000);
                    session.SaveChanges();
               }
                using (var session = store.OpenAsyncSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i
                           .IncludeCounter("Likes")
                           .IncludeCounter(x => x.Employee, "Downloads"));
                    Assert.Equal("from Orders as x " +
                                "include counters(x, $p0),counters(x.Employee, $p1)"
                       , query.ToString());
                    var orders = await query.ToListAsync();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   var order = orders[0];
                   Assert.Equal("orders/1-A", order.Id);
                   var val = await session.CountersFor(order).GetAsync("Likes");
                   Assert.Equal(100, val);
                    order = orders[1];
                   Assert.Equal("orders/2-A", order.Id);
                   val = await session.CountersFor(order).GetAsync("Likes");
                   Assert.Equal(200, val);
                    order = orders[2];
                   Assert.Equal("orders/3-A", order.Id);
                   val = await session.CountersFor(order).GetAsync("Likes");
                   Assert.Equal(300, val);
                    val = await session.CountersFor("employees/1-A").GetAsync("Downloads");
                   Assert.Equal(1000, val);
                    val = await session.CountersFor("employees/2-A").GetAsync("Downloads");
                   Assert.Equal(2000, val);
                    val = await session.CountersFor("employees/3-A").GetAsync("Downloads");
                   Assert.Equal(3000, val);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
        [Fact]
       public void SessionQueryIncludeCountersOfDocumentAndOfRelatedDocumentWhere()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A",
                       OrderedAt = new DateTime(1999, 1, 21)
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A",
                       OrderedAt = new DateTime(2016, 6, 6)
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A",
                       OrderedAt = new DateTime(1942, 8, 1)
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Downloads", 3000);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i
                           .IncludeCounter("Likes")
                           .IncludeCounter(x => x.Employee, "Downloads"))
                       .Where(o => o.OrderedAt.Year < 2000);
                    Assert.Equal("from Orders as x where x.OrderedAt.Year < $p2 " +
                                "include counters(x, $p0),counters(x.Employee, $p1)"
                       , query.ToString());
                    var orders = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   Assert.Equal(2, orders.Count);
                    var order = orders[0];
                   Assert.Equal("orders/1-A", order.Id);
                    var val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(100, val);
                    val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(1000, val);
                    order = orders[1];
                   Assert.Equal("orders/3-A", order.Id);
                    val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(300, val);
                    val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(3000, val);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
        [Fact]
       public void SessionQueryIncludeCountersWithSelect()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A"
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A"
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A"
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Downloads", 3000);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i
                           .IncludeCounter("Likes")
                           .IncludeCounter(x => x.Employee, "Downloads"))
                       .Select(o => new
                       {
                           o.Id,
                           o.Employee
                       });
                    Assert.Equal("from Orders as x " +
                                "select id() as Id, Employee " +
                                "include counters(x, $p0),counters(x.Employee, $p1)"
                       , query.ToString());
                    var results = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   Assert.Equal(3, results.Count);
                    var order = results[0];
                   Assert.Equal("orders/1-A", order.Id);
                    var val = session.CountersFor(order.Id).Get("Likes");
                   Assert.Equal(100, val);
                   val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(1000, val);
                    order = results[1];
                   Assert.Equal("orders/2-A", order.Id);
                    val = session.CountersFor(order.Id).Get("Likes");
                   Assert.Equal(200, val);
                   val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(2000, val);
                    order = results[2];
                   Assert.Equal("orders/3-A", order.Id);
                    val = session.CountersFor(order.Id).Get("Likes");
                   Assert.Equal(300, val);
                   val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(3000, val);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
       
       [Fact]
       public void SessionQueryIncludeCountersUsingFromAliasWithSelectAndWhere()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A",
                       OrderedAt = new DateTime(1999, 1, 21)
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A",
                       OrderedAt = new DateTime(2016, 6, 6)
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A",
                       OrderedAt = new DateTime(1942, 8, 1)
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Downloads", 3000);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = from o in session.Query<Order>()
                                   .Include(i => i
                                       .IncludeCounter("Likes")
                                       .IncludeCounter(x => x.Employee, "Downloads")
                                       .IncludeDocuments("Employee"))
                               where o.OrderedAt.Year < 2000
                               select new
                               {
                                   o.Id,
                                   o.OrderedAt,
                                   o.Employee,
                                    //this will create js projection with from-alias 'o'
                                   Foo = o.Employee + o.Company
                               };
                    Assert.Equal("from Orders as o " +
                                "where o.OrderedAt.Year < $p2 " +
                                "select { Id : id(o), OrderedAt : new Date(Date.parse(o.OrderedAt)), " +
                                   "Employee : o.Employee, Foo : o.Employee+o.Company } " +
                                "include Employee,counters(o, $p0),counters(o.Employee, $p1)"
                       , query.ToString());
                    var results = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included documents should be in cache
                   session.Load<Employee>(new[] { "employees/1-A", "employees/3-A" });
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   Assert.Equal(2, results.Count);
                    var order = results[0];
                   Assert.Equal("orders/1-A", order.Id);
                   Assert.Equal(new DateTime(1999, 1, 21), order.OrderedAt);
                    var val = session.CountersFor(order.Id).Get("Likes");
                   Assert.Equal(100, val);
                    val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(1000, val);
                    order = results[1];
                   Assert.Equal("orders/3-A", order.Id);
                   Assert.Equal(new DateTime(1942, 8, 1), order.OrderedAt);
                    val = session.CountersFor(order.Id).Get("Likes");
                   Assert.Equal(300, val);
                    val = session.CountersFor(order.Employee).Get("Downloads");
                   Assert.Equal(3000, val);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
        [Fact]
       public void SessionQueryIncludeAllCountersOfDocumentAndOfRelatedDocument()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A"
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A"
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A"
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                   session.CountersFor("orders/1-A").Increment("Downloads", 1000);
                   session.CountersFor("orders/2-A").Increment("Downloads", 2000);
                    session.CountersFor("employees/1-A").Increment("Likes", 100);
                   session.CountersFor("employees/2-A").Increment("Likes", 200);
                   session.CountersFor("employees/3-A").Increment("Likes", 300);
                   session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Cats", 5);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i
                           .IncludeAllCounters()
                           .IncludeAllCounters(x => x.Employee));
                    Assert.Equal("from Orders as x " +
                                "include counters(x),counters(x.Employee)"
                       , query.ToString());
                    var orders = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   var order = orders[0];
                   Assert.Equal("orders/1-A", order.Id);
                   var dic = session.CountersFor(order).GetAll();
                   Assert.Equal(2, dic.Count);
                   Assert.Equal(100, dic["Likes"]);
                   Assert.Equal(1000, dic["Downloads"]);
                    order = orders[1];
                   Assert.Equal("orders/2-A", order.Id);
                   dic = session.CountersFor(order).GetAll();
                   Assert.Equal(2, dic.Count);
                   Assert.Equal(200, dic["Likes"]);
                   Assert.Equal(2000, dic["Downloads"]);
                    order = orders[2];
                   Assert.Equal("orders/3-A", order.Id);
                   dic = session.CountersFor(order).GetAll();
                   Assert.Equal(1, dic.Count);
                   Assert.Equal(300, dic["Likes"]);
                    dic = session.CountersFor("employees/1-A").GetAll();
                   Assert.Equal(2, dic.Count);
                   Assert.Equal(100, dic["Likes"]);
                   Assert.Equal(1000, dic["Downloads"]);
                    dic = session.CountersFor("employees/2-A").GetAll();
                   Assert.Equal(2, dic.Count);
                   Assert.Equal(200, dic["Likes"]);
                   Assert.Equal(2000, dic["Downloads"]);
                    dic = session.CountersFor("employees/3-A").GetAll();
                   Assert.Equal(2, dic.Count);
                   Assert.Equal(300, dic["Likes"]);
                   Assert.Equal(5, dic["Cats"]);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
        [Fact]
       public void SessionQueryIncludeDocumentAndCountersOfDocumentAndOfRelatedDocument()
       {
           using (var store = GetDocumentStore())
           {
               using (var session = store.OpenSession())
               {
                   session.Store(new Order
                   {
                       Employee = "employees/1-A"
                   }, "orders/1-A");
                   session.Store(new Order
                   {
                       Employee = "employees/2-A"
                   }, "orders/2-A");
                   session.Store(new Order
                   {
                       Employee = "employees/3-A"
                   }, "orders/3-A");
                   session.Store(new Employee
                   {
                       FirstName = "Aviv"
                   }, "employees/1-A");
                   session.Store(new Employee
                   {
                       FirstName = "Jerry"
                   }, "employees/2-A");
                   session.Store(new Employee
                   {
                       FirstName = "Bob"
                   }, "employees/3-A");
                    session.CountersFor("orders/1-A").Increment("Likes", 100);
                   session.CountersFor("orders/2-A").Increment("Likes", 200);
                   session.CountersFor("orders/3-A").Increment("Likes", 300);
                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
                   session.CountersFor("employees/2-A").Increment("Downloads", 2000);
                   session.CountersFor("employees/3-A").Increment("Downloads", 3000);
                    session.SaveChanges();
               }
                using (var session = store.OpenSession())
               {
                   var query = session.Query<Order>()
                       .Include(i => i
                           .IncludeDocuments(o => o.Employee)
                           .IncludeCounter("Likes")
                           .IncludeCounter(x => x.Employee, "Downloads"));
                    Assert.Equal("from Orders as x " +
                                "include Employee,counters(x, $p0),counters(x.Employee, $p1)"
                       , query.ToString());
                    var orders = query.ToList();
                   Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included documents should be in cache
                   var employees = session.Load<Employee>(
                       new[] { "employees/1-A", "employees/2-A", "employees/3-A" });
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                    // included counters should be in cache
                   var order = orders[0];
                   Assert.Equal("orders/1-A", order.Id);
                   var val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(100, val);
                    order = orders[1];
                   Assert.Equal("orders/2-A", order.Id);
                   val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(200, val);
                    order = orders[2];
                   Assert.Equal("orders/3-A", order.Id);
                   val = session.CountersFor(order).Get("Likes");
                   Assert.Equal(300, val);
                    var employee = employees["employees/1-A"];
                   val = session.CountersFor(employee).Get("Downloads");
                   Assert.Equal(1000, val);
                    employee = employees["employees/2-A"];
                   val = session.CountersFor(employee).Get("Downloads");
                   Assert.Equal(2000, val);
                    employee = employees["employees/3-A"];
                   val = session.CountersFor(employee).Get("Downloads");
                   Assert.Equal(3000, val);
                    Assert.Equal(1, session.Advanced.NumberOfRequests);
                }
           }
       }
*/
