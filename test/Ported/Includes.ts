import { IDocumentStore } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";
import { User } from "../Assets/Entities.js";

class IdClass {
    public userId: string;
}

class Dictionary {
    public id: string;
    public dictionaryByUserId: Record<string, IdClass>;
}

class KeyValueDictionary {
    public id: string;
    public dictionaryByUserId: Record<string, string>;
}

const userId1 = "users/1";
const userId2 = "users/2";

describe("Includes", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeUsersAnd(test: Dictionary | KeyValueDictionary): Promise<string> {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "name1", age: 1 }), userId1);
        await session.store(Object.assign(new User(), { name: "name2", age: 1 }), userId2);
        await session.store(test);
        await session.saveChanges();
        return test.id;
    }

    async function assertIncludeLoadsUsersInOneRequest<T extends object>(clazz: new () => T, path: string, testId: string) {
        const session = store.openSession();
        const test = await session.include(path).load(testId, clazz);

        assertThat(test).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        await session.load(userId1, User);
        await session.load(userId2, User);

        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
    }

    function idClass(userId: string): IdClass {
        return Object.assign(new IdClass(), { userId });
    }

    it("can include nested dictionary values property", async () => {
        const testId = await storeUsersAnd(Object.assign(new Dictionary(), {
            dictionaryByUserId: { [userId1]: idClass(userId1), [userId2]: idClass(userId2) }
        }));

        await assertIncludeLoadsUsersInOneRequest(Dictionary, "dictionaryByUserId[].userId", testId);
        await assertIncludeLoadsUsersInOneRequest(Dictionary, "dictionaryByUserId.$Values[].userId", testId);
    });

    it("can include nested dictionary keys property", async () => {
        const testId = await storeUsersAnd(Object.assign(new Dictionary(), {
            dictionaryByUserId: { [userId1]: idClass(userId1), [userId2]: idClass(userId2) }
        }));

        await assertIncludeLoadsUsersInOneRequest(Dictionary, "dictionaryByUserId.$Keys", testId);
        await assertIncludeLoadsUsersInOneRequest(Dictionary, "dictionaryByUserId.$Keys", testId);
    });

    it("can include dictionary key and value properties", async () => {
        const testId = await storeUsersAnd(Object.assign(new KeyValueDictionary(), {
            dictionaryByUserId: { [userId1]: userId1, [userId2]: userId2 }
        }));

        await assertIncludeLoadsUsersInOneRequest(KeyValueDictionary, "dictionaryByUserId[].$Key", testId);
        await assertIncludeLoadsUsersInOneRequest(KeyValueDictionary, "dictionaryByUserId[].$Value", testId);
    });
});
