import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { Company, Order, User } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";

describe("TrackEntityTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("deletingEntityThatIsNotTrackedShouldThrow", async () => {
        const session = store.openSession();
        try {
            await session.delete(new User());
            assert.fail("Should have thrown.");
        } catch (err) {
            assert.strictEqual(err.name, "InvalidOperationException");
            assert.ok(err.message.includes(
                "is not associated with the session, cannot delete unknown entity instance"));
        }
    });

    it("loadingDeletedDocumentShouldReturnNull", async () => {
        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "John";
            user1.id = "users/1";

            const user2 = new User();
            user2.name = "Jonathan";
            user2.id = "users/2";

            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.delete("users/1");
            await session.delete("users/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            assert.ok(!await session.load("users/1"));
            assert.ok(!await session.load("users/2"));
        }
    });

    it("storingDocumentWithTheSameIdInTheSameSessionShouldThrow", async () => {
        const session = store.openSession();
        const user = new User();
        user.id = "users/1";
        user.name = "User1";

        await session.store(user);
        await session.saveChanges();

        const newUser = new User();
        newUser.name = "User2";
        newUser.id = "users/1";

        try {
            await session.store(newUser);
            assert.fail("Should have thrown.");
        } catch (err) {
            assert.strictEqual(err.name, "NonUniqueObjectException");
            assert.ok(err.message.includes("Attempted to associate a different object with id 'users/1'"));
        }
    });

    it("getTrackedEntities", async () => {
        let userId: string;
        let companyId: string;

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Grisha";

            await session.store(user);
            userId = user.id;

            const company = new Company();
            company.name = "Hibernating Rhinos";
            await session.store(company);

            companyId = company.id;

            const order = new Order();
            order.employee = company.id;
            await session.store(order);

            const tracked = session.advanced.getTrackedEntities();
            let value = tracked[userId];
            assertThat(value)
                .isNotNull();

            assertThat(value.id)
                .isEqualTo(userId);
            assertThat(value.entity instanceof User)
                .isTrue();

            value = tracked[company.id];
            assertThat(value)
                .isNotNull();
            assertThat(value.id)
                .isEqualTo(companyId);
            assertThat(value.entity instanceof Company)
                .isTrue();

            value = tracked[order.id];
            assertThat(value)
                .isNotNull();
            assertThat(value.id)
                .isEqualTo(order.id);

            await session.saveChanges();
            session.dispose();
        }

        {
            const session = store.openSession();
            await session.delete(userId);
            await session.delete(companyId);

            const tracked = session.advanced.getTrackedEntities();
            assertThat(tracked.size)
                .isEqualTo(2);

            assertThat(tracked.get(userId).isDeleted)
                .isTrue();
            assertThat(tracked.get(companyId).isDeleted)
                .isTrue();
            session.dispose();
        }

        {
            const session = store.openSession();
            await session.delete(userId);
            await session.delete(companyId);

            const usersLazy = session.advanced.lazily.loadStartingWith("u", User);
            const users = await usersLazy.getValue();

            assertThat(Object.values(users)[0])
                .isNull();

            const company = await session.load(companyId, Company);
            assertThat(company)
                .isNull();

            const tracked = session.advanced.getTrackedEntities();
            assertThat(tracked.size)
                .isEqualTo(2);
            assertThat(tracked.get(userId).isDeleted)
                .isTrue();
            assertThat(tracked.get(companyId).isDeleted)
                .isTrue();
        }

        {
            const session = store.openSession();
            const user = await session.load(userId, User);
            await session.delete(user.id);

            const tracked = session.advanced.getTrackedEntities();
            assertThat(tracked.size)
                .isEqualTo(1);
            assertThat(tracked.get(userId).id)
                .isEqualTo(userId);
            session.dispose();
        }

        {
            const session = store.openSession();
            const user = await session.load(userId, User);
            await session.delete(user.id.toUpperCase());

            const tracked = session.advanced.getTrackedEntities();
            assertThat(tracked.size)
                .isEqualTo(1);
            assertThat(Array.from(tracked.values())[0].id.toLowerCase())
                .isEqualTo(userId.toLowerCase());
            assertThat(Array.from(tracked.values())[0].isDeleted)
                .isTrue();
            session.dispose();
        }

        {
            const session = store.openSession();
            const user = await session.load(userId, User);
            await session.delete(user);
            const tracked = session.advanced.getTrackedEntities();
            assertThat(tracked.size)
                .isEqualTo(1);

            assertThat(Array.from(tracked.values())[0].id.toLowerCase())
                .isEqualTo(userId.toLowerCase());
            assertThat(Array.from(tracked.values())[0].isDeleted)
                .isTrue();
        }
    });
});
