import { IDocumentStore, Lazy } from "../../../../src";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import * as assert from "assert";

export class User {
    public id: string;
    public name: string;
    public partnerId: string;
    public email: string;
    public tags: string[];
    public age: number;
    public active: boolean;
}

describe("CachingOfDocumentInclude", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can cache document with includes", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Ayende";
            await session.store(user);

            const partner = new User();
            partner.partnerId = "users/1-A";
            await session.store(partner);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.include("partnerId")
                .load<User>("users/2-A");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.include("partnerId")
                .load<User>("users/2-A");
            assert.strictEqual(session.advanced.requestExecutor.cache.numberOfItems, 1);
        }
    });

    it("can avoid using server for load with include if everything is in session cache", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Ayende";
            await session.store(user);

            const partner = new User();
            partner.partnerId = "users/1-A";
            await session.store(partner);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/2-A");
            await session.load<User>(user.partnerId);
            const old = session.advanced.numberOfRequests;
            const newUser = await session
                .include("partnerId")
                .load<User>("users/2-A");
            assert.strictEqual(session.advanced.numberOfRequests, old);
        }
    });

    it("can avoid using server for load with include if everything is in session cache lazy", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Ayende";
            await session.store(user);

            const partner = new User();
            partner.partnerId = "users/1-A";
            await session.store(partner);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.lazily.load<User>("users/2-A");
            session.advanced.lazily.load<User>("users/1-A");
            await session.advanced.eagerly.executeAllPendingLazyOperations();

            const old = session.advanced.numberOfRequests;
            const result1: Lazy<User> = session.advanced.lazily
                .include("partnerId")
                .load<User>("users/2-A");

            const user = await result1.getValue();
            assert.ok(user);
            assert.strictEqual(session.advanced.numberOfRequests, old);
        }
    });

    it("can avoid using server for load with include if everything is in session cache", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Ayende";
            await session.store(user);

            const partner = new User();
            partner.partnerId = "users/1-A";
            await session.store(partner);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.lazily.load<User>("users/2-A");
            session.advanced.lazily.load<User>("users/1-A");
            await session.advanced.eagerly.executeAllPendingLazyOperations();

            const old = session.advanced.numberOfRequests;
            const user: User = await session
                .include("partnerId")
                .load<User>("users/2-A");
            assert.ok(user);
            assert.strictEqual(session.advanced.numberOfRequests, old);
        }
    });

    it("can avoid using server for multiload with include if everything is in session cache", async () => {
        {
            const session = store.openSession();

            const storeUser = name => {
                const user = new User();
                user.name = name;
                return session.store(user);
            };

            await storeUser("Additional");
            await storeUser("Ayende");
            await storeUser("Michael");
            await storeUser("Fitzchak");
            await storeUser("Maxim");

            const withPartner = new User();
            withPartner.partnerId = "users/1-A";
            await session.store(withPartner);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const u2 = await session.load<User>("users/2-A");
            const u6 = await session.load<User>("users/6-A");

            const u4 = await session.load(
                ["users/1-A", "users/2-A", "users/3-A", "users/4-A", "users/5-A", "users/6-A"]
            );

            await session.load<User>(u6.partnerId);
            const old = session.advanced.numberOfRequests;
            const res = await session.include("partnerId")
                .load<User>(["users/2-A", "users/3-A", "users/6-A"]);
            assert.strictEqual(session.advanced.numberOfRequests, old);
        }
    });
});
