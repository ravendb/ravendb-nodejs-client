import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB1019", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("stream docs should work", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Test" }));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const enumerator = await session.advanced.stream<object>("");

            let count = 0;
            for await (const _ of enumerator) {
                count++;
            }

            assertThat(count).isEqualTo(2);
        }
    });
});
