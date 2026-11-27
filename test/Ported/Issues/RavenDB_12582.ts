import assert from "node:assert";
import { IDocumentStore, PatchRequest } from "../../../src/index.js";
import { PatchCommand } from "../../../src/Documents/Operations/PatchOperation.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_12582", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("patch operation should receive complete information", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Alexander" }), "users/1");
            await session.saveChanges();

            const command = new PatchCommand(store.conventions, "users/1", null,
                PatchRequest.forScript(`this.name = "Sasha"`), null, false, true, false);

            await session.advanced.requestExecutor.execute(command);
            const result = command.result;
            assert.strictEqual(result.status, "Patched");
            assertThat(result.modifiedDocument).isNotNull();
            assert.strictEqual(result.modifiedDocument["name"], "Sasha");
            assertThat(result.debug).isNotNull();

            assertThat(result.lastModified).isNotNull();
            assertThat(result.changeVector).isNotNull();
            assertThat(result.changeVector.length).isGreaterThan(0);
            assert.strictEqual(result.collection, "Users");
        }

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Alexander" }), "users/1");
            await session.saveChanges();

            const command = new PatchCommand(store.conventions, "users/1", null,
                PatchRequest.forScript(`this.name = "Alexander"`), null, false, false, false);

            await session.advanced.requestExecutor.execute(command);
            const result = command.result;
            assert.strictEqual(result.status, "NotModified");
            assertThat(result.modifiedDocument).isNotNull();
            assert.strictEqual(result.debug ?? null, null);

            assert.strictEqual(result.changeVector ?? null, null);
            assert.strictEqual(result.collection ?? null, null);
            assert.strictEqual(result.lastModified, null);
        }
    });
});

class User {
    public name: string;
}
