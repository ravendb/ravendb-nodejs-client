import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { IDocumentStore, TimeSeriesChange } from "../../../src";
import { AsyncQueue } from "../../Utils/AsyncQueue";
import { throwError } from "../../../src/Exceptions";
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import moment = require("moment");

describe("RavenDB_14230", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetNotificationAboutTimeSeriesAppend", async () => {
        const changesList = new AsyncQueue<TimeSeriesChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forTimeSeriesOfDocument("users/1");
        await observable.ensureSubscribedNow();

        const handler = (change: TimeSeriesChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            {
                const session = store.openSession();
                const user = new User();
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            let date = new Date();

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(date, 33);
                await session.saveChanges();
            }

            let timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();

            assertThat(timeSeriesChange.documentId)
                .isEqualTo("users/1");
            assertThat(timeSeriesChange.type)
                .isEqualTo("Put");
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
            assertThat(timeSeriesChange.from.getTime())
                .isEqualTo(date.getTime());
            assertThat(timeSeriesChange.to.getTime())
                .isEqualTo(date.getTime());
            assertThat(timeSeriesChange.changeVector)
                .isNotNull();

            date = new Date();

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(date, 22);
                await session.saveChanges();
            }

            timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();

            assertThat(timeSeriesChange.documentId)
                .isEqualTo("users/1");
            assertThat(timeSeriesChange.type)
                .isEqualTo("Put");
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
            assertThat(timeSeriesChange.from.getTime())
                .isEqualTo(date.getTime());
            assertThat(timeSeriesChange.to.getTime())
                .isEqualTo(date.getTime());
            assertThat(timeSeriesChange.changeVector)
                .isNotNull();
        }
    });

    it("canGetNotificationAboutTimeSeriesDelete", async () => {
        const changesList = new AsyncQueue<TimeSeriesChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forTimeSeriesOfDocument("users/1");
        await observable.ensureSubscribedNow();

        const handler = (change: TimeSeriesChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert()]);

        async function actAndAssert() {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            {
                const session = store.openSession();
                const user = new User();
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            let date = new Date();

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(date, 33);
                session.timeSeriesFor("users/1", "Likes")
                    .append(moment(date).clone().add(1, "minute").toDate(), 22);

                await session.saveChanges();
            }

            let timeSeriesChange = await changesList.poll(3_000);
            assertThat(timeSeriesChange)
                .isNotNull();

            assertThat(timeSeriesChange.documentId)
                .isEqualTo("users/1");
            assertThat(timeSeriesChange.type)
                .isEqualTo("Put");
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
            assertThat(timeSeriesChange.changeVector)
                .isNotNull();
            assertThat(timeSeriesChange.from.getTime())
                .isEqualTo(date.getTime());
            assertThat(timeSeriesChange.to.getTime())
                .isEqualTo(moment(date).clone().add(1, "minute").toDate().getTime());

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .delete(date, date);
                await session.saveChanges();
            }

            timeSeriesChange = await changesList.poll(3_000);

            assertThat(timeSeriesChange)
                .isNotNull();

            assertThat(timeSeriesChange.documentId)
                .isEqualTo("users/1");
            assertThat(timeSeriesChange.type)
                .isEqualTo("Delete");
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
            assertThat(timeSeriesChange.changeVector)
                .isNotNull();
            assertThat(timeSeriesChange.from.getTime())
                .isEqualTo(date.getTime());
            assertThat(timeSeriesChange.to.getTime())
                .isEqualTo(date.getTime());

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .delete();
                await session.saveChanges();
            }

            timeSeriesChange = await changesList.poll(3_000);

            assertThat(timeSeriesChange)
                .isNotNull();

            assertThat(timeSeriesChange.documentId)
                .isEqualTo("users/1");
            assertThat(timeSeriesChange.type)
                .isEqualTo("Delete");
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
            assertThat(timeSeriesChange.changeVector)
                .isNotNull();
            assertThat(timeSeriesChange.from)
                .isNull();
            assertThat(timeSeriesChange.to)
                .isNull();
        }
    });

    it("canSubscribeToTimeSeriesChanges", async () => {
        {
            const session = store.openSession();
            const user = new User();
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        const changesList = new AsyncQueue<TimeSeriesChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        let observable = changes.forAllTimeSeries();
        await observable.ensureSubscribedNow();

        const handler = (change: TimeSeriesChange) => changesList.push(change);

        const errPromise = new Promise((_, reject) => {
            observable.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, actAndAssert1()]);

        async function actAndAssert1() {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(new Date(), 33);
                await session.saveChanges();
            }

            const timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();
            assertThat(timeSeriesChange.collectionName)
                .isNotNull();
        }

        observable.off("data", handler);

        observable = changes.forTimeSeries("Likes");
        await observable.ensureSubscribedNow();

        await Promise.race([errPromise, actAndAssert2()]);

        async function actAndAssert2() {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(new Date(), 2);
                session.timeSeriesFor("users/1", "Dislikes")
                    .append(new Date(), 3);

                await session.saveChanges();
            }

            const timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
        }

        await assertThrows(async () => changesList.poll(1_000), err => {
            assertThat(err.name)
                .isEqualTo("TimeoutException");
        });

        observable.off("data", handler);

        observable = changes.forTimeSeriesOfDocument("users/1", "Likes");
        await observable.ensureSubscribedNow();

        await Promise.race([errPromise, actAndAssert3()]);

        async function actAndAssert3() {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(new Date(), 4);
                session.timeSeriesFor("users/1", "Dislikes")
                    .append(new Date(), 5);

                await session.saveChanges();
            }

            const timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();
            assertThat(timeSeriesChange.name)
                .isEqualTo("Likes");
        }

        observable.off("data", handler);

        await assertThrows(async () => changesList.poll(1_000), err => {
            assertThat(err.name)
                .isEqualTo("TimeoutException");
        });

        observable = changes.forTimeSeriesOfDocument("users/1");
        await observable.ensureSubscribedNow();

        await Promise.race([errPromise, actAndAssert4()]);

        async function actAndAssert4() {
            observable.on("data", handler);
            observable.on("error", e => throwError("InvalidOperationException", e.message));

            {
                const session = store.openSession();
                session.timeSeriesFor("users/1", "Likes")
                    .append(new Date(), 6);
                session.timeSeriesFor("users/1", "Dislikes")
                    .append(new Date(), 7);

                await session.saveChanges();
            }

            let timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();
            assertThat(timeSeriesChange.name === "Likes" || timeSeriesChange.name === "Dislikes")
                .isTrue();

            timeSeriesChange = await changesList.poll(1_000);
            assertThat(timeSeriesChange)
                .isNotNull();
            assertThat(timeSeriesChange.name === "Likes" || timeSeriesChange.name === "Dislikes")
                .isTrue();
        }
    });
});
