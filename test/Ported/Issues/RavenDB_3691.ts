import { IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_3691", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can put document with metadata property being null", async () => {
        await store.getRequestExecutor().execute(new PutDocumentCommand("test", null, { "@metadata": { Foo: null } }));
    });
});
