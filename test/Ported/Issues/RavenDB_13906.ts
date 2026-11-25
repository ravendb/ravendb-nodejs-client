import { IDocumentStore, PatchByQueryOperation } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

type Status = "None" | "Good" | "Bad";

class User {
    public name: string;
    public status: Status;
}

describe("RavenDB_13906", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("on after save changes on patch should work", async () => {
        let condition = false;
        let id: string;
        {
            const session = store.openSession();
            const entity = Object.assign(new User(), { name: "Egor", status: "Bad" });
            await session.store(entity);
            await session.saveChanges();
            id = session.advanced.getDocumentId(entity);
        }

        const expected: Status = "Good";
        {
            const session = store.openSession();
            session.advanced.on("afterSaveChanges", () => condition = true);
            const user = await session.load(id, User);
            session.advanced.patch(user, "status", expected);
            await session.saveChanges();

            assertThat(condition).isTrue();
            assertThat((await session.load(id, User)).status).isEqualTo(expected);
        }

        condition = false;

        {
            const session = store.openSession();
            session.advanced.on("afterSaveChanges", () => condition = true);
            const operation = await store.operations.send(new PatchByQueryOperation("from Users update { this.name = this.name + '_J'; }"));
            await operation.waitForCompletion();
            await session.saveChanges();

            assertThat(condition).isFalse();
            assertThat((await session.load(id, User)).name).isEqualTo("Egor_J");
        }
    });
});
