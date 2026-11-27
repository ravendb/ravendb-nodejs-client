import { IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_5968", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("etag null should override document", async () => {
        for (const name of ["name1", "name2"]) {
            const session = store.openSession();
            const user = new User();
            user.name = name;
            await session.store(user, "users/1", { changeVector: null });
            await session.saveChanges();
        }
    });

    it("etag null should override document put", async () => {
        const executor = store.getRequestExecutor();
        await executor.execute(new PutDocumentCommand("users/1", null, { name: "Value1" }));
        await executor.execute(new PutDocumentCommand("users/1", null, { name: "Value2" }));

        const session = store.openSession();
        const user = await session.load("users/1", User);
        assertThat(user.name).isEqualTo("Value2");
    });
});
