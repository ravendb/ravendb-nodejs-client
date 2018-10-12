import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask, SetIndexesPriorityOperation, GetStatisticsOperation,
    DocumentChange, IndexChange
} from "../../../../../src";
import { Order, User } from "../../../../Assets/Entities";
import { AsyncQueue } from "../../../../Utils/AsyncQueue";
import { throwError } from "../../../../../src/Exceptions";

describe("ChangesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can obtain single document changes", async () => {

        const changesList = new AsyncQueue<DocumentChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forDocument("users/1");
        await observable.ensureSubscribedNow();

        const handler = (change: DocumentChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([ errPromise, actAndAssert() ]);

        async function actAndAssert() {
            try {
                observable.on("data", handler);

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "users/1");
                    await session.saveChanges();
                }

                const documentChange = await changesList.poll(2000);
                assert.ok(documentChange);

                assert.strictEqual(documentChange.id, "users/1");
                assert.strictEqual(documentChange.type, "Put");

                try {
                    await changesList.poll(100);
                    assert.fail("Should have thrown");
                } catch (err) {
                    assert.strictEqual(err.name, "TimeoutException");
                }
            } finally {
                observable.off("data", handler);
            }

            // at this point we should be unsubscribed from changes on 'users/1'

            {
                const session = store.openSession();
                const user = new User();
                user.name = "another name";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            // it should be empty as we destroyed subscription
            try {
                await changesList.poll(100);
                assert.fail("Should have thrown");
            } catch (err) {
                assert.strictEqual(err.name, "TimeoutException");
            }
        }
    });

    it("can obtain all documents changes", async () => {
        const changesList = new AsyncQueue<DocumentChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forAllDocuments();
        await observable.ensureSubscribedNow();

        const handler = (change: DocumentChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            try {
                observable.on("data", handler);
                observable.on("error", e => throwError("InvalidOperationException", e.message));

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "users/1");
                    await session.saveChanges();
                }

                const documentChange = await changesList.poll(1000);
                assert.ok(documentChange);
                assert.strictEqual(documentChange.id, "users/1");
                assert.strictEqual(documentChange.type, "Put");

                try {
                    await changesList.poll(100);
                    assert.fail("Should have thrown");
                } catch (err) {
                    assert.strictEqual(err.name, "TimeoutException");
                }
            } finally {
                observable.off("data", handler);
            }

            // at this point we should be unsubscribed from changes on 'users/1'

            {
                const session = store.openSession();
                const user = new User();
                user.name = "another name";
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            // it should be empty as we destroyed subscription
            try {
                await changesList.poll(100);
                assert.fail("Should have thrown");
            } catch (err) {
                assert.strictEqual(err.name, "TimeoutException");
            }
        }
    });

    class UsersByName extends AbstractIndexCreationTask {
        constructor() {
            super();

            this.map = "from c in docs.Users select new " +
                " {" +
                "    c.name, " +
                "    count = 1" +
                "}";

            this.reduce = "from result in results " +
                "group result by result.name " +
                "into g " +
                "select new " +
                "{ " +
                "  name = g.Key, " +
                "  count = g.Sum(x => x.count) " +
                "}";
        }
    }

    it("can obtain single index changes", async () => {
        const changesList = new AsyncQueue<IndexChange>();

        await store.executeIndex(new UsersByName());

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forIndex(new UsersByName().getIndexName());
        await observable.ensureSubscribedNow();

        const handler = (change: IndexChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            try {
                observable.on("data", handler);

                const operation = new SetIndexesPriorityOperation(new UsersByName().getIndexName(), "Low");
                await store.maintenance.send(operation);

                const indexChange = await changesList.poll(2000);
                assert.ok(indexChange);

                assert.strictEqual(indexChange.name, new UsersByName().getIndexName());
            } finally {
                observable.off("data", handler);
            }
        }
    });

    it("can obtain all index changes", async () => {
        const changesList = new AsyncQueue<IndexChange>();

        await store.executeIndex(new UsersByName());

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forAllIndexes();
        await observable.ensureSubscribedNow();

        const handler = (change: IndexChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            try {
                observable.on("data", handler);

                const operation = new SetIndexesPriorityOperation(new UsersByName().getIndexName(), "Low");
                await store.maintenance.send(operation);

                const indexChange = await changesList.poll(2000);
                assert.ok(indexChange);

                assert.strictEqual(indexChange.name, new UsersByName().getIndexName());
            } finally {
                observable.off("data", handler);
            }
        }
    });

    it("can obtain notification about documents starting with", async () => {
        const changesList = new AsyncQueue<DocumentChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forDocumentsStartingWith("users/");
        await observable.ensureSubscribedNow();

        const handler = (change: DocumentChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            try {
                observable.on("data", handler);

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "users/1");
                    await session.saveChanges();
                }

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "differentDocumentPrefix/1");
                    await session.saveChanges();
                }

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "users/2");
                    await session.saveChanges();
                }

                let documentChange = await changesList.poll(2000);
                assert.ok(documentChange);
                assert.strictEqual(documentChange.id, "users/1");

                documentChange = await changesList.poll(2000);
                assert.ok(documentChange);
                assert.strictEqual(documentChange.id, "users/2");
            } finally {
                observable.off("data", handler);
            }
        }
    });

    it("can obtain notification about documents starting with", async () => {
        const changesList = new AsyncQueue<DocumentChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forDocumentsInCollection("users");
        await observable.ensureSubscribedNow();

        const handler = (change: DocumentChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            try {
                observable.on("data", handler);

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "users/1");
                    await session.saveChanges();
                }

                {
                    const session = store.openSession();
                    const order = new Order();
                    await session.store(order, "orders/1");
                    await session.saveChanges();
                }

                {
                    const session = store.openSession();
                    const user = new User();
                    await session.store(user, "users/2");
                    await session.saveChanges();
                }

                let documentChange = await changesList.poll(2000);
                assert.ok(documentChange);
                assert.strictEqual(documentChange.id, "users/1");

                documentChange = await changesList.poll(2000);
                assert.ok(documentChange);
                assert.strictEqual(documentChange.id, "users/2");
            } finally {
                observable.off("data", handler);
            }
        }
    });

    it("doesn't crush the server if listening on non existing database", async () => {
        const changesList = new AsyncQueue<DocumentChange>();

        const changes = store.changes("no_such_db");
        changes.on("error", () => {
            // we ignore that since it will throw 2 lines below
        });
        try {
            await changes.ensureConnectedNow();
            assert.fail("Should have thrown.");
        } catch (err) {
            assert.strictEqual(err.name, "DatabaseDoesNotExistException");
        }

        await store.maintenance.send(new GetStatisticsOperation());
    });
});
