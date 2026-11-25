import {
    ICommandData,
    IDocumentStore,
    JsonPatchCommandData,
    JsonPatchDocument,
    PatchCommandData,
    PatchRequest,
    ServerNode,
    SingleNodeBatchCommand
} from "../../../src/index.js";
import { HttpRequestParameters } from "../../../src/Primitives/Http.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestObj {
    public id: string;
    public name: string;
}

class TestSingleNodeBatchCommand extends SingleNodeBatchCommand {
    public createRequest(node: ServerNode): HttpRequestParameters {
        const request = super.createRequest(node);
        request.uri += "noreply=true";
        return request;
    }
}

describe("BatchCommandWithNoReplyFlagTest", function () {

    const userId = "users/1";
    const userValue = "SomeValue";

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function executeWithNoReply(command: ICommandData) {
        const session = store.openSession();
        await session.store(new TestObj(), userId);
        await session.saveChanges();

        await store.getRequestExecutor().execute(new TestSingleNodeBatchCommand(store.conventions, [command]));
    }

    async function assertUserName() {
        const session = store.openSession();
        const user = await session.load(userId, TestObj);
        assertThat(user.name).isEqualTo(userValue);
    }

    it("batch with no reply when patch should not fail", async () => {
        const patchRequest = PatchRequest.forScript("this.name = args.val_0;");
        patchRequest.values = { val_0: userValue };

        await executeWithNoReply(new PatchCommandData(userId, null, patchRequest, null));

        await assertUserName();
    });

    it("batch with no reply when json patch should not fail", async () => {
        const jsonPatch = new JsonPatchDocument().add("/name", userValue);

        await executeWithNoReply(new JsonPatchCommandData(userId, jsonPatch));

        await assertUserName();
    });
});
