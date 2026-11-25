import assert from "node:assert";
import { IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";

class User {
    public id: string;
    public name: string;
    public partnerId: string;
    public email: string;
    public tags: string[];
    public age: number;
    public active: boolean;
}

describe("LastModifiedLocal", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can access last modified as metadata", async () => {
        let before: number;
        let after: number;

        {
            const session = store.openSession();
            await session.store(new User());

            before = Date.now();
            await session.saveChanges();
            after = Date.now();
        }

        const session = store.openSession();
        const user = await session.load("users/1-A", User);
        const lastModified = new Date(session.advanced.getMetadataFor(user)["@last-modified"]).getTime();

        assert.ok(!Number.isNaN(lastModified));
        assert.ok(lastModified >= before && lastModified <= after, `${lastModified} not in [${before}, ${after}]`);
    });
});
