import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB934", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("low level exports by doc", async () => {
        {
            const session = store.openSession();
            for (let i = 0; i < 1500; i++) {
                await session.store(new User());
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let count = 0;
            const stream = await session.advanced.stream<object>("");
            for await (const _ of stream) {
                count++;
            }
            assertThat(count).isEqualTo(1501);
        }
    });
});
