import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    IDocumentSession,
} from "../../../src";
import { Order, Company, Employee } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

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

function incCounter(
    session: IDocumentSession, id: string, counter: string, val: number) {
    session.countersFor(id).increment(counter, val);
}

function getFirstObjectValue(o: object) {
    const keys = Object.keys(o);
    return o[keys[0]];
}

describe.skip("QueryOnCountersTest", function () { //TODO: unskip

    let store: IDocumentStore;

    beforeEach(async function () {
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
            assert.strictEqual(query.toString(), "from 'orders' include counters('downloads')");

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
            assert.strictEqual(query.toString(), "from 'orders' include counters('downloads'),counters('likes')");

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
                assert.strictEqual(query.toString(), "from 'orders' include counters()");

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

            incCounter(session, "orders/1-A", "downloads", 100);
            incCounter(session, "orders/2-A", "downloads", 200);
            incCounter(session, "orders/3-A", "downloads", 300);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "Orders" })
                .include(i => i
                    .includeCounter("downloads")
                    .includeDocuments("company"));
            assert.strictEqual(query.toString(), "from 'Orders' include company,counters('downloads')");
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
            incCounter(session, "employees/1-A", "downloads", 100);
            incCounter(session, "employees/2-A", "downloads", 200);
            incCounter(session, "employees/3-A", "downloads", 300);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "Orders" })
                .include(i => i.includeCounter("employee", "downloads"));
            assert.strictEqual(query.toString(), "from 'Orders' include counters(employee, 'downloads')");
            const queryResult = await query.all();
            assert.strictEqual(session.advanced.numberOfRequests, 1);

            assert.strictEqual(await session.countersFor("employees/1-A").get("downloads"), 100);
            assert.strictEqual(await session.countersFor("employees/2-A").get("downloads"), 200);
            assert.strictEqual(await session.countersFor("employees/3-A").get("downloads"), 300);

            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }

    });

    it("sessionQueryIncludeCountersOfRelatedDocument", async function () {
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

            session.countersFor("employees/1-A").increment("downloads", 100);
            session.countersFor("employees/2-A").increment("downloads", 200);
            session.countersFor("employees/3-A").increment("downloads", 300);

            session.countersFor("employees/1-A").increment("likes", 1000);
            session.countersFor("employees/2-A").increment("likes", 2000);

            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const query = session.query({ collection: "Orders" })
                .include(i => i.includeCounters("employee", [ "downloads", "likes" ]));

            assertThat(query.toString())
                .isEqualTo("from 'Orders' include counters(employee, 'downloads'),counters(employee, 'likes')");

            const results = await query.all();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // included counters should be in cache
            let dic = await session.countersFor("employees/1-A").get(["downloads", "likes"]);
            assertThat(dic)
                .containsEntry("downloads", 100)
                .containsEntry("likes", 1000);

            dic = await session.countersFor("employees/2-A").get([ "downloads", "likes" ]);
            assertThat(dic)
                .containsEntry("downloads", 200)
                .containsEntry("likes", 2000);

            dic = await session.countersFor("employees/3-A").get(["downloads", "likes"]);
            assertThat(dic)
                .containsEntry("downloads", 300);

            assertThat(dic["likes"])
                .isNull();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("sessionQueryIncludeCountersOfDocumentAndOfRelatedDocument", async function () {
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

            session.countersFor("orders/1-A").increment("likes", 100);
            session.countersFor("orders/2-A").increment("likes", 200);
            session.countersFor("orders/3-A").increment("likes", 300);

            session.countersFor("employees/1-A").increment("downloads", 1000);
            session.countersFor("employees/2-A").increment("downloads", 2000);
            session.countersFor("employees/3-A").increment("downloads", 3000);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "Orders" })
                .include(i => i.includeCounter("likes").includeCounter("employee", "downloads"));

            assertThat(query.toString())
                .isEqualTo("from 'Orders' include counters('likes'),counters(employee, 'downloads')");

            const orders = await query.all();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // included counters should be in cache
            let order = orders[0];
            assertThat(order.id)
                .isEqualTo("orders/1-A");
            let val = await session.countersFor(order).get("likes");
            assertThat(val)
                .isEqualTo(100);

            order = orders[1];
            assertThat(order.id)
                .isEqualTo("orders/2-A");
            val = await session.countersFor(order).get("likes");
            assertThat(val)
                .isEqualTo(200);

            order = orders[2];
            assertThat(order.id)
                .isEqualTo("orders/3-A");
            val = await session.countersFor(order).get("likes");
            assertThat(val)
                .isEqualTo(300);

            val = await session.countersFor("employees/1-A").get("downloads");
            assertThat(val)
                .isEqualTo(1000);

            val = await session.countersFor("employees/2-A").get("downloads");
            assertThat(val)
                .isEqualTo(2000);

            val = await session.countersFor("employees/3-A").get("downloads");
            assertThat(val)
                .isEqualTo(3000);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

    });

    it("sessionQueryIncludeAllCountersOfDocumentAndOfRelatedDocument", async function () {
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
            session.countersFor("orders/1-A").increment("likes", 100);
            session.countersFor("orders/2-A").increment("likes", 200);
            session.countersFor("orders/3-A").increment("likes", 300);

            session.countersFor("orders/1-A").increment("downloads", 1000);
            session.countersFor("orders/2-A").increment("downloads", 2000);

            session.countersFor("employees/1-A").increment("likes", 100);
            session.countersFor("employees/2-A").increment("likes", 200);
            session.countersFor("employees/3-A").increment("likes", 300);
            session.countersFor("employees/1-A").increment("downloads", 1000);
            session.countersFor("employees/2-A").increment("downloads", 2000);
            session.countersFor("employees/3-A").increment("cats", 5);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.query<Order>({ collection: "Orders" })
                .include(i => i
                    .includeAllCounters()
                    .includeAllCounters("employee"));

            assertThat(query.toString())
                .isEqualTo("from 'Orders' include counters(),counters(employee)");

            const orders = await query.all();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // included counters should be in cache
            let order = orders[0];
            assertThat(order.id)
                .isEqualTo("orders/1-A");
            let dic = await session.countersFor(order).getAll();
            assertThat(dic)
                .hasSize(2)
                .containsEntry("likes", 100)
                .containsEntry("downloads", 1000);

            order = orders[1];
            assertThat(order.id)
                .isEqualTo("orders/2-A");

            dic = await session.countersFor(order).getAll();
            assertThat(dic)
                .hasSize(2)
                .containsEntry("likes", 200)
                .containsEntry("downloads", 2000);

            order = orders[2];
            assertThat(order.id)
                .isEqualTo("orders/3-A");

            dic = await session.countersFor(order).getAll();
            assertThat(dic)
                .hasSize(1)
                .containsEntry("likes", 300);

            dic = await session.countersFor("employees/1-A").getAll();
            assertThat(dic)
                .hasSize(2)
                .containsEntry("likes", 100)
                .containsEntry("downloads", 1000);

            dic = await session.countersFor("employees/2-A").getAll();
            assertThat(dic)
                .hasSize(2)
                .containsEntry("likes", 200)
                .containsEntry("downloads", 2000);

            dic = await session.countersFor("employees/3-A").getAll();
            assertThat(dic)
                .hasSize(2)
                .containsEntry("likes", 300)
                .containsEntry("cats", 5);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("countersShouldBeCachedOnCollection", async () => {
        {
            const session = store.openSession();
            const order = Object.assign(new Order(), {
                company: "companies/1-A"
            });
            await session.store(order, "orders/1-A");
            session.countersFor("orders/1-A")
                .increment("downloads", 100);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.query<Order>(Order)
                .include(i => i.includeCounter("downloads"))
                .all();

            let counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(100);

            session.countersFor("orders/1-A")
                .increment("downloads", 200);
            await session.saveChanges();

            await session.query<Order>(Order)
                .include(i => i.includeCounters(["downloads"]))
                .all();

            counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(300);

            await session.countersFor("orders/1-A")
                .increment("downloads", 200);
            await session.saveChanges();

            await session.query<Order>(Order)
                .include(i => i.includeCounter("downloads"))
                .all();

            counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(500);
        }

        {
            const session = store.openSession();

            await session.load("orders/1-A", {
                documentType: Order,
                includes: i => i.includeCounter("downloads")
            });
            let counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(500);

            await session.countersFor("orders/1-A")
                .increment("downloads", 200);
            await session.saveChanges();

            await session.load("order/1-A", {
                documentType: Order,
                includes: i => i.includeCounter("downloads")
            });
            counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(700);
        }
    });

    it("countersShouldBeCachedOnAllDocsCollection", async () => {
        {
            const session = store.openSession();
            const order = Object.assign(new Order(), {
                company: "companies/1-A"
            });

            await session.store(order, "orders/1-A");
            await session.countersFor("orders/1-A")
                .increment("downloads", 100);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.advanced.rawQuery("from @all_docs include counters($p0)")
                .addParameter("p0", ["downloads"])
                .all();

            let counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(100);

            await session.countersFor("orders/1-A")
                .increment("downloads", 200);
            await session.saveChanges();

            await session.advanced.rawQuery("from @all_docs include counters()")
                .all();

            counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(300);

            await session.countersFor("orders/1-A")
                .increment("downloads", 200);
            await session.saveChanges();

            await session
                .advanced
                .rawQuery("from @all_docs include counters($p0)")
                .addParameter("p0", ["downloads"])
                .all();

            counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(500);
        }
    });

    it("countersCachingShouldHandleDeletion_includeCounterDownload", async () => {
        await countersCachingShouldHandleDeletion(async session => {
            await session.query(Order)
                .include(i => i.includeCounter("downloads"))
                .all();
        }, null);
    });

    it("countersCachingShouldHandleDeletion_includeCounterUpload", async () => {
        await countersCachingShouldHandleDeletion(async session => {
            await session.query(Order)
                .include(i => i.includeCounter("uploads"))
                .all();
        }, 300);
    });

    it("countersCachingShouldHandleDeletion_includeCounters", async () => {
        await countersCachingShouldHandleDeletion(async session => {
            await session.query(Order)
                .include(i => i.includeCounters(["downloads", "uploads", "bugs"]))
                .all();
        }, null);
    });

    it("countersCachingShouldHandleDeletion_includeAllCounters", async () => {
        await countersCachingShouldHandleDeletion(async session => {
            await session.query(Order)
                .include(i => i.includeAllCounters())
                .all();
        }, null);
    });
});


async function countersCachingShouldHandleDeletion(sessionCounter: (session: IDocumentSession) => Promise<void>, expectedCounterValue: number) {
    const store = await testContext.getDocumentStore();
    try {
        const session = store.openSession();
        try {
            const order = Object.assign(new Order(), {
                company: "companies/1-A"
            });

            await session.store(order, "orders/1-A");

            await session.countersFor("orders/1-A")
                .increment("downloads", 100);
            await session.countersFor("orders/1-A")
                .increment("uploads", 123);
            await session.countersFor("orders/1-A")
                .increment("bugs", 0xDEAD);
            await session.saveChanges();
        } finally {
            session.dispose();
        }

        {
            const session = store.openSession();
            await session.query<Order>(Order)
                .include(i => i.includeCounter("downloads"))
                .all();

            let counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(100);

            {
                const writeSession = store.openSession();
                await writeSession.countersFor("orders/1-A")
                    .increment("downloads", 200);
                await writeSession.saveChanges();
            }

            await session.query<Order>(Order)
                .include(i => i.includeCounter("downloads"))
                .all();

            counterValue = await session.countersFor("orders/1-A")
                .get("downloads");
            assertThat(counterValue)
                .isEqualTo(300);
            await session.saveChanges();

            {
                const writeSession = store.openSession();
                await writeSession.countersFor("orders/1-A").delete("downloads");
                await writeSession.saveChanges();
            }

            await sessionCounter(session);

            counterValue = await session.countersFor("orders/1-A").get("downloads");

            assertThat(counterValue)
                .isEqualTo(expectedCounterValue);
        }
    } finally {
        store.dispose();
    }
}

