import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class User {
    public id: string;
    public username: string;
}

function user(id: string, username: string) {
    const result = new User();
    result.id = id;
    result.username = username;
    return result;
}

describe("RavenDB9158", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeAndChangeByAnotherSession() {
        let changeVector: string;
        let id: string;

        {
            const session = store.openSession();
            const initial = user("Users/", "foo");
            await session.store(initial);
            await session.saveChanges();

            id = initial.id;
            changeVector = session.advanced.getChangeVectorFor(initial);
        }

        {
            const session = store.openSession();
            const changed = user(id, "bar");
            await session.store(changed);
            await session.saveChanges();

            const newChange = session.advanced.getChangeVectorFor(changed);

            assertThat(newChange).isNotEqualTo(changeVector);
        }

        return { id, changeVector };
    }

    it("raven should throw concurrency exception when using loaded entity and specific change vector", async () => {
        const { id, changeVector } = await storeAndChangeByAnotherSession();

        const session = store.openSession();
        const loaded = await session.load(id, User);
        loaded.username = "baz";

        await assertThrows(async () => {
            await session.store(loaded, id, { changeVector });
            await session.saveChanges();
        }, err => assertThat(err.name).isEqualTo("ConcurrencyException"));
    });

    it("raven should throw concurrency exception when using loaded entity from different session and specific change vector", async () => {
        const { id, changeVector } = await storeAndChangeByAnotherSession();

        const getUser = () => store.openSession().load(id, User);

        const session = store.openSession();
        const loaded = await getUser();
        loaded.username = "baz";

        await assertThrows(async () => {
            await session.store(loaded, id, { changeVector });
            await session.saveChanges();
        }, err => assertThat(err.name).isEqualTo("ConcurrencyException"));
    });
});
