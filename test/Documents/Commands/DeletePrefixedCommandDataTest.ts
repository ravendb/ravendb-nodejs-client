import assert from "node:assert";
import { DeletePrefixedCommandData, DocumentConventions, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";

describe("DeletePrefixedCommandData", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("serializes as a prefixed delete", () => {
        assert.deepStrictEqual(new DeletePrefixedCommandData("users/").serialize(new DocumentConventions()), {
            Id: "users/",
            ChangeVector: undefined,
            Type: "DELETE",
            Document: undefined,
            IdPrefixed: true
        });
    });

    it("deletes every document whose id starts with the prefix", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "John" }), "users/1");
            await session.store(Object.assign(new User(), { name: "Jane" }), "users/2");
            await session.store(Object.assign(new User(), { name: "Bob" }), "users-archive/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.defer(new DeletePrefixedCommandData("users/"));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const users = await session.load<User>(["users/1", "users/2", "users-archive/1"]);
            assert.strictEqual(users["users/1"], null);
            assert.strictEqual(users["users/2"], null);
            assert.strictEqual(users["users-archive/1"].name, "Bob");
        }
    });
});
