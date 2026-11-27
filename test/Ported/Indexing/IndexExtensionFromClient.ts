import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Person {
    public id: string;
    public name: string;
    public friends: string[];
}

class PeopleIndex1 extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from person in docs.People where PeopleUtil.Foo1(person.friends) select new { person.name }";
        this.additionalSources = {
            PeopleUtil: `
using System.Collections.Generic;
using System.Linq;
namespace ETIS
{
    public static class PeopleUtil
    {
        public static bool Foo1(List<string> friends)
        {
            return friends.Count(n => n != "ayende") > 1;
        }
    }
}
`
        };
    }
}

describe("IndexExtensionFromClient", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use method from extensions in index list", async () => {
        await store.executeIndex(new PeopleIndex1());

        {
            const session = store.openSession();
            await session.store(Object.assign(new Person(), {
                name: "aviv",
                friends: ["jerry", "bob", "ayende"]
            }));
            await session.store(Object.assign(new Person(), {
                name: "reeb",
                friends: ["david", "ayende"]
            }));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const person = await session.query({ indexName: new PeopleIndex1().getIndexName(), documentType: Person })
                .single();
            assertThat(person.name)
                .isEqualTo("aviv");
        }
    });
});
