import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_21859", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("load and lazy load should return null when id is null", async () => {
        const session = store.openSession();

        assertThat(await session.load<object>(null as string)).isNull();

        assertThat(await session.advanced.lazily.load<object>(null as string).getValue()).isNull();
    });
});
