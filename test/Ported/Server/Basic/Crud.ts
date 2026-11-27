import { IDocumentStore, PutDocumentCommand } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

describe("Crud", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can overwrite document with smaller value", async () => {
        const requestExecutor = store.getRequestExecutor();

        await requestExecutor.execute(new PutDocumentCommand("users/1", null, {
            Name: "Fitzchak",
            LastName: "Very big value here, so can reproduce the issue",
            "@metadata": {
                SomeMoreData: "Make this object bigger",
                SomeMoreData2: "Make this object bigger",
                SomeMoreData3: "Make this object bigger"
            }
        }));

        await requestExecutor.execute(new PutDocumentCommand("users/1", null, { Name: "Fitzchak" }));

        const session = store.openSession();
        const user = await session.load<{ Name: string, LastName?: string }>("users/1");
        assertThat(user.Name).isEqualTo("Fitzchak");
        assertThat(user.LastName).isUndefined();
    });
});
