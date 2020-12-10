import * as assert from "assert";
import { User } from "../../Assets/Entities";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    SessionOptions,
    IDocumentStore,
} from "../../../src";

describe("ClusterTransactionTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("canCreateClusterTransactionRequest", async () => {
        const user1 = Object.assign(new User(), { name: "Karmel" });
        const user3 = Object.assign(new User(), { name: "Indych" });
        const sessionOptions = {
            transactionMode: "ClusterWide"
        } as SessionOptions;
        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ayende", user1);
            await session.store(user3, "foo/bar");
            await session.saveChanges();
            const userFromClusterTx = (
                await session.advanced.clusterTransaction
                    .getCompareExchangeValue("usernames/ayende", User)).value;
            assert.ok(userFromClusterTx instanceof User, "get compare exchange returned non-user");
            assert.strictEqual(userFromClusterTx.name, user1.name);
            const userLoaded = await session.load<User>("foo/bar");
            assert.strictEqual(userLoaded.name, user3.name);
        }
    });

    it("testSessionSequance", async function () {
        const user1 = Object.assign(new User(), { name: "Karmel" });
        const user2 = Object.assign(new User(), { name: "Indych" });

        {
            const session = store.openSession({ transactionMode: "ClusterWide" } as SessionOptions);
            await session.store(user1, "users/1");
            session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ayende", user1);
            await session.saveChanges();

            const value = await session.advanced.clusterTransaction.getCompareExchangeValue("usernames/ayende", User);
            value.value = user2;

            await session.store(user2, "users/2");
            user1.age = 10;
            await session.store(user1, "users/1");
            await session.saveChanges();
        }
    });

    it("throwOnUnsupportedOperations", async function () {
        const session = store.openSession({ transactionMode: "ClusterWide" } as SessionOptions);
        const attachmentStream = Buffer.from([1, 2, 3]);
        session.advanced.attachments.store("asd", "test", attachmentStream);
        try {
            await session.saveChanges();
            assert.fail("should have thrown");
        } catch (err) {
            assert.strictEqual(err.name, "InvalidOperationException");
            assert.ok(/The command 'AttachmentPUT' is not supported in a cluster session./i.test(err.message));
        }
    });

    it("throwOnInvalidTransactionMode", async function () {
        const user1 = new User();
        user1.name = "Karmel";

        const CLUSTER_OP_WARNING = "This function is part of cluster transaction session," 
            + " in order to use it you have to open the Session with ClusterWide option"; 
        {
            const session = store.openSession();
            try {
                session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ayende", user1);
                assert.fail("should have thrown.");
            } catch (err) {
                assert.strictEqual(err.name, "InvalidOperationException");
                assert.ok(err.message.includes(CLUSTER_OP_WARNING));
            }

            try {
                session.advanced.clusterTransaction.deleteCompareExchangeValue("usernames/ayende", 0);
                assert.fail("should have thrown.");
            } catch (err) {
                assert.strictEqual(err.name, "InvalidOperationException");
                assert.ok(err.message.includes(CLUSTER_OP_WARNING));
            }
        }

        {
            const session = store.openSession({ transactionMode: "ClusterWide" } as SessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ayende", user1);
            session.advanced.transactionMode = "SingleNode";

            try {
                await session.saveChanges();
                assert.fail("should have thrown");
            } catch (err) {
                assert.strictEqual(err.name, "InvalidOperationException");
                assert.ok(err.message.includes(
                    "Performing cluster transaction operation require the TransactionMode to be set to ClusterWide"), 
                    err.message);
            }

            session.advanced.transactionMode = "ClusterWide";
            await session.saveChanges();

            const u = await session.advanced.clusterTransaction.getCompareExchangeValue("usernames/ayende", User);
            assert.strictEqual(u.value.name, user1.name);
        }
    });

});
