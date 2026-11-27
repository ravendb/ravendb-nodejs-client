import assert from "node:assert";
import { IDocumentStore, PatchCommandData, PatchRequest } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_13891", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("patched document should be replaced", async () => {
        let personId: string = null;
        const session = store.openSession();
        for (let i = 1; i < 3; i++) {
            const person = Object.assign(new Person(), {
                modifications: [Object.assign(new UserChange(), { id: `${i}`, timestamp: new Date() })]
            });
            await session.store(person);
            personId = person.id;
        }

        await session.saveChanges();

        session.advanced.defer(new PatchCommandData(personId, null, PatchRequest.forScript("this.text = 'aaa';"), null));

        const person1 = await session.load(personId, Person);
        assert.ok(!person1.text);
        assert.strictEqual(person1.modifications.length, 1);
        await session.saveChanges();

        const person2 = await session.load(personId, Person);
        assert.strictEqual(person2, person1);
        assert.strictEqual(person2.text, "aaa");
        assert.strictEqual(person2.modifications.length, 1);
    });
});

class UserChange {
    public id: string;
    public timestamp: Date;
}

class Person {
    public id: string;
    public text: string;
    public modifications: UserChange[];
}
