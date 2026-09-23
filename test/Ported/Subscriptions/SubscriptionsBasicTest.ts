import { Address, Company, Order, User } from "../../Assets/Entities.js";
import assert from "node:assert"
import fs from "node:fs";
import path from "node:path";
import { testContext, disposeTestDocumentStore, TemporaryDirContext } from "../../Utils/TestUtil.js";

import {
    IDocumentStore,
    SubscriptionWorkerOptions,
    SubscriptionBatch,
    SubscriptionCreationOptions,
    SubscriptionWorker,
    ToggleOngoingTaskStateOperation,
    SubscriptionUpdateOptions,
    GetOngoingTaskInfoOperation,
    OngoingTaskSubscription,
    ObjectUtil,
    DocumentStore,
    CONSTANTS,
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    DeleteDatabasesOperation,
    OperationCompletionAwaiter,
    PeriodicBackupConfiguration,
    RestoreBackupConfiguration,
    RestoreBackupOperation,
    StartBackupOperation,
    UpdatePeriodicBackupOperation
} from "../../../src/index.js";
import { AsyncQueue } from "../../Utils/AsyncQueue.js";
import { acquireSemaphore } from "../../../src/Utility/SemaphoreUtil.js";
import { getError, throwError } from "../../../src/Exceptions/index.js";
import { TypeUtil } from "../../../src/Utility/TypeUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";
import { TimeValue } from "../../../src/Primitives/TimeValue.js";
import { Semaphore } from "../../../src/Utility/Semaphore.js";
import { delay, wrapWithTimeout } from "../../../src/Utility/PromiseUtil.js";
import { addDays, milliseconds } from "date-fns";

class PersonWithAddress {
    public id: string;
    public name: string;
    public address: Address;
}

describe("SubscriptionsBasicTest", function () {
    const _reasonableWaitTime = 15 * 1000;
    this.timeout(5 * _reasonableWaitTime);

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canDisableSubscriptionViaApi", async () => {
        const subscription = await store.subscriptions.create(User);

        await store.subscriptions.disable(subscription);

        let subscriptions = await store.subscriptions.getSubscriptions(0, 10);
        assertThat(subscriptions[0].disabled)
            .isTrue();

        await store.subscriptions.enable(subscription);

        subscriptions = await store.subscriptions.getSubscriptions(0, 10);
        assertThat(subscriptions[0].disabled)
            .isFalse();
    });

    it("can delete subscription", async function() {
        const id1 = await store.subscriptions.create(User);
        const id2 = await store.subscriptions.create(User);

        let subscriptions = await store.subscriptions.getSubscriptions(0, 5);

        assert.strictEqual(subscriptions.length, 2);

        // test getSubscriptionState as well
        const subscriptionState = await store.subscriptions.getSubscriptionState(id1);
        assert.ok(!subscriptionState.changeVectorForNextBatchStartingPoint);

        await store.subscriptions.delete(id1);
        await store.subscriptions.delete(id2);

        subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assert.strictEqual(subscriptions.length, 0);
    });

    it("should throw when opening no existing subscription", async function() {
        const subscription = store.subscriptions.getSubscriptionWorker<any>({
            subscriptionName: "1",
            maxErroneousPeriod: 3000
        });

        try {

            subscription.on("batch", (batch, cb) => cb()); // this triggers subscription to run
            const error = await new Promise<Error>((resolve) => {
                subscription.on("error", err => {
                    resolve(err);
                });
            });

            assert.strictEqual(
                error.name, "SubscriptionDoesNotExistException", "Expected another error but got:" + error.stack);

        } finally {
            subscription.dispose();
        }
    });

    it("should throw on attempt to open already opened subscription", async function() {
        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<any>({
            subscriptionName: id,
            maxErroneousPeriod: 3000
        });

        try {
            const session = store.openSession();
            await session.store(new User());
            await session.saveChanges();

            const changesList = new AsyncQueue<SubscriptionBatch<any>>();

            subscription.on("batch", x => changesList.push(x));

            const value = await changesList.poll(_reasonableWaitTime);
            assert.ok(value);

            {
                const secondSubscription = store.subscriptions.getSubscriptionWorker({
                    subscriptionName: id,
                    strategy: "OpenIfFree"
                });
                try {

                    secondSubscription.on("batch", () => {
                        assert.fail("We shouldn't get any data as subscription is occupied");
                    });

                    await new Promise<void>(resolve => {
                        secondSubscription.on("error", ex => {
                            assert.strictEqual(ex.name, "SubscriptionInUseException");
                            resolve();
                        });
                    });
                } finally {
                    secondSubscription.dispose();
                }
            }
        } finally {
            subscription.dispose();
        }
    });

    function subscriptionFailed(subscription) {
        let errReject;
        const errPromise = new Promise((_, reject) => errReject = reject);
        subscription.on("error", err => errReject(err));
        subscription.on("connectionRetry", err => {
            if (!err.canReconnect) {
                return errReject(err);
            }
        });
        return errPromise;
    }

    it("should stream all documents after subscription creation", async function () {
        store.initialize();
        {
            const session = store.openSession();
            const user1 = new User();
            user1.age = 31;
            await session.store(user1, "users/1");

            const user2 = new User();
            user2.age = 27;
            await session.store(user2, "users/12");

            const user3 = new User();
            user3.age = 25;
            await session.store(user3, "users/3");

            await session.saveChanges();
        }

        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            documentType: User,
            maxErroneousPeriod: 0,
            timeToWaitBeforeConnectionRetry: 0
        });

        const keys = new AsyncQueue<string>();
        const ages = new AsyncQueue<number>();
        try {

            subscription.on("batch", (batch, callback) => {
                try {
                    for (const x of batch.items) keys.push(x.id);
                    for (const x of batch.items) ages.push(x.rawResult.age);
                    callback();
                } catch (err) {
                    callback(err);
                }
            });


            await Promise.race([ subscriptionFailed(subscription), assertResults() ]);
        } finally {
            subscription.dispose();
        }

        async function assertResults() {
            assert.strictEqual(await keys.poll(_reasonableWaitTime), "users/1");
            assert.strictEqual(await keys.poll(_reasonableWaitTime), "users/12");
            assert.strictEqual(await keys.poll(_reasonableWaitTime), "users/3");

            assert.strictEqual(await ages.poll(_reasonableWaitTime), 31);
            assert.strictEqual(await ages.poll(_reasonableWaitTime), 27);
            assert.strictEqual(await ages.poll(_reasonableWaitTime), 25);
        }
    });

    it("can handle nested object types correctly", async function() {
        const id = await store.subscriptions.create(Order);

        const subscription = store.subscriptions.getSubscriptionWorker<Order>({
            subscriptionName: id,
            documentType: Order,
            maxErroneousPeriod: 0,
            timeToWaitBeforeConnectionRetry: 0
        });

        const orders = new AsyncQueue<Order>();

        {
            const session = store.openSession();
            const order = new Order();
            order.company = "company/1";
            order.orderedAt = new Date();
            await session.store(order, "orders/1");
            await session.saveChanges();
        }

        subscription.on("batch", (batch, callback) => {
            for (const x of batch.items) {
                orders.push(x.result);
            }
            callback();
        });

        try {
            await Promise.race([ subscriptionFailed(subscription), assertResults() ]);
        } finally {
            subscription.dispose();
        }

        async function assertResults() {
            const firstOrder = await orders.poll(_reasonableWaitTime);
            assertThat(firstOrder instanceof Order)
                .isTrue();
            assertThat(firstOrder.orderedAt instanceof Date)
                .isTrue();
        }
    })

    it("should send all new and modified docs", async function() {
        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            documentType: User,
            maxErroneousPeriod: 0,
            timeToWaitBeforeConnectionRetry: 0
        });

        const names = new AsyncQueue<string>();

        {
            const session = store.openSession();
            const user = new User();
            user.name = "James";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        subscription.on("batch", (batch, callback) => {
            for (const x of batch.items) {
                names.push(x.result.name);
            }
            callback();
        });

        try {
            await Promise.race([ subscriptionFailed(subscription), assertResults() ]);
        } finally {
            subscription.dispose();
        }

        async function assertResults() {
            let name = await names.poll(_reasonableWaitTime);
            assert.strictEqual(name, "James");

            {
                const session = store.openSession();
                const user = new User();
                user.name = "Adam";
                await session.store(user, "users/12");
                await session.saveChanges();
            }

            name = await names.poll(_reasonableWaitTime);
            assert.strictEqual(name, "Adam");

            {
                const session = store.openSession();
                const user = new User();
                user.name = "David";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            name = await names.poll(_reasonableWaitTime);
            assert.strictEqual(name, "David");
        }
    });

    it("should respect max doc count in batch", async function () {
        {
            const session = store.openSession();
            for (let i = 0; i < 100; i++) {
                await session.store(new Company());
            }
            await session.saveChanges();
        }

        const id = await store.subscriptions.create(Company);
        const options = {
            subscriptionName: id,
            maxDocsPerBatch: 25,
            maxErroneousPeriod: 3000
        } as SubscriptionWorkerOptions<Company>;

        const subscriptionWorker = store.subscriptions.getSubscriptionWorker(options);

        try {
            let totalItems = 0;

            await new Promise<void>((resolve, reject) => {
                subscriptionWorker.on("batch", (batch, callback) => {
                    totalItems += batch.getNumberOfItemsInBatch();

                    assert.ok(batch.getNumberOfItemsInBatch() <= 25);

                    if (totalItems === 100) {
                        resolve();
                    }

                    callback();
                });
                subscriptionWorker.on("error", reject);
                subscriptionWorker.on("connectionRetry", reject);
            });
        } finally {
            subscriptionWorker.dispose();
        }
    });

    it("should respect collection criteria", async function() {
        {
            const session = store.openSession();
            for (let i = 0; i < 100; i++) {
                await session.store(new Company());
                await session.store(new User());
            }

            await session.saveChanges();
        }

        const id = await store.subscriptions.create(User);

        const options = {
            subscriptionName: id,
            maxDocsPerBatch: 31,
            maxErroneousPeriod: 3000
        } as SubscriptionWorkerOptions<User>;

        const subscription = store.subscriptions.getSubscriptionWorker(options);

        try {
            let integer = 0;

            await new Promise<void>((resolve, reject) => {
                subscription.on("error", reject);
                subscription.on("connectionRetry", reject);
                subscription.on("batch", (batch, callback) => {
                    integer += batch.getNumberOfItemsInBatch();

                    if (integer === 100) {
                        resolve();
                    }
                    callback();
                });
            });
        } finally {
            subscription.dispose();
        }
    });

    it("can disable subscription", async () => {
        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                await session.store(new Company());
                await session.store(new User());
            }
            await session.saveChanges();
        }

        const id = await store.subscriptions.create(User);

        let subscriptionTask = await store.maintenance.send(new GetOngoingTaskInfoOperation(id, "Subscription")) as OngoingTaskSubscription;

        assertThat(subscriptionTask)
            .isNotNull();
        assertThat(subscriptionTask.taskType)
            .isEqualTo("Subscription");
        assertThat(subscriptionTask.responsibleNode)
            .isNotNull();

        await store.maintenance.send(new ToggleOngoingTaskStateOperation(subscriptionTask.taskId, "Subscription", true));

        subscriptionTask = await store.maintenance.send(new GetOngoingTaskInfoOperation(id, "Subscription")) as OngoingTaskSubscription;
        assertThat(subscriptionTask)
            .isNotNull();
        assertThat(subscriptionTask.disabled)
            .isTrue();
    });

    it("will acknowledge empty batches", async function() {
        const subscriptionDocuments = await store.subscriptions.getSubscriptions(0, 10);

        assert.strictEqual(subscriptionDocuments.length, 0);

        const allId = await store.subscriptions.create(User);

        const allSubscription = store.subscriptions.getSubscriptionWorker(allId);
        try {
            const allSemaphore = new Semaphore();
            allSemaphore.take(TypeUtil.NOOP);

            let allCounter = 0;

            const filteredOptions = {
                query: "from Users where age < 0"
            } as SubscriptionCreationOptions;

            const filteredUsersId = await store.subscriptions.create(filteredOptions);

            const filteredUsersSubscription = store.subscriptions.getSubscriptionWorker({
                subscriptionName: filteredUsersId
            });

            try {
                let usersDocs = false;

                {
                    const session = store.openSession();
                    for (let i = 0; i < 500; i++) {
                        await session.store(new User(), "another/");
                    }
                    await session.saveChanges();
                }

                allSubscription.on("batch", (batch, callback) => {
                    allCounter += batch.getNumberOfItemsInBatch();

                    if (allCounter >= 500) {
                        allSemaphore.leave();
                    }

                    callback();
                });

                filteredUsersSubscription.on("batch", (batch, callback) => {
                    usersDocs = true;
                    callback();
                });

                await Promise.race([
                    acquireSemaphore(allSemaphore).promise,
                    subscriptionFailed(allSubscription),
                    subscriptionFailed(filteredUsersSubscription)
                ]);

                assert.ok(!usersDocs);
            } finally {
                filteredUsersSubscription.dispose();
            }
        } finally {
            allSubscription.dispose();
        }
    });

    it("can release subscription", async function() {
        let subscriptionWorker: SubscriptionWorker<any>;
        let throwingSubscriptionWorker: SubscriptionWorker<any>;
        let notThrowingSubscriptionWorker: SubscriptionWorker<any>;

        try {
            const id = await store.subscriptions.create(User);

            const options1 = {
                subscriptionName: id,
                strategy: "OpenIfFree",
                maxErroneousPeriod: 3000
            } as SubscriptionWorkerOptions<User>;

            subscriptionWorker = store.subscriptions.getSubscriptionWorker(options1);

            const batches = new AsyncQueue<SubscriptionBatch<User>>();

            subscriptionWorker.on("batch", (batch, callback) => {
                batches.push(batch);
                callback();
            });

            await putUserDoc(store);

            await batches.poll(_reasonableWaitTime);

            const options2 = {
                subscriptionName: id,
                strategy: "OpenIfFree",
                maxErroneousPeriod: 3000
            } as SubscriptionWorkerOptions<User>;

            throwingSubscriptionWorker = store.subscriptions.getSubscriptionWorker(options2);

            throwingSubscriptionWorker.on("batch", (batch, callback) => {
                callback();
            });

            await new Promise<void>(resolve => {
                throwingSubscriptionWorker.on("error", error => {
                    assert.strictEqual(error.name, "SubscriptionInUseException");
                    resolve();
                });
            });

            await store.subscriptions.dropConnection(id);

            const options3 = {
                subscriptionName: id,
                strategy: "WaitForFree",
                maxErroneousPeriod: 3000,
                timeToWaitBeforeConnectionRetry: 1000
            } as SubscriptionWorkerOptions<User>;

            notThrowingSubscriptionWorker = store.subscriptions.getSubscriptionWorker(options3);

            const batches2 = new AsyncQueue<SubscriptionBatch<User>>();

            notThrowingSubscriptionWorker.on("batch", (batch, callback) => {
                batches2.push(batch);
                callback();
            });

            await putUserDoc(store);

            await batches2.poll(_reasonableWaitTime)
        } finally {
            if (subscriptionWorker) {
                subscriptionWorker.dispose();
            }
            if (throwingSubscriptionWorker) {
                throwingSubscriptionWorker.dispose();
            }
            if (notThrowingSubscriptionWorker) {
                notThrowingSubscriptionWorker.dispose();
            }
        }
    });

    const putUserDoc = async (store: IDocumentStore) => {
        const session = store.openSession();
        await session.store(new User());
        await session.saveChanges();
    };

    it("should pull documents after bulk insert", async function() {
        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            documentType: User,
            maxErroneousPeriod: 3000
        });

        try {
            const docs = new AsyncQueue<User>();

            const bulk = store.bulkInsert();
            {
                await bulk.store(new User());
                await bulk.store(new User());
                await bulk.store(new User());
                await bulk.finish();
            }

            subscription.on("batch", (batch, callback) => {
                for (const i of batch.items) docs.push(i.result);
                callback();
            });

            assert.ok(await Promise.race([
                docs.poll(_reasonableWaitTime),
                subscriptionFailed(subscription)
            ]));
            assert.ok(await Promise.race([
                docs.poll(_reasonableWaitTime),
                subscriptionFailed(subscription)
            ]));
        } finally {
            subscription.dispose();
        }
    });

    //RavenDB-15919
    it.skip("should stop pulling docs and close subscription on subscriber error by default", async function() {
        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker({
            subscriptionName: id,
            maxErroneousPeriod: 3000
        });

        await putUserDoc(store);

        try {
            subscription.on("batch", (batch, callback) => {
                throwError("InvalidOperationException", "Fake exception");
                callback();
            });

            await new Promise<void>(resolve => {
                subscription.on("error", error => {
                    assert.strictEqual(error.name, "SubscriberErrorException");
                    resolve();
                });
            });

            const subscriptionConfig = (await store.subscriptions.getSubscriptions(0, 1))[0];
            assert.ok(!subscriptionConfig.changeVectorForNextBatchStartingPoint);
        } finally {
            subscription.dispose();
        }
    });

    it("can set to ignore subscriber errors", async function() {
        const id = await store.subscriptions.create(User);

        const options1 = {
            ignoreSubscriberErrors: true,
            subscriptionName: id,
            documentType: User,
            maxErroneousPeriod: 3000
        } as SubscriptionWorkerOptions<User>;

        const subscription = store.subscriptions.getSubscriptionWorker(options1);
        try {
            const docs = new AsyncQueue<User>();

            await putUserDoc(store);
            await putUserDoc(store);

            let hasError = false;

            subscription.on("error", () => {
                hasError = true;
            });

            subscription.on("batch", (batch, callback) => {
                for (const i of batch.items) docs.push(i.result);
                callback(getError("InvalidOperationException", "Fake exception"));
            });

            assert.ok(await docs.poll(_reasonableWaitTime));
            assert.ok(await docs.poll(_reasonableWaitTime));
            assert.ok(!hasError);
        } finally {
            subscription.dispose();
        }
    });

    it("RavenDB-3452 should should stop pulling docs if released", async function() {
        const id = await store.subscriptions.create(User);

        const options1 = {
            subscriptionName: id,
            timeToWaitBeforeConnectionRetry: 1000,
            documentType: User,
            maxErroneousPeriod: 3000
        } as SubscriptionWorkerOptions<User>;

        const subscription = store.subscriptions.getSubscriptionWorker(options1);

        try {
            {
                const session = store.openSession();
                await session.store(new User(), "users/1");
                await session.store(new User(), "users/12");
                await session.saveChanges();
            }

            const docs = new AsyncQueue<User>();

            subscription.on("batch", (batch, callback) => {
                for (const i of batch.items) docs.push(i.result);
                callback();
            });

            assert.ok(await docs.poll(_reasonableWaitTime));
            assert.ok(await docs.poll(_reasonableWaitTime));

            // eslint-disable-next-line no-async-promise-executor
            await new Promise<void>(async resolve => {
                subscription.on("error", error => {
                    assert.strictEqual(error.name, "SubscriptionClosedException");
                    resolve();
                });

                await store.subscriptions.dropConnection(id);
            });

            {
                const session = store.openSession();
                await session.store(new User(), "users/3");
                await session.store(new User(), "users/4");
                await session.saveChanges();
            }

            try {
                await docs.poll(50);
                assert.fail("Should have thrown");
                await docs.poll(50);
            } catch (err) {
                assert.strictEqual(err.name, "TimeoutException");
            }
        } finally {
            subscription.dispose();
        }
    });

    it("RavenDB-3453 should deserialize the whole documents after typed subscription", async function() {
        const id = await store.subscriptions.create(User);
        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            documentType: User,
            subscriptionName: id,
            maxErroneousPeriod: 3000
        });

        try {
            const users = new AsyncQueue<User>();

            {
                const session = store.openSession();
                const user1 = new User();
                user1.age = 31;
                await session.store(user1, "users/1");

                const user2 = new User();
                user2.age = 27;
                await session.store(user2, "users/12");

                const user3 = new User();
                user3.age = 25;
                await session.store(user3, "users/3");

                await session.saveChanges();
            }

            subscription.on("batch", (batch, callback) => {
                for (const i of batch.items) users.push(i.result);
                callback();
            });

            let user: User;
            user = await users.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/1");
            assert.strictEqual(user.age, 31);

            user = await users.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/12");
            assert.strictEqual(user.age, 27);

            user = await users.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/3");
            assert.strictEqual(user.age, 25);
        } finally {
            subscription.dispose();
        }
    });

    it("disposing one subscription should not affect on notifications of others", async function() {
        let subscription1: SubscriptionWorker<User>;
        let subscription2: SubscriptionWorker<User>;

        try {
            const id1 = await store.subscriptions.create(User);
            const id2 = await store.subscriptions.create(User);

            {
                const session = store.openSession();
                await session.store(new User(), "users/1");
                await session.store(new User(), "users/2");
                await session.saveChanges();
            }

            subscription1 = store.subscriptions.getSubscriptionWorker<User>({
                subscriptionName: id1,
                documentType: User
            });
            const items1 = new AsyncQueue<User>();
            subscription1.on("batch", (batch, callback) => {
                for (const i of batch.items) items1.push(i.result);
                callback();
            });

            subscription2 = store.subscriptions.getSubscriptionWorker<User>({
                subscriptionName: id2,
                documentType: User
            });
            const items2 = new AsyncQueue<User>();
            subscription2.on("batch", (batch, callback) => {
                for (const i of batch.items) items2.push(i.result);
                callback();
            });

            let user = await items1.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/1");

            user = await items1.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/2");

            user = await items2.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/1");

            user = await items2.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/2");

            subscription1.dispose();

            {
                const session = store.openSession();
                await session.store(new User(), "users/3");
                await session.store(new User(), "users/4");
                await session.saveChanges();
            }

            user = await items2.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/3");

            user = await items2.poll(_reasonableWaitTime);
            assert.ok(user);
            assert.strictEqual(user.id, "users/4");
        } finally {
            if (subscription1) {
                subscription1.dispose();
            }
            if (subscription2) {
                subscription2.dispose();
            }
        }
    });

    it("test subscription with PascalCasing", async function() {
        const store2 = new DocumentStore(store.urls, store.database);
        try {
            store2.conventions.findCollectionNameForObjectLiteral = () => "test";
            store2.conventions.serverToLocalFieldNameConverter = ObjectUtil.camel;
            store2.conventions.localToServerFieldNameConverter = ObjectUtil.pascal;
            store2.initialize();

            {
                const session = store2.openSession();
                const user1 = { age: 31, name: "John" };
                await session.store(user1);
                const user2 = { age: 18, name: "Marika" };
                await session.store(user2);
                const user3 = { age: 26, name: "Meluzyna" };
                await session.store(user3);

                await session.saveChanges();
            }

            const id = await store2.subscriptions.create({
                query: "from test"
            });

            const subscription = store2.subscriptions.getSubscriptionWorker({
                subscriptionName: id,
            });

            try {
                let batch;
                await new Promise<void>((resolve, reject) => {
                    subscription.on("error", reject);
                    subscription.on("connectionRetry", reject);
                    subscription.on("batch", (_batch, callback) => {
                        batch = _batch;
                        callback();
                        resolve();
                    });
                });

                assert.ok(batch);
                assert.strictEqual(batch.items.length, 3);
                assert.strictEqual(batch.items[0].rawResult.age, 31);
                assert.strictEqual(batch.items[0].rawResult.name, "John");
            } finally {
                subscription.dispose();
            }
        } finally {
            store2.dispose();
        }
    });

    it("canUpdateSubscriptionByName", async () => {
        const subscriptionCreationOptions: SubscriptionCreationOptions = {
            query: "from Users",
            name: "Created"
        };

        const subsId = await store.subscriptions.create(subscriptionCreationOptions);

        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);

        const state = subscriptions[0];

        assertThat(subscriptions)
            .hasSize(1);

        assertThat(state.subscriptionName)
            .isEqualTo("Created");
        assertThat(state.query)
            .isEqualTo("from Users");

        const newQuery = "from Users where age > 18";

        const subscriptionUpdateOptions: SubscriptionUpdateOptions = {
            name: subsId,
            query: newQuery
        };

        await store.subscriptions.update(subscriptionUpdateOptions);

        const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const newState = newSubscriptions[0];
        assertThat(newSubscriptions)
            .hasSize(1);
        assertThat(newState.subscriptionName)
            .isEqualTo(state.subscriptionName);
        assertThat(newState.query)
            .isEqualTo(newQuery);
        assertThat(newState.subscriptionId)
            .isEqualTo(state.subscriptionId);

    });

    it("canUpdateSubscriptionById", async () => {
        const subscriptionCreationOptions: SubscriptionCreationOptions = {
            query: "from Users",
            name: "Created"
        };

        await store.subscriptions.create(subscriptionCreationOptions);

        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);

        const state = subscriptions[0];

        assertThat(subscriptions)
            .hasSize(1);
        assertThat(state.subscriptionName)
            .isEqualTo("Created");
        assertThat(state.query)
            .isEqualTo("from Users");

        const newQuery = "from Users where age > 18";

        const subscriptionUpdateOptions: SubscriptionUpdateOptions = {
            id: state.subscriptionId,
            query: newQuery
        };

        await store.subscriptions.update(subscriptionUpdateOptions);

        const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const newState = newSubscriptions[0];
        assertThat(newSubscriptions)
            .hasSize(1);
        assertThat(newState.subscriptionName)
            .isEqualTo(state.subscriptionName);
        assertThat(newState.query)
            .isEqualTo(newQuery);
        assertThat(newState.subscriptionId)
            .isEqualTo(state.subscriptionId);
    });

    it("updateNonExistentSubscriptionShouldThrow", async () => {
        const name = "Update";
        const id = 322;

        await assertThrows(() => {
            const subscriptionUpdateOptions: SubscriptionUpdateOptions = {
                name
            };

            return store.subscriptions.update(subscriptionUpdateOptions);
        }, err => {
            assertThat(err.name)
                .isEqualTo("SubscriptionDoesNotExistException");
        });

        await assertThrows(() => {
            const subscriptionUpdateOptions: SubscriptionUpdateOptions = {
                name,
                id
            };

            return store.subscriptions.update(subscriptionUpdateOptions);
        }, err => {
            assertThat(err.name)
                .isEqualTo("SubscriptionDoesNotExistException");
        });

        const subscriptionCreationOptions: SubscriptionCreationOptions = {
            query: "from Users",
            name: "Created"
        };

        const subsId = await store.subscriptions.create(subscriptionCreationOptions);

        await assertThrows(() => {
            const subscriptionUpdateOptions: SubscriptionUpdateOptions = {
                name: subsId,
                id
            };

            return store.subscriptions.update(subscriptionUpdateOptions);
        }, err => {
            assertThat(err.name)
                .isEqualTo("SubscriptionDoesNotExistException");
        });
    });

    it("updateSubscriptionShouldReturnNotModified", async () => {
        const updateOptions: SubscriptionUpdateOptions = {
            query: "from Users",
            name: "Created"
        };

        await store.subscriptions.create(updateOptions);

        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);

        const state = subscriptions[0];

        assertThat(subscriptions)
            .hasSize(1);
        assertThat(state.subscriptionName)
            .isEqualTo("Created");
        assertThat(state.query)
            .isEqualTo("from Users");

        await store.subscriptions.update(updateOptions);

        const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const newState = newSubscriptions[0];

        assertThat(newSubscriptions)
            .hasSize(1);

        assertThat(newState.subscriptionName)
            .isEqualTo(state.subscriptionName);
        assertThat(newState.query)
            .isEqualTo(state.query);
        assertThat(newState.subscriptionId)
            .isEqualTo(state.subscriptionId);
    });

    it("subscriptionLongName", async () => {
        await assertThrows(() => store.subscriptions.create({
            documentType: User,
            name: "a".repeat(2266)
        }), err => {
            assertThat(err.name)
                .isEqualTo("SubscriptionNameException");
        });
    });

    it("shouldRespectStartsWithCriteria", async () => {
        {
            const session = store.openSession();
            for (let i = 0; i < 100; i++) {
                await session.store(new User(), i % 2 === 0 ? "users/" : "users/favorite/");
            }

            await session.saveChanges();
        }

        const id = await store.subscriptions.create({
            query: "from Users as u where startsWith(id(u), 'users/favorite/')"
        });

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            maxDocsPerBatch: 15,
            timeToWaitBeforeConnectionRetry: 5000
        });

        try {
            const ids: string[] = [];

            await new Promise<void>((resolve, reject) => {
                subscription.on("error", reject);
                subscription.on("batch", (batch, callback) => {
                    ids.push(...batch.items.map(x => x.id));

                    if (ids.length >= 50) {
                        resolve();
                    }

                    callback();
                });
            });

            assertThat(ids)
                .hasSize(50);
            assertThat(ids)
                .allMatch(x => x.startsWith("users/favorite/"));
        } finally {
            subscription.dispose();
        }
    });

    it("canUpdateSubscriptionPinToMentorNodeByName", async () => {
        const subsId = await store.subscriptions.create({
            query: "from Users",
            name: "Created",
            mentorNode: "A"
        });

        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const state = subscriptions[0];
        assertThat(subscriptions)
            .hasSize(1);
        assertThat(state.subscriptionName)
            .isEqualTo("Created");
        assertThat(state.query)
            .isEqualTo("from Users");
        assertThat(state.mentorNode)
            .isEqualTo("A");

        await store.subscriptions.update({
            name: subsId,
            pinToMentorNode: true
        });

        const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const newState = newSubscriptions[0];
        assertThat(newSubscriptions)
            .hasSize(1);
        assertThat(newState.subscriptionName)
            .isEqualTo(state.subscriptionName);
        assertThat(newState.subscriptionId)
            .isEqualTo(state.subscriptionId);
        assertThat(newState.pinToMentorNode)
            .isTrue();
    });

    it("canUpdateDisabledByName", async () => {
        const subsId = await store.subscriptions.create({
            query: "from Users",
            name: "Created"
        });

        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const state = subscriptions[0];
        assertThat(subscriptions)
            .hasSize(1);
        assertThat(state.subscriptionName)
            .isEqualTo("Created");
        assertThat(state.query)
            .isEqualTo("from Users");
        assertThat(state.disabled)
            .isFalse();

        await store.subscriptions.update({
            name: subsId,
            disabled: true
        });

        const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        const newState = newSubscriptions[0];
        assertThat(newSubscriptions)
            .hasSize(1);
        assertThat(newState.subscriptionName)
            .isEqualTo(state.subscriptionName);
        assertThat(newState.subscriptionId)
            .isEqualTo(state.subscriptionId);
        assertThat(newState.disabled)
            .isTrue();
    });

    it("canCreateByUpdateSubscription", async () => {
        let query = "from Users";
        let name = "Created";
        let id = 1000;

        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(subscriptions)
            .hasSize(0);

        await store.subscriptions.update({
            query,
            name,
            createNew: true
        });

        let newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(newSubscriptions)
            .hasSize(1);
        let newState = newSubscriptions[0];
        assertThat(newState.subscriptionName)
            .isEqualTo(name);
        assertThat(newState.query)
            .isEqualTo(query);

        await store.subscriptions.update({
            query,
            id,
            createNew: true
        });

        newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(newSubscriptions)
            .hasSize(2);
        newState = newSubscriptions.find(x => x.subscriptionName === id.toString());
        assertThat(newState)
            .isNotNull();
        assertThat(newState.query)
            .isEqualTo(query);
        assertThat(newState.subscriptionId)
            .isEqualTo(id);

        id++;
        name += "New";
        await store.subscriptions.update({
            query,
            name,
            id,
            createNew: true
        });

        newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(newSubscriptions)
            .hasSize(3);
        newState = newSubscriptions.find(x => x.subscriptionName === name);
        assertThat(newState)
            .isNotNull();
        assertThat(newState.query)
            .isEqualTo(query);
        assertThat(newState.subscriptionId)
            .isEqualTo(id);

        const oldId = id;
        id++;
        query += " where age > 322";

        await store.subscriptions.update({
            query,
            name,
            id,
            createNew: true
        });

        newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(newSubscriptions)
            .hasSize(3);
        newState = newSubscriptions.find(x => x.subscriptionName === name);
        assertThat(newState)
            .isNotNull();
        assertThat(newState.query)
            .isEqualTo(query);
        assertThat(newState.subscriptionId)
            .isEqualTo(oldId);
    });

    it("canCreateDisabledSubscriptionByUpdateSubscriptionAndThenUpdate", async () => {
        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(subscriptions)
            .hasSize(0);

        await store.subscriptions.update({
            query: "from Users",
            name: "Created",
            disabled: true,
            createNew: true
        });

        const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(newSubscriptions)
            .hasSize(1);
        const newState = newSubscriptions[0];
        assertThat(newState)
            .isNotNull();
        assertThat(newState.subscriptionName)
            .isEqualTo("Created");
        assertThat(newState.query)
            .isEqualTo("from Users");
        assertThat(newState.disabled)
            .isTrue();
    });

    it("subscription_GetOngoingTaskInfoOperation_ShouldReturnCorrentTaskStatus", async () => {
        await putUserDoc(store);

        const name = await store.subscriptions.create(User);
        const state = await store.subscriptions.getSubscriptionState(name);

        const subscription = store.subscriptions.getSubscriptionWorker(name);

        try {
            await new Promise<void>((resolve, reject) => {
                subscription.on("error", reject);
                subscription.on("batch", (batch, callback) => {
                    resolve();
                    callback();
                });
            });

            const taskInfoById = await store.maintenance.send(
                new GetOngoingTaskInfoOperation(state.subscriptionId, "Subscription"));
            assertThat(taskInfoById)
                .isNotNull();
            assertThat(taskInfoById.taskState)
                .isEqualTo("Enabled");
            assertThat(taskInfoById.taskType)
                .isEqualTo("Subscription");
            assertThat(taskInfoById.taskConnectionStatus)
                .isEqualTo("Active");

            const taskInfoByName = await store.maintenance.send(
                new GetOngoingTaskInfoOperation(state.subscriptionName, "Subscription"));
            assertThat(taskInfoByName)
                .isNotNull();
            assertThat(taskInfoByName.taskState)
                .isEqualTo(taskInfoById.taskState);
            assertThat(taskInfoByName.taskType)
                .isEqualTo(taskInfoById.taskType);
            assertThat(taskInfoByName.taskConnectionStatus)
                .isEqualTo(taskInfoById.taskConnectionStatus);
        } finally {
            subscription.dispose();
        }
    });

   it("canCreateSubscriptionWithIncludeTimeSeries_LastRangeByTime", async () => {
       const now = testContext.utcToday();

       const subscriptionCreationOptions: SubscriptionCreationOptions = {
           includes: builder => builder.includeTimeSeries("stockPrice", "Last", TimeValue.ofMonths(1)),
           documentType: Company
       };

       const name = await store.subscriptions.create(subscriptionCreationOptions);

       const worker = store.subscriptions.getSubscriptionWorker({
           subscriptionName: name,
           documentType: Company
       });

       const queue = new AsyncQueue();

       try {
           worker.on("batch", async (batch, callback) => {
               try {
                   const session = batch.openSession();
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   const company = await session.load("companies/1", Company);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   const timeSeries = session.timeSeriesFor(company, "stockPrice");
                   const timeSeriesEntries = await timeSeries.get(addDays(now, -7), null);

                   assertThat(timeSeriesEntries)
                       .hasSize(1);
                   assertThat(timeSeriesEntries[0].timestamp.getTime())
                       .isEqualTo(now.getTime());
                   assertThat(timeSeriesEntries[0].value)
                       .isEqualTo(10);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   queue.push({});
                   callback();
               } catch (e) {
                   callback(e);
               }
           });

           {
               const session = store.openSession();
               const company = new Company();
               company.id = "companies/1";
               company.name = "HR";

               await session.store(company);

               session.timeSeriesFor(company, "stockPrice")
                   .append(now, 10);
               await session.saveChanges();
           }

           await Promise.race([queue.poll(_reasonableWaitTime), subscriptionFailed(worker)]);
       } finally {
           worker.dispose();
       }
   });

   it("canCreateSubscriptionWithIncludeTimeSeries_LastRangeByCount", async () => {
       const now = testContext.utcToday();

       const subscriptionCreationOptions: SubscriptionCreationOptions = {
           includes: builder => builder.includeTimeSeries("stockPrice", "Last", 32),
           documentType: Company
       };

       const name = await store.subscriptions.create(subscriptionCreationOptions);

       const worker = store.subscriptions.getSubscriptionWorker({
           subscriptionName: name,
           documentType: Company
       });

       const queue = new AsyncQueue();

       try {
           worker.on("batch", async (batch, callback) => {
               try {
                   const session = batch.openSession();
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   const company = await session.load("companies/1", Company);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   const timeSeries = session.timeSeriesFor(company, "stockPrice");
                   const timeSeriesEntries = await timeSeries.get(
                       addDays(now, -7),
                       null
                   );

                   assertThat(timeSeriesEntries)
                       .hasSize(1);
                   assertThat(timeSeriesEntries[0].timestamp.getTime())
                       .isEqualTo(addDays(now, -7).getTime());
                   assertThat(timeSeriesEntries[0].value)
                       .isEqualTo(10);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   queue.push({});
                   callback();
               } catch (e) {
                   callback(e);
               }
           });

           {
               const session = store.openSession();
               const company = new Company();
               company.id = "companies/1";
               company.name = "HR";

               await session.store(company);

               session.timeSeriesFor(company, "stockPrice")
                   .append(addDays(now, -7), 10);
               await session.saveChanges();
           }

           await Promise.race([queue.poll(_reasonableWaitTime), subscriptionFailed(worker)]);
       } finally {
           worker.dispose();
       }
   });

   it("canCreateSubscriptionWithIncludeTimeSeries_Array_LastRange", async () => {
       const now = testContext.utcToday();

       const subscriptionCreationOptions: SubscriptionCreationOptions = {
           includes: builder => builder.includeTimeSeries(["stockPrice", "stockPrice2"], "Last", TimeValue.ofDays(7)),
           documentType: Company
       };

       const name = await store.subscriptions.create(subscriptionCreationOptions);

       const worker = store.subscriptions.getSubscriptionWorker({
           subscriptionName: name,
           documentType: Company
       });

       const queue = new AsyncQueue();

       try {
           worker.on("batch", async (batch, callback) => {
               try {
                   const session = batch.openSession();
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   const company = await session.load("companies/1", Company);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   let timeSeries = session.timeSeriesFor(company, "stockPrice");
                   let timeSeriesEntries = await timeSeries.get(
                       addDays(now, -7),
                       null
                   );

                   assertThat(timeSeriesEntries)
                       .hasSize(1);
                   assertThat(timeSeriesEntries[0].timestamp.getTime())
                       .isEqualTo(addDays(now, -7).getTime());
                   assertThat(timeSeriesEntries[0].value)
                       .isEqualTo(10);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   timeSeries = session.timeSeriesFor(company, "stockPrice2");
                   timeSeriesEntries = await timeSeries.get(
                       addDays(now, -5),
                       null
                   );

                   assertThat(timeSeriesEntries)
                       .hasSize(1);
                   assertThat(timeSeriesEntries[0].timestamp.getTime())
                       .isEqualTo(addDays(now, -5).getTime());
                   assertThat(timeSeriesEntries[0].value)
                       .isEqualTo(100);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   queue.push({});
                   callback();
               } catch (e) {
                   callback(e);
               }
           });

           {
               const session = store.openSession();
               const company = new Company();
               company.id = "companies/1";
               company.name = "HR";

               await session.store(company);

               session.timeSeriesFor(company, "stockPrice")
                   .append(addDays(now, -7), 10);
               session.timeSeriesFor(company, "stockPrice2")
                   .append(addDays(now, -5), 100);
               await session.saveChanges();
           }

           await Promise.race([queue.poll(_reasonableWaitTime), subscriptionFailed(worker)]);
       } finally {
           worker.dispose();
       }
   });

   it("canCreateSubscriptionWithIncludeTimeSeries_All_LastRange", async () => {
       const now = testContext.utcToday();

       const subscriptionCreationOptions: SubscriptionCreationOptions = {
           includes: builder => builder.includeAllTimeSeries("Last", TimeValue.ofDays(7)),
           documentType: Company
       };

       const name = await store.subscriptions.create(subscriptionCreationOptions);

       const worker = store.subscriptions.getSubscriptionWorker({
           subscriptionName: name,
           documentType: Company
       });

       const queue = new AsyncQueue();

       try {
           worker.on("batch", async (batch, callback) => {
               try {
                   const session = batch.openSession();
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   const company = await session.load("companies/1", Company);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   let timeSeries = session.timeSeriesFor(company, "stockPrice");
                   let timeSeriesEntries = await timeSeries.get(
                       addDays(now, -7),
                       null
                   );

                   assertThat(timeSeriesEntries)
                       .hasSize(1);
                   assertThat(timeSeriesEntries[0].timestamp.getTime())
                       .isEqualTo(addDays(now, -7).getTime());
                   assertThat(timeSeriesEntries[0].value)
                       .isEqualTo(10);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   timeSeries = session.timeSeriesFor(company, "stockPrice2");
                   timeSeriesEntries = await timeSeries.get(
                       addDays(now, -5),
                       null
                   );

                   assertThat(timeSeriesEntries)
                       .hasSize(1);
                   assertThat(timeSeriesEntries[0].timestamp.getTime())
                       .isEqualTo(addDays(now, -5).getTime());
                   assertThat(timeSeriesEntries[0].value)
                       .isEqualTo(100);
                   assertThat(session.advanced.numberOfRequests)
                       .isEqualTo(0);

                   queue.push({});
                   callback();
               } catch (e) {
                   callback(e);
               }
           });

           {
               const session = store.openSession();
               const company = new Company();
               company.id = "companies/1";
               company.name = "HR";

               await session.store(company);

               session.timeSeriesFor(company, "stockPrice")
                   .append(addDays(now, -7), 10);
               session.timeSeriesFor(company, "stockPrice2")
                   .append(addDays(now, -5), 100);
               await session.saveChanges();
           }

           await Promise.race([queue.poll(_reasonableWaitTime), subscriptionFailed(worker)]);
       } finally {
           worker.dispose();
       }
   });

    it("canGetSubscriptionsFromDatabase", async () => {
        let subscriptionDocuments = await store.subscriptions.getSubscriptions(0, 10);
        assertThat(subscriptionDocuments)
            .hasSize(0);

        await store.subscriptions.create(User);

        subscriptionDocuments = await store.subscriptions.getSubscriptions(0, 10);
        assertThat(subscriptionDocuments)
            .hasSize(1);
        assertThat(subscriptionDocuments[0].query)
            .isEqualTo("from 'Users' as doc");

        const subscription = store.subscriptions.getSubscriptionWorker({
            subscriptionName: subscriptionDocuments[0].subscriptionName,
            timeToWaitBeforeConnectionRetry: 5000
        });

        try {
            await putUserDoc(store);

            const itemsInBatch = await new Promise<number>((resolve, reject) => {
                subscription.on("error", reject);
                subscription.on("batch", (batch, callback) => {
                    resolve(batch.getNumberOfItemsInBatch());
                    callback();
                });
            });

            assertThat(itemsInBatch)
                .isEqualTo(1);
        } finally {
            subscription.dispose();
        }
    });

    it("subscriptionsBatchSizeShouldIgnoreSkippedItems", async () => {
        const name = await store.subscriptions.create({
            query: "from Users where count > 0"
        });

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: name,
            documentType: User,
            timeToWaitBeforeConnectionRetry: 5000,
            maxDocsPerBatch: 2
        });

        try {
            {
                const session = store.openSession();
                for (let i = 0; i < 10; i++) {
                    const user = new User();
                    user.count = 1;
                    await session.store(user);
                }

                await session.saveChanges();
            }

            subscription.on("batch", async (batch, callback) => {
                try {
                    const session = batch.openSession();

                    for (const item of batch.items) {
                        item.result.count--;
                    }

                    await session.saveChanges();
                    callback();
                } catch (e) {
                    callback(e);
                }
            });

            const usersWithPositiveCount = await testContext.waitForValue(async () => {
                const session = store.openSession();
                const users = await session.query(User)
                    .whereGreaterThan("count", 0)
                    .waitForNonStaleResults()
                    .all();
                return users.length;
            }, 0);

            assertThat(usersWithPositiveCount)
                .isEqualTo(0);
        } finally {
            subscription.dispose();
        }
    });

    it("canBackupAndRestoreSubscriptions", async () => {
        const temporaryDirContext = new TemporaryDirContext();

        try {
            const backupPath = path.join(temporaryDirContext.tempDir, "BackupFolder");
            fs.mkdirSync(backupPath);

            {
                const session = store.openSession();
                const user = new User();
                user.name = "oren";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            await store.subscriptions.create({ documentType: User, name: "sub1" });
            await store.subscriptions.create({ documentType: User, name: "sub2" });
            await store.subscriptions.create(User);

            let subscriptionStateList = await store.subscriptions.getSubscriptions(0, 10);
            assertThat(subscriptionStateList)
                .hasSize(3);

            const backupConfiguration: PeriodicBackupConfiguration = {
                backupType: "Backup",
                fullBackupFrequency: "0 0 1 1 *",
                localSettings: {
                    folderPath: backupPath
                }
            };

            const { taskId } = await store.maintenance.send(new UpdatePeriodicBackupOperation(backupConfiguration));

            await testContext.waitForValue(async () => {
                const task = await store.maintenance.send(new GetOngoingTaskInfoOperation(taskId, "Backup"));
                return !!task.responsibleNode?.nodeTag;
            }, true);

            const backupOperation = await store.maintenance.send(new StartBackupOperation(true, taskId));
            await new OperationCompletionAwaiter(
                store.getRequestExecutor(), store.conventions, backupOperation.operationId, backupOperation.responsibleNode)
                .waitForCompletion();

            const restoredDatabaseName = store.database + "_restored";

            const restoreOperation = await store.maintenance.server.send(new RestoreBackupOperation({
                backupLocation: path.join(backupPath, fs.readdirSync(backupPath)[0]),
                databaseName: restoredDatabaseName,
                type: "Local"
            } as RestoreBackupConfiguration));
            await restoreOperation.waitForCompletion();

            try {
                subscriptionStateList = await store.subscriptions.getSubscriptions(0, 10, restoredDatabaseName);

                assertThat(subscriptionStateList)
                    .hasSize(3);
                assertThat(subscriptionStateList)
                    .anyMatch(x => x.subscriptionName === "sub1");
                assertThat(subscriptionStateList)
                    .anyMatch(x => x.subscriptionName === "sub2");

                const worker = store.subscriptions.getSubscriptionWorker<User>({
                    subscriptionName: "sub1",
                    documentType: User,
                    maxDocsPerBatch: 5,
                    timeToWaitBeforeConnectionRetry: 1000
                }, restoredDatabaseName);

                try {
                    await new Promise<void>((resolve, reject) => {
                        worker.on("error", reject);
                        worker.on("batch", (batch, callback) => {
                            resolve();
                            callback();
                        });
                    });
                } finally {
                    worker.dispose();
                }
            } finally {
                await store.maintenance.server.send(new DeleteDatabasesOperation({
                    databaseNames: [restoredDatabaseName],
                    hardDelete: true
                }));
            }
        } finally {
            temporaryDirContext.dispose();
        }
    });

    it("canExportAndImportSubscriptions", async () => {
        const temporaryDirContext = new TemporaryDirContext();
        const store2 = await testContext.getDocumentStore();

        try {
            await store.subscriptions.create({ documentType: User, name: "sub1" });
            await store.subscriptions.create({ documentType: User, name: "sub2" });
            await store.subscriptions.create(User);

            let subscriptionStateList = await store.subscriptions.getSubscriptions(0, 10);
            assertThat(subscriptionStateList)
                .hasSize(3);

            const exportFile = path.join(
                temporaryDirContext.tempDir, "subscriptions." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION);

            const exportOperation = await store.smuggler.export(new DatabaseSmugglerExportOptions(), exportFile);
            await exportOperation.waitForCompletion();

            const importOperation = await store2.smuggler.import(new DatabaseSmugglerImportOptions(), exportFile);
            await importOperation.waitForCompletion();

            subscriptionStateList = await store2.subscriptions.getSubscriptions(0, 10);

            assertThat(subscriptionStateList)
                .hasSize(3);
            assertThat(subscriptionStateList)
                .anyMatch(x => x.subscriptionName === "sub1");
            assertThat(subscriptionStateList)
                .anyMatch(x => x.subscriptionName === "sub2");

            {
                const session = store2.openSession();
                const user = new User();
                user.name = "oren";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            const worker = store2.subscriptions.getSubscriptionWorker<User>({
                subscriptionName: "sub1",
                documentType: User,
                maxDocsPerBatch: 5,
                timeToWaitBeforeConnectionRetry: 1000
            });

            try {
                await new Promise<void>((resolve, reject) => {
                    worker.on("error", reject);
                    worker.on("batch", (batch, callback) => {
                        resolve();
                        callback();
                    });
                });
            } finally {
                worker.dispose();
            }
        } finally {
            await disposeTestDocumentStore(store2);
            temporaryDirContext.dispose();
        }
    });

    it("canUseNestedPropertiesInSubscriptionCriteria", async () => {
        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                const firstStreetPerson = new PersonWithAddress();
                firstStreetPerson.address = new Address();
                firstStreetPerson.address.street = "1st Street";
                firstStreetPerson.address.zipCode = i % 2 === 0 ? "999" : "12345";
                await session.store(firstStreetPerson);

                const secondStreetPerson = new PersonWithAddress();
                secondStreetPerson.address = new Address();
                secondStreetPerson.address.street = "2nd Street";
                secondStreetPerson.address.zipCode = "12345";
                await session.store(secondStreetPerson);

                await session.store(new Company());
            }

            await session.saveChanges();
        }

        await store.subscriptions.create(User);

        const id = await store.subscriptions.create({
            query: "from PersonWithAddresses where address.street = '1st Street' and address.zipCode != '999'"
        });

        const subscription = store.subscriptions.getSubscriptionWorker<PersonWithAddress>({
            subscriptionName: id,
            documentType: PersonWithAddress,
            maxDocsPerBatch: 5,
            timeToWaitBeforeConnectionRetry: 5000
        });

        try {
            const streets: string[] = [];

            await new Promise<void>((resolve, reject) => {
                subscription.on("error", reject);
                subscription.on("batch", (batch, callback) => {
                    streets.push(...batch.items.map(x => x.result.address.street));

                    if (streets.length >= 5) {
                        resolve();
                    }

                    callback();
                });
            });

            assertThat(streets)
                .allMatch(x => x === "1st Street");
        } finally {
            subscription.dispose();
        }
    });

    it("shouldIncrementFailingTests", async () => {
        const docsAmount = 50;
        let lastCompany: Company;

        {
            const bulkInsert = store.bulkInsert();
            for (let i = 0; i < docsAmount; i++) {
                lastCompany = new Company();
                lastCompany.name = "Something Inc. #" + i;
                await bulkInsert.store(lastCompany);
            }

            await bulkInsert.finish();
        }

        let lastChangeVector: string;

        {
            const session = store.openSession();
            const company = await session.load(lastCompany.id, Company);
            lastChangeVector = session.advanced.getChangeVectorFor(company);
        }

        const id = await store.subscriptions.create(Company);

        const subscription = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: id,
            documentType: Company,
            maxDocsPerBatch: 1,
            ignoreSubscriberErrors: true,
            timeToWaitBeforeConnectionRetry: 5000
        });

        try {
            await new Promise<void>(resolve => {
                let acknowledged = 0;

                subscription.on("afterAcknowledgment", batch => {
                    acknowledged += batch.getNumberOfItemsInBatch();

                    if (acknowledged === docsAmount) {
                        resolve();
                    }
                });

                subscription.on("batch", (batch, callback) => {
                    callback(getError("InvalidOperationException", "Fake exception"));
                });
            });

            const subscriptionStatus = await store.subscriptions.getSubscriptions(0, 1024);

            assertThat(subscriptionStatus[0].changeVectorForNextBatchStartingPoint)
                .isEqualTo(lastChangeVector);
        } finally {
            subscription.dispose();
        }
    });

    async function putUser(name: string, age: number) {
        const session = store.openSession();
        const user = new User();
        user.name = name;
        user.age = age;
        await session.store(user);
        await session.saveChanges();
    }

    function assertClosedBecauseQueryModified(error: Error & { canReconnect?: boolean }, subscriptionName: string) {
        assertThat(error.name)
            .isEqualTo("SubscriptionClosedException");
        assertThat(error.canReconnect)
            .isTrue();
        assertThat(error.message)
            .isEqualTo(`Subscription with id '${subscriptionName}' was closed. `
                + "Raven.Client.Exceptions.Documents.Subscriptions.SubscriptionClosedException: "
                + `The subscription ${subscriptionName} query has been modified, connection must be restarted`);
    }

    it("canUpdateSubscriptionToStartFromBeginningOfTime", async () => {
        const count = 10;
        await store.subscriptions.create(User);
        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(subscriptions)
            .hasSize(1);

        const state = subscriptions[0];
        assertThat(state.query)
            .isEqualTo("from 'Users' as doc");

        const newQuery = "from Users where age > 18";

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: state.subscriptionName,
            documentType: User,
            timeToWaitBeforeConnectionRetry: 16
        });

        try {
            const retryErrors: Error[] = [];
            let connections = 0;
            let processed = 0;

            subscription.on("connectionRetry", error => retryErrors.push(error));
            subscription.on("onEstablishedSubscriptionConnection", () => connections++);
            subscription.on("batch", (batch, callback) => {
                processed += batch.getNumberOfItemsInBatch();
                callback();
            });

            for (let i = 0; i < count; i++) {
                await putUser("EGR_" + i, i < count / 2 ? 18 : 19);
            }

            const processedBeforeUpdate = await testContext.waitForValue(async () => processed, count);
            assertThat(processedBeforeUpdate)
                .isEqualTo(count);

            await store.subscriptions.update({
                name: state.subscriptionName,
                query: newQuery,
                changeVector: "BeginningOfTime"
            });

            const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
            const newState = newSubscriptions[0];
            assertThat(newSubscriptions)
                .hasSize(1);
            assertThat(newState.subscriptionName)
                .isEqualTo(state.subscriptionName);
            assertThat(newState.query)
                .isEqualTo(newQuery);
            assertThat(newState.subscriptionId)
                .isEqualTo(state.subscriptionId);

            const reconnected = await testContext.waitForValue(async () => connections > 1, true);
            assertThat(reconnected)
                .isTrue();

            const processedAfterUpdate = await testContext.waitForValue(async () => processed, count + count / 2);
            assertThat(processedAfterUpdate)
                .isEqualTo(count + count / 2);

            for (const error of retryErrors) {
                if (error.name === "SubscriptionClosedException") {
                    assertClosedBecauseQueryModified(error, state.subscriptionName);
                } else if (error.name === "SubscriptionChangeVectorUpdateConcurrencyException") {
                    assertThat(error.message)
                        .startsWith(`Can't acknowledge subscription with name '${state.subscriptionName}' `
                            + "due to inconsistency in change vector progress. "
                            + "Probably there was an admin intervention that changed the change vector value. "
                            + "Stored value: , received value: A:11");
                }
            }
        } finally {
            subscription.dispose();
        }
    });

    it("canUpdateSubscriptionToStartFromLastDocument", async () => {
        const count = 10;
        await store.subscriptions.create(User);
        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(subscriptions)
            .hasSize(1);

        const state = subscriptions[0];
        assertThat(state.query)
            .isEqualTo("from 'Users' as doc");

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: state.subscriptionName,
            documentType: User,
            timeToWaitBeforeConnectionRetry: 16
        });

        try {
            const retryErrors: Error[] = [];
            const names: string[] = [];
            let connections = 0;

            subscription.on("connectionRetry", error => retryErrors.push(error));
            subscription.on("onEstablishedSubscriptionConnection", () => connections++);
            subscription.on("batch", (batch, callback) => {
                names.push(...batch.items.map(x => x.result.name));
                callback();
            });

            for (let i = 0; i < count / 2; i++) {
                await putUser("EGR_" + i, 18);
            }

            const processedBeforeUpdate = await testContext.waitForValue(async () => names.length, count / 2);
            assertThat(processedBeforeUpdate)
                .isEqualTo(count / 2);

            const newQuery = "from Users where age > 18";

            await store.subscriptions.update({
                name: state.subscriptionName,
                query: newQuery,
                changeVector: "LastDocument"
            });

            const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
            const newState = newSubscriptions[0];
            assertThat(newSubscriptions)
                .hasSize(1);
            assertThat(newState.subscriptionName)
                .isEqualTo(state.subscriptionName);
            assertThat(newState.query)
                .isEqualTo(newQuery);
            assertThat(newState.subscriptionId)
                .isEqualTo(state.subscriptionId);

            const reconnected = await testContext.waitForValue(async () => connections > 1, true);
            assertThat(reconnected)
                .isTrue();

            for (let i = count / 2; i < count; i++) {
                await putUser("EGR_" + i, 18);
            }

            await putUser("EGR_" + count, 19);

            await testContext.waitForValue(async () => names.length, count / 2 + 1);
            assert.deepStrictEqual(names, ["EGR_0", "EGR_1", "EGR_2", "EGR_3", "EGR_4", "EGR_10"]);

            for (const error of retryErrors) {
                assertClosedBecauseQueryModified(error, state.subscriptionName);
            }
        } finally {
            subscription.dispose();
        }
    });

    it("canUpdateSubscriptionToStartFromDoNotChange", async () => {
        const count = 10;
        await store.subscriptions.create(User);
        const subscriptions = await store.subscriptions.getSubscriptions(0, 5);
        assertThat(subscriptions)
            .hasSize(1);

        const state = subscriptions[0];
        assertThat(state.query)
            .isEqualTo("from 'Users' as doc");

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: state.subscriptionName,
            documentType: User,
            timeToWaitBeforeConnectionRetry: 16
        });

        try {
            const retryErrors: Error[] = [];
            let connections = 0;
            let processed = 0;

            subscription.on("connectionRetry", error => retryErrors.push(error));
            subscription.on("onEstablishedSubscriptionConnection", () => connections++);
            subscription.on("batch", (batch, callback) => {
                processed += batch.getNumberOfItemsInBatch();
                callback();
            });

            for (let i = 0; i < count / 2; i++) {
                await putUser("EGR_" + i, 18);
            }

            const processedBeforeUpdate = await testContext.waitForValue(async () => processed, count / 2);
            assertThat(processedBeforeUpdate)
                .isEqualTo(count / 2);

            const newQuery = "from Users where age > 18";

            await store.subscriptions.update({
                name: state.subscriptionName,
                query: newQuery,
                changeVector: "DoNotChange"
            });

            const newSubscriptions = await store.subscriptions.getSubscriptions(0, 5);
            const newState = newSubscriptions[0];
            assertThat(newSubscriptions)
                .hasSize(1);
            assertThat(newState.subscriptionName)
                .isEqualTo(state.subscriptionName);
            assertThat(newState.query)
                .isEqualTo(newQuery);
            assertThat(newState.subscriptionId)
                .isEqualTo(state.subscriptionId);

            const reconnected = await testContext.waitForValue(async () => connections > 1, true);
            assertThat(reconnected)
                .isTrue();

            for (let i = 0; i < count / 2; i++) {
                await putUser("EGR_" + i, 19);
            }

            const processedAfterUpdate = await testContext.waitForValue(async () => processed, count);
            assertThat(processedAfterUpdate)
                .isEqualTo(count);

            for (const error of retryErrors) {
                assertClosedBecauseQueryModified(error, state.subscriptionName);
            }
        } finally {
            subscription.dispose();
        }
    });

    it("acknowledgeSubscriptionBatchWhenDBisBeingDeletedShouldThrow", async () => {
        const id = await store.subscriptions.create(User);
        const subscription = store.subscriptions.getSubscriptionWorker(id);

        try {
            {
                const session = store.openSession();
                const user = new User();
                user.name = "EGR";
                user.age = 39;
                await session.store(user);
                await session.saveChanges();
            }

            const deleteDatabase = store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [store.database],
                hardDelete: true
            }));

            const error = await new Promise<Error>(resolve => {
                let lastError: Error;
                subscription.on("error", e => lastError = e);
                subscription.on("end", () => resolve(lastError));
                subscription.on("batch", (batch, callback) => callback());
            });

            assert.ok(
                error.name === "DatabaseDoesNotExistException" || error.name === "SubscriptionDoesNotExistException",
                error.stack);
            assertThat(error.message)
                .contains(error.name === "SubscriptionDoesNotExistException"
                    ? `Stopping subscription '${subscription.subscriptionName}' on node A, because database '${store.database}' is being deleted.`
                    : store.database);

            await deleteDatabase;
        } finally {
            subscription.dispose();
        }
    });

    it("waitingSubscriptionShouldBeRegisteredInSubscriptionConnections", async () => {
        const name = await store.subscriptions.create({
            query: "from Users",
            name: "Subscription0"
        });

        const assertRunningSubscriptionAndDrop = async () => {
            const taskInfo = await store.maintenance.send(new GetOngoingTaskInfoOperation(name, "Subscription"));
            assertThat(taskInfo.taskConnectionStatus)
                .isEqualTo("Active");

            await store.subscriptions.dropConnection(name);
        };

        const worker1 = store.subscriptions.getSubscriptionWorker({
            subscriptionName: name,
            strategy: "WaitForFree"
        });

        const worker2 = store.subscriptions.getSubscriptionWorker({
            subscriptionName: name,
            strategy: "WaitForFree"
        });

        try {
            worker1.on("error", TypeUtil.NOOP);
            const worker1Finished = new Promise<void>(resolve => worker1.on("end", () => resolve()));
            const worker1Connected = new Promise<void>(resolve =>
                worker1.on("onEstablishedSubscriptionConnection", () => resolve()));
            const worker1Processed = new Promise<void>(resolve =>
                worker1.on("batch", (batch, callback) => {
                    resolve();
                    callback();
                }));

            await worker1Connected;

            worker2.on("error", TypeUtil.NOOP);
            const worker2Finished = new Promise<void>(resolve => worker2.on("end", () => resolve()));
            const worker2Connected = new Promise<void>(resolve =>
                worker2.on("onEstablishedSubscriptionConnection", () => resolve()));
            const worker2Processed = new Promise<void>(resolve =>
                worker2.on("batch", (batch, callback) => {
                    resolve();
                    callback();
                }));

            await putUserDoc(store);
            await worker1Processed;

            await assertRunningSubscriptionAndDrop();

            await worker2Connected;
            await putUserDoc(store);
            await worker2Processed;

            await assertRunningSubscriptionAndDrop();

            await Promise.all([worker1Finished, worker2Finished]);
        } finally {
            worker1.dispose();
            worker2.dispose();
        }
    });

    it("canUseEmoji", async () => {
        let user1: User;

        {
            const session = store.openSession();
            user1 = new User();
            user1.name = "user_\uD83D\uDE21\uD83D\uDE21\uD83E\uDD2C\uD83D\uDE00😡😡🤬😀";
            await session.store(user1, "users/1");
            await session.saveChanges();
        }

        const creationOptions: SubscriptionCreationOptions = {
            name: "name_\uD83D\uDE21\uD83D\uDE21\uD83E\uDD2C\uD83D\uDE00😡😡🤬😀",
            documentType: User
        };

        const id = await store.subscriptions.create(creationOptions);

        const subscription = store.subscriptions.getSubscriptionWorker({
            documentType: User,
            subscriptionName: id
        });

        const keys = new AsyncQueue<string>();

        try {
            subscription.on("batch", (batch, callback) => {
                for (const x of batch.items) keys.push(x.result.name);
                callback();
            });

            const key = await keys.poll(_reasonableWaitTime);
            assertThat(key)
                .isNotNull()
                .isEqualTo(user1.name);
        } finally {
            subscription.dispose();
        }
    });

    it("removeListener detaches batch handler", async () => {
        const id = await store.subscriptions.create(User);

        const subscription = store.subscriptions.getSubscriptionWorker<User>({
            subscriptionName: id,
            documentType: User
        });

        const keys = new AsyncQueue<string>();
        let removedHandlerCalls = 0;
        const removedHandler = (batch: SubscriptionBatch<User>, callback: () => void) => {
            removedHandlerCalls++;
            callback();
        };

        try {
            subscription.on("batch", (batch, callback) => {
                for (const x of batch.items) keys.push(x.id);
                callback();
            });
            subscription.on("batch", removedHandler);
            subscription.removeListener("batch", removedHandler);

            {
                const session = store.openSession();
                await session.store(new User(), "users/1");
                await session.saveChanges();
            }

            assertThat(await keys.poll(_reasonableWaitTime))
                .isEqualTo("users/1");
            assertThat(removedHandlerCalls)
                .isEqualTo(0);
        } finally {
            subscription.dispose();
        }
    });

    it("connectionStreamTimeoutCannotBeSmallerThan15Seconds", async () => {
        await assertThrows(() => store.subscriptions.getSubscriptionWorker({
            subscriptionName: "subscription",
            connectionStreamTimeout: milliseconds({ seconds: 15 }) - 1
        }), err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });

    it("subscriptions_WithWaitForFree_ShouldNotDisconnectOnStreamTimeout", async () => {
        const subscriptionName = await store.subscriptions.create({
            query: "from Users where count > 0"
        });

        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                const user = new User();
                user.count = 1;
                await session.store(user);
            }
            await session.saveChanges();
        }

        const processDocuments = async (batch: SubscriptionBatch<User>, callback: (error?: Error) => void) => {
            try {
                const session = batch.openSession();
                for (const item of batch.items) {
                    item.result.count--;
                }
                await session.saveChanges();
                callback();
            } catch (err) {
                callback(err);
            }
        };

        const options: SubscriptionWorkerOptions<User> = {
            subscriptionName,
            documentType: User,
            timeToWaitBeforeConnectionRetry: milliseconds({ seconds: 40 }),
            maxErroneousPeriod: milliseconds({ hours: 1 }),
            strategy: "WaitForFree",
            connectionStreamTimeout: milliseconds({ seconds: 15 })
        };

        const subscription = store.subscriptions.getSubscriptionWorker(options);
        const subscription2 = store.subscriptions.getSubscriptionWorker(options);
        const subscription3 = store.subscriptions.getSubscriptionWorker(options);

        try {
            const established = new Promise<void>(resolve =>
                subscription.on("onEstablishedSubscriptionConnection", () => resolve()));
            subscription.on("batch", processDocuments);

            const errors: Error[] = [];
            for (const waitingSubscription of [subscription2, subscription3]) {
                waitingSubscription.on("connectionRetry", err => errors.push(err));
                waitingSubscription.on("unexpectedSubscriptionError", err => errors.push(err));
                waitingSubscription.on("error", err => errors.push(err));
            }

            await wrapWithTimeout(established, _reasonableWaitTime);

            subscription2.on("batch", processDocuments);
            subscription3.on("batch", processDocuments);

            await delay(options.timeToWaitBeforeConnectionRetry / 2 + milliseconds({ seconds: 5 }));

            assert.deepStrictEqual(errors.map(x => x.message), []);
        } finally {
            subscription.dispose();
            subscription2.dispose();
            subscription3.dispose();
        }
    });
});


// describe("Manual subscription tests", () => {

//     it.only("reconnection test", function (done) {
//         this.timeout(0);

//         const store = new DocumentStore("http://127.0.0.1:8080", "subs");
//         store.initialize();

//         const sub = store.subscriptions.getSubscriptionWorker({
//             subscriptionName: "sub1",
//         });

//         sub.on("batch", (batch, callback) => {
//             callback();
//         });

//         sub.on("error", (err) => {
//         });

//         sub.on("end", () => {
//             done();
//             store.dispose();
//         });
//     });
// });
