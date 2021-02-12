import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore, DocumentChange,
} from "../../../src";
import { User } from "../../Assets/Entities";
import { AsyncQueue } from "../../Utils/AsyncQueue";
import { throwError } from "../../../src/Exceptions";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RDBC_435", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can handle data/errors on/off", async () => {

        const createUser = async () => {
            const session = store.openSession();
            const user1 = new User();
            user1.age = 5;
            await session.store(user1);
            await session.saveChanges();

            return user1.id;
        }

        const changesList = new AsyncQueue<DocumentChange>();

        const changes = store.changes();
        await changes.ensureConnectedNow();

        const observable = changes.forDocumentsInCollection("users");
        await observable.ensureSubscribedNow();

        const handler = (change: DocumentChange) => changesList.push(change);

        const errorHandler = e => throwError("InvalidOperationException", e.message);

        observable.on("data", handler);
        observable.on("error", errorHandler);

        const user1Id = await createUser();

        const change1 = await changesList.poll(15_000);
        assertThat(change1)
            .isNotNull();
        assertThat(change1.id)
            .isEqualTo(user1Id);

        // now disable error handler, create next user and wait for change
        observable.off("error", errorHandler);

        const user2Id = await createUser();

        const change2 = await changesList.poll(15_000);
        assertThat(change2)
            .isNotNull();
        assertThat(change2.id)
            .isEqualTo(user2Id);

        // disable data handle - not we shouldn't get any data

        observable.off("data", handler);
        await createUser();

        await assertThrows(async () => changesList.poll(3_000), err => {
            assertThat(err.name)
                .isEqualTo("TimeoutException");
        });
    });
});
