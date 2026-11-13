import assert from "node:assert";
import {
    IDocumentStore,
    IOperationResult,
    StartSchemaValidationOperation,
    StartSchemaValidationParameters
} from "../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../Utils/AssertExtensions.js";

interface ValidateSchemaResult extends IOperationResult {
    errorCount: number;
    validatedCount: number;
    errors: Record<string, string>;
    lastEtag: number;
}

class User {
    public constructor(public age: number) {
    }
}

const userSchema = JSON.stringify({
    type: "object",
    properties: {
        age: {
            type: "integer",
            minimum: 21,
            maximum: 67
        }
    },
    required: ["age"]
});

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("StartSchemaValidationOperationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUsers(ages: Record<string, number>) {
        const session = store.openSession();
        for (const [id, age] of Object.entries(ages)) {
            await session.store(new User(age), id);
        }
        await session.saveChanges();
    }

    async function validate(parameters: Partial<StartSchemaValidationParameters> = {}) {
        const operation = await store.maintenance.send(new StartSchemaValidationOperation({
            schemaDefinition: userSchema,
            collection: "Users",
            ...parameters
        }));

        return operation.waitForCompletion<ValidateSchemaResult>(15_000);
    }

    it("reports the documents that do not match the schema", async () => {
        await storeUsers({ "Users/Young": 17, "Users/Adult": 30, "Users/Old": 80 });

        const result = await validate();

        assertThat(result.validatedCount).isEqualTo(3);
        assertThat(result.errorCount).isEqualTo(2);
        assert.deepStrictEqual(Object.keys(result.errors).sort(), ["Users/Old", "Users/Young"]);
        assertThat(result.errors["Users/Young"]).contains("age");
        assertThat(result.lastEtag).isGreaterThan(0);
    });

    it("reports no errors when every document matches", async () => {
        await storeUsers({ "users/1": 25, "users/2": 40 });

        const result = await validate();

        assertThat(result.validatedCount).isEqualTo(2);
        assertThat(result.errorCount).isEqualTo(0);
        assertThat(Object.keys(result.errors)).hasSize(0);
    });

    it("validates only the given collection", async () => {
        await storeUsers({ "users/1": 17 });

        const session = store.openSession();
        await session.store({ age: 5, "@metadata": { "@collection": "Orders" } }, "orders/1");
        await session.saveChanges();

        const result = await validate();

        assertThat(result.validatedCount).isEqualTo(1);
        assert.deepStrictEqual(Object.keys(result.errors), ["users/1"]);
    });

    it("stops after maxDocumentsToValidate and continues from startEtag", async () => {
        await storeUsers({ "users/1": 17, "users/2": 18, "users/3": 19 });

        const first = await validate({ maxDocumentsToValidate: 2 });

        assertThat(first.validatedCount).isEqualTo(2);
        assertThat(first.errorCount).isEqualTo(2);

        const rest = await validate({ startEtag: first.lastEtag + 1 });

        assertThat(rest.validatedCount).isEqualTo(1);
        assert.deepStrictEqual(Object.keys(rest.errors), ["users/3"]);
    });

    it("counts every error but keeps at most maxErrorMessages messages", async () => {
        await storeUsers({ "users/1": 17, "users/2": 18, "users/3": 19 });

        const result = await validate({ maxErrorMessages: 1 });

        assertThat(result.errorCount).isEqualTo(3);
        assertThat(Object.keys(result.errors)).hasSize(1);
    });

    it("rejects invalid parameters before sending", async () => {
        const invalid: [Partial<StartSchemaValidationParameters>, string][] = [
            [{ schemaDefinition: " " }, "InvalidArgumentException"],
            [{ collection: "" }, "InvalidArgumentException"],
            [{ maxErrorMessages: -1 }, "ArgumentOutOfRangeException"],
            [{ maxDocumentsToValidate: 0 }, "ArgumentOutOfRangeException"]
        ];

        for (const [parameters, errorName] of invalid) {
            await assertThrows(
                async () => new StartSchemaValidationOperation({
                    schemaDefinition: userSchema,
                    collection: "Users",
                    ...parameters
                }),
                err => assertThat(err.name).isEqualTo(errorName));
        }
    });
});
