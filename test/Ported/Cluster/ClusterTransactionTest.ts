import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { User } from "../../Assets/Entities";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import DocumentStore, {
    RavenErrorType,
    GetNextOperationIdCommand,
    SessionOptions,
    IDocumentStore,
    CompareExchangeValue,
} from "../../../src";

describe.only("ClusterTransactionTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.enableFiddler();
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
                    .getCompareExchangeValue<User>("usernames/ayende", User)).value;
            assert.ok(userFromClusterTx instanceof User, "get compare exchange returned non-user");
            assert.strictEqual(userFromClusterTx.name, user1.name);
            const userLoaded = await session.load<User>("foo/bar");
            assert.strictEqual(userLoaded.name, user3.name);
        }
    });

    it.only("testSessionSequance", async function () {
        const user1 = Object.assign(new User(), { name: "Karmel" });
        const user2 = Object.assign(new User(), { name: "Indych" });

        {
            const session = store.openSession({ transactionMode: "ClusterWide" } as SessionOptions);
            await session.store(user1, "users/1");
            session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ayende", user1);
            await session.saveChanges();

            const lastTransactionIndex = (store as DocumentStore).getLastTransactionIndex(store.database);
            assert.ok(lastTransactionIndex !== null);
            session.advanced.clusterTransaction.updateCompareExchangeValue(
                new CompareExchangeValue<User>("usernames/ayende", lastTransactionIndex, user2));

            await session.store(user2, "users/2");
            user1.age = 10;
            await session.store(user1, "users/1");
            await session.saveChanges();
        }
    });
});

//      @Test
//     public void throwOnUnsupportedOperations() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             SessionOptions sessionOptions = new SessionOptions();
//             sessionOptions.setTransactionMode(TransactionMode.CLUSTER_WIDE);
//             try (IDocumentSession session = store.openSession()) {
//                  ByteArrayInputStream attachmentStream = new ByteArrayInputStream(new byte[]{1, 2, 3});
//                 session.advanced().attachments().store("asd", "test", attachmentStream);
//                 assertThatThrownBy(() -> {
//                     session.saveChanges();
//                 }).isExactlyInstanceOf(RavenException.class);
//             }
//         }
//     }
//      @Test
//     public void throwOnInvalidTransactionMode() throws Exception {
//         User user1 = new User();
//         user1.setName("Karmel");
//          try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 assertThatThrownBy(() -> {
//                     session.advanced().clusterTransaction().createCompareExchangeValue("usernames/ayende", user1);
//                 }).isExactlyInstanceOf(IllegalStateException.class);
//                  assertThatThrownBy(() -> {
//                     session.advanced().clusterTransaction().updateCompareExchangeValue(new CompareExchangeValue<>("test", 0, "test"));
//                 }).isExactlyInstanceOf(IllegalStateException.class);
//                  assertThatThrownBy(() -> {
//                     session.advanced().clusterTransaction().deleteCompareExchangeValue("usernames/ayende", 0);
//                 }).isExactlyInstanceOf(IllegalStateException.class);
//             }
//              SessionOptions options = new SessionOptions();
//             options.setTransactionMode(TransactionMode.CLUSTER_WIDE);
//              try (IDocumentSession session = store.openSession(options)) {
//                 session.advanced().clusterTransaction().createCompareExchangeValue("usernames/ayende", user1);
//                 session.advanced().setTransactionMode(TransactionMode.SINGLE_NODE);
//                 assertThatThrownBy(() -> {
//                     session.saveChanges();
//                 }).isExactlyInstanceOf(IllegalStateException.class);
//                  session.advanced().setTransactionMode(TransactionMode.CLUSTER_WIDE);
//                 session.saveChanges();
//                  CompareExchangeValue<User> u = session.advanced().clusterTransaction().getCompareExchangeValue(User.class, "usernames/ayende");
//                 assertThat(u.getValue().getName())
//                         .isEqualTo(user1.getName());
//             }
//         }
//     }
// }