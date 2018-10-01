import * as assert from "assert";
import {testContext, disposeTestDocumentStore} from "../Utils/TestUtil";

import {
    IDocumentStore,
    GetCompareExchangeValueOperation,
    PutCompareExchangeValueOperation,
    GetCompareExchangeValuesOperation,
    DeleteCompareExchangeValueOperation,
    CompareExchangeResult,
} from "../../src";
import {User} from "../Assets/Entities";

describe("UniqueValuesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canReadNotExistingKey", async () => {
        const res = await store.operations.send(new GetCompareExchangeValueOperation("test"));
        assert.ok(!res);
    });

    it("canWorkWithPrimitiveTypes", async () => {
        let res = await store.operations
            .send(new GetCompareExchangeValueOperation<number>("test"));

        assert.ok(!res);

        await store.operations.send(new PutCompareExchangeValueOperation("test", 5, 0));

        res = await store.operations
            .send(new GetCompareExchangeValueOperation<number>("test"));

        assert.ok(res);
        assert.strictEqual(res.value, 5);
    });

    it("canPutUniqueString", async () => {
        await store.operations.send(new PutCompareExchangeValueOperation<string>("test", "Karmel", 0));
        const res = await store.operations.send(new GetCompareExchangeValueOperation<string>("test"));
        assert.strictEqual(res.value, "Karmel");
    });

    it("canPutMultiDifferentValues", async () => {
        const user1 = new User();
        user1.name = "Karmel";

        const res = await store.operations
            .send(new PutCompareExchangeValueOperation<User>("test", user1, 0));

        const user2 = new User();
        user2.name = "Karmel";

        const res2 = await store.operations
            .send(new PutCompareExchangeValueOperation<User>("test2", user2, 0));

        assert.strictEqual(res.value.name, "Karmel");
        assert.ok(res.successful);

        assert.strictEqual(res2.value.name, "Karmel");
        assert.ok(res2.successful);
    });

    it("canListCompareExchange", async () => {

        const user1 = new User();
        user1.name = "Karmel";

        const res = await store.operations
            .send(new PutCompareExchangeValueOperation<User>("test", user1, 0));

        const user2 = new User();
        user2.name = "Karmel";

        const res2 = await store.operations
            .send(new PutCompareExchangeValueOperation<User>("test2", user2, 0));

        assert.strictEqual(res.value.name, "Karmel");
        assert.ok(res.successful);

        assert.strictEqual(res2.value.name, "Karmel");
        assert.ok(res2.successful);

        const values = await store.operations.send(new GetCompareExchangeValuesOperation<User>({
            startWith: "test",
            clazz: User
        }));
        assert.strictEqual(Object.keys(values).length, 2);
        assert.strictEqual(values["test"].value.constructor, User);
        assert.strictEqual(values["test"].value.name, "Karmel");
        assert.strictEqual(values["test2"].value.name, "Karmel");
    });

    it("canRemoveUnique", async () => {
        let res = await store.operations.send(new PutCompareExchangeValueOperation<string>("test", "Karmel", 0));

        assert.strictEqual(res.value, "Karmel");
        assert.ok(res.successful);

        res = await store.operations.send(new DeleteCompareExchangeValueOperation<string>("test", res.index));
        assert.ok(res.successful);
    });

    it("removeUniqueFailed", async () => {
        let res = await store.operations.send(new PutCompareExchangeValueOperation<string>("test", "Karmel", 0));
        assert.strictEqual(res.value, "Karmel");
        assert.ok(res.successful);

        res = await store.operations.send(new DeleteCompareExchangeValueOperation<string>("test", 0));
        assert.strictEqual(res.constructor, CompareExchangeResult);
        assert.ok(res.index);
        assert.strictEqual(res.value, "Karmel");
        assert.ok(!res.successful);

        const readValue = await store.operations.send(new GetCompareExchangeValueOperation<string>("test"));
        assert.strictEqual(readValue.value, "Karmel");
    });

    it("returnCurrentValueWhenPuttingConcurrently", async () => {
        const user = new User();
        user.name = "Karmel";

        const user2 = new User();
        user2.name = "Karmel2";

        const res = await store.operations.send(new PutCompareExchangeValueOperation<User>("test", user, 0));
        let res2 = await store.operations.send(new PutCompareExchangeValueOperation<User>("test", user2, 0));

        assert.ok(res.successful);
        assert.ok(!res2.successful);
        assert.strictEqual(res.value.constructor, User);
        assert.strictEqual(res2.value.constructor, User);
        assert.strictEqual(res.value.name, "Karmel");
        assert.strictEqual(res2.value.name, "Karmel");

        const user3 = new User();
        user3.name = "Karmel2";

        res2 = await store.operations.send(
            new PutCompareExchangeValueOperation<User>("test", user3, res2.index));
        assert.ok(res2.successful);
        assert.strictEqual(res2.value.name, "Karmel2");
    });

    it("canGetIndexValue", async () => {
        const user = new User();
        user.name = "Karmel";

        await store.operations.send(new PutCompareExchangeValueOperation<User>("test", user, 0));
        const res = await store.operations.send(new GetCompareExchangeValueOperation<User>("test", User));

        assert.strictEqual(res.value.name, "Karmel");

        const user2 = new User();
        user2.name = "Karmel2";

        const res2 = await store.operations.send(new PutCompareExchangeValueOperation<User>("test", user2, res.index));
        assert.ok(res2.successful);

        assert.strictEqual(res2.value.name, "Karmel2");
    });
});
