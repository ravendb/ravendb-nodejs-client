import { EntitiesCollectionObject, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company, User } from "../../Assets/Entities";
import { Lazy } from "../../../src/Documents/Lazy";
import * as assert from "assert";
import { assertThat } from "../../Utils/AssertExtensions";

describe("LazyTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can lazily load entity", async () => {
        {
            const session = store.openSession();
            for (let i = 1; i <= 6; i++) {
                const company = new Company();
                company.id = "companies/" + i;
                await session.store(company, "companies/" + i);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let lazyCompany: Lazy<Company> = session.advanced.lazily.load<Company>("companies/1");
            assert.ok(!lazyCompany.isValueCreated());

            let company = await lazyCompany.getValue();
            assert.strictEqual(company.id, "companies/1");

            const lazyOrders: Lazy<EntitiesCollectionObject<Company>>
                = session.advanced.lazily.load<Company>(["companies/1", "companies/2"]);
            assert.ok(!lazyOrders.isValueCreated());
            const orders = await lazyOrders.getValue();
            assert.strictEqual(Object.keys(orders).length, 2);

            const company1 = orders["companies/1"];
            const company2 = orders["companies/2"];
            assert.ok(company1);
            assert.ok(company2);

            assert.strictEqual(company1.id, "companies/1");
            assert.strictEqual(company2.id, "companies/2");

            lazyCompany = session.advanced.lazily.load<Company>("companies/3");
            assert.ok(!lazyCompany.isValueCreated());
            company = await lazyCompany.getValue();
            assert.strictEqual(company.id, "companies/3");
        }
    });

    it("can handle nulls", async () => {
        const session = store.openSession();
        const load = session.advanced.lazily.load<Company>(["no_such_1", "no_such_2"]);
        const missingItems = await load.getValue();
        assert.ok("no_such_1" in missingItems);
        assert.ok("no_such_2" in missingItems);
        assert.ok(!missingItems["no_such_1"]);
        assert.ok(!missingItems["no_such_2"]);
    });

    it("can execute all pending lazy operations", async () => {
        {
            const session = store.openSession();
            const company1 = new Company();
            company1.id = "companies/1";
            await session.store(company1, "companies/1");
            const company2 = new Company();
            company2.id = "companies/2";
            await session.store(company2, "companies/2");
            await session.saveChanges();
        }

        {
            let company1Ref: Company;
            let company2Ref: Company;
            const session = store.openSession();

            const company1Lazy: Lazy<Company> = session.advanced.lazily.load<Company>("companies/1");
            assert.ok(!company1Lazy.isValueCreated());

            const company2Lazy: Lazy<Company> = session.advanced.lazily.load<Company>("companies/2");
            assert.ok(!company2Lazy.isValueCreated());

            const beforeReqsCount = session.advanced.numberOfRequests;
            await session.advanced.eagerly.executeAllPendingLazyOperations();
            const promise = Promise.all([
                // we cannot do getValue() before a call to eagerly.executeAll... 
                // since getValue() immediately calls the server in an async fashion
                company1Lazy.getValue().then(x => company1Ref = x),
                company2Lazy.getValue().then(x => company2Ref = x)
            ]);

            assert.ok(company1Lazy.isValueCreated());
            assert.ok(company2Lazy.isValueCreated());

            await promise;
            assert.strictEqual(
                session.advanced.numberOfRequests - beforeReqsCount, 1, "Should have performed 1 request.");

            assert.strictEqual(company1Ref.id, "companies/1");
            assert.strictEqual(company2Ref.id, "companies/2");
        }
    });

    it("can execute queued action when load", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.lastName = "Oren";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let user: User;
            const lazy: Lazy<User> = session.advanced.lazily.load<User>("users/1");

            await session.advanced.eagerly.executeAllPendingLazyOperations();
            user = await lazy.getValue();
            assert.ok(user);
        }
    });

    it("can use cache with lazy loading", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.lastName = "Oren";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.advanced.lazily.load<User>("users/1").getValue();

            const oldRequestCount = session.advanced.numberOfRequests;

            const lazy: Lazy<User> = session.advanced.lazily.load<User>("users/1");
            const user = await lazy.getValue();
            assert.strictEqual(user.lastName, "Oren");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(oldRequestCount);
        }
    });

    it("doesn't lazy load already loaded values", async () => {
        {
            const session = store.openSession();

            const user = new User();
            user.lastName = "Oren";
            await session.store(user, "users/1");

            const user2 = new User();
            user2.lastName = "Marcin";
            await session.store(user2, "users/2");

            const user3 = new User();
            user3.lastName = "John";
            await session.store(user3, "users/3");

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            let lazyLoad = session.advanced.lazily.load(["users/2", "users/3"], User);
            session.advanced.lazily.load(["users/1", "users/3"], User);

            await session.load("users/2", User);
            await session.load("users/3", User);

            await session.advanced.eagerly.executeAllPendingLazyOperations();

            assert.ok(session.advanced.isLoaded("users/1"));

            const users = await lazyLoad.getValue();
            assert.strictEqual(Object.keys(users).length, 2);

            const oldRequestCount = session.advanced.numberOfRequests;
            lazyLoad = session.advanced.lazily.load(["users/3"], User);
            await session.advanced.eagerly.executeAllPendingLazyOperations();

            assert.strictEqual(session.advanced.numberOfRequests, oldRequestCount);
        }
    });
});
