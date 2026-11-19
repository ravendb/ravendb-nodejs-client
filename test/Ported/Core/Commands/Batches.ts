import {
    DeleteCommandData,
    GetDocumentsCommand,
    IDocumentStore,
    PatchCommandData,
    PatchRequest,
    PutCommandDataBase,
    SingleNodeBatchCommand
} from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { User } from "../../../Assets/Entities.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

describe("Batches", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function nameUpdate(id: string) {
        return new PatchCommandData(id, null, PatchRequest.forScript("this.name = 'Nhoj';"));
    }

    it("can do batch operations", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "John" }));
            await session.store(Object.assign(new User(), { name: "Dave" }));
            await session.saveChanges();
        }

        const executor = store.getRequestExecutor();
        await executor.execute(new SingleNodeBatchCommand(store.conventions, [
            new PutCommandDataBase("users/3", null, null, { name: "James" }),
            nameUpdate("users/1-A"),
            new DeleteCommandData("users/2-A", null)
        ]));

        const getCommand = new GetDocumentsCommand({
            ids: ["users/1-A", "users/2-A", "users/3"],
            conventions: store.conventions
        });
        await executor.execute(getCommand);
        const results = getCommand.result.results;

        assertThat(results).hasSize(3);

        const [user1, user2, user3] = results;
        assertThat(user1).isNotNull();
        assertThat(user2).isNull();
        assertThat(user3).isNotNull();

        assertThat(user1.name).isEqualTo("Nhoj");
        assertThat(user3.name).isEqualTo("James");
    });

    it("can do batch operations with batch identity request", async () => {
        const executor = store.getRequestExecutor();
        await executor.execute(new SingleNodeBatchCommand(store.conventions, [
            new PutCommandDataBase("users|", null, null, { name: "James1" }),
            new PutCommandDataBase("users|", null, null, { name: "James2" }),
            new PutCommandDataBase("users/123", null, null, { name: "James123" }),
            nameUpdate("users/1-A"),
            new DeleteCommandData("users/2-A", null),
            new PutCommandDataBase("users|", null, null, { name: "James3" }),
            new PutCommandDataBase("users|", null, null, { name: "James4" })
        ]));

        const getCommand = new GetDocumentsCommand({ start: 0, pageSize: 25, conventions: store.conventions });
        await executor.execute(getCommand);

        assertThat(getCommand.result.results).hasSize(5);

        const session = store.openSession();
        const user1 = await session.load("users/1", User);
        const user2 = await session.load("users/2", User);
        const user3 = await session.load("users/3", User);
        const user4 = await session.load("users/4", User);
        const user123 = await session.load("users/123", User);

        assertThat(user1.name).isEqualTo("James1");
        assertThat(user2.name).isEqualTo("James2");
        assertThat(user3.name).isEqualTo("James3");
        assertThat(user4.name).isEqualTo("James4");
        assertThat(user123.name).isEqualTo("James123");
    });
});
