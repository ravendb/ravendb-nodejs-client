import assert from "node:assert";
import { IDocumentStore, PatchCommandData, PatchRequest } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_6407", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("will preserver removed properties across saves", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), {
                email: "user@example.com",
                name: "Arava Eini"
            }), "users/1");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            session.advanced.defer(new PatchCommandData("users/1", null, PatchRequest.forScript(`
var parts= this.name.split(' ');
this.FirstName = parts[0];
this.LastName = parts[1];
`), null));
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1", User);
            user.votes++;
            await session.saveChanges();
        }

        const session = store.openSession();
        const users = await session.advanced.rawQuery("from Users where FirstName = 'Arava'", User)
            .waitForNonStaleResults()
            .count();
        assert.strictEqual(users, 1);
    });
});

class User {
    public name: string;
    public email: string;
    public votes = 0;
}
