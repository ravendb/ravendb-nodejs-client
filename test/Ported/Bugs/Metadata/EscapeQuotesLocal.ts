import { IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class User {
    public id: string;
    public name: string;
    public partnerId: string;
    public email: string;
    public tags: string[];
    public age: number;
    public active: boolean;
}

describe("EscapeQuotesLocal", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeAndReadFooMetadata(value: string): Promise<string> {
        {
            const session = store.openSession();
            const user = new User();
            await session.store(user);
            session.advanced.getMetadataFor(user)["Foo"] = value;
            await session.saveChanges();
        }

        const session = store.openSession();
        const user = await session.load("users/1-A", User);
        return session.advanced.getMetadataFor(user)["Foo"];
    }

    it("can properly escape quotes in metadata local 1", async () => {
        assertThat(await storeAndReadFooMetadata("\"Bar\"")).isEqualTo("\"Bar\"");
    });

    it("can properly escape quotes in metadata local 2", async () => {
        assertThat(await storeAndReadFooMetadata("\\\"Bar\\\"")).isEqualTo("\\\"Bar\\\"");
    });
});
