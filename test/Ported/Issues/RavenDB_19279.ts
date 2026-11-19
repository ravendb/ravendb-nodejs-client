import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_19279", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUsers(session: ReturnType<IDocumentStore["openSession"]>) {
        const users = ["User 1", "User 2", "User 3"].map(name => Object.assign(new User(), { name }));
        for (const user of users) {
            await session.store(user, "users/");
        }
        return users;
    }

    it("saving attachment in wrong document when store docs and attachment in same request", async () => {
        const session = store.openSession();
        const [user, user2] = await storeUsers(session);

        session.advanced.attachments.store(user, "foo", Buffer.from([1, 2, 3]));
        session.advanced.attachments.store(user2, "foo2", Buffer.from([1, 2, 3, 4]));

        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name)
                .isEqualTo("DocumentDoesNotExistException");
        });
    });

    it("saving counters in wrong document when store docs and attachment in same request", async () => {
        const session = store.openSession();
        const [user, user2] = await storeUsers(session);

        session.countersFor(user).increment("HeartRate", 1);
        session.countersFor(user2).increment("HeartRate", 1);

        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name)
                .isEqualTo("DocumentDoesNotExistException");
        });
    });
});
