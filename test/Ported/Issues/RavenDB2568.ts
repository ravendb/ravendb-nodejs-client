import { IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB2568", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function putUsers() {
        const executor = store.getRequestExecutor();
        for (const id of ["users/01", "users/02", "users/03", "users/10", "users/12"]) {
            await executor.execute(new PutDocumentCommand(id, null, {}));
        }
    }

    it("simple skip after", async () => {
        await putUsers();

        const session = store.openSession();
        const results = await session.advanced.loadStartingWith("users/", { startAfter: "users/02" });
        assertThat(results).hasSize(3);
        assertThat(session.advanced.getDocumentId(results[0])).isEqualTo("users/03");
        assertThat(session.advanced.getDocumentId(results[1])).isEqualTo("users/10");
        assertThat(session.advanced.getDocumentId(results[2])).isEqualTo("users/12");
    });

    it("streaming skip after", async () => {
        await putUsers();

        const session = store.openSession();
        const results = await session.advanced.stream("users/", { startAfter: "users/02" });

        const ids: string[] = [];
        for await (const result of results) {
            ids.push(result.id);
        }

        assertThat(ids.join(",")).isEqualTo("users/03,users/10,users/12");
    });
});
