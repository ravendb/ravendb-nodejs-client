import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("StronglyTypedJavaScriptIndexTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("compound group by", async () => {
        const u1 = new User();
        u1.firstName = "Joe";
        u1.lastName = "Doe";

        const u2 = new User();
        u2.firstName = "Joe";
        u2.lastName = "Doe";

        const u3 = new User();
        u3.firstName = "John";
        u3.firstName = "Kowalski";

        {
            const session = store.openSession();

            await session.store(u1);
            await session.store(u2);
            await session.store(u3);

            await session.saveChanges();
        }

        await new Users_CountByName().execute(store);
        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const results = await session.query<Users_CountByNameResult>({
                index: Users_CountByName
            })
                .whereEquals("count", 2)
                .all();

            assertThat(results)
                .hasSize(1);

            assertThat(results[0].count)
                .isEqualTo(2);

            assertThat(results[0].firstName)
                .isEqualTo("Joe");

            assertThat(results[0].lastName)
                .isEqualTo("Doe");
        }
    });
});

type Users_CountByNameResult = Pick<User, "firstName" | "lastName"> & { count: number };

// tslint:disable-next-line:class-name
class Users_CountByName extends AbstractJavaScriptIndexCreationTask<User, Users_CountByNameResult> {
    constructor() {
        super();

        this.map(User, u => {
            return {
                lastName: u.lastName,
                firstName: u.firstName,
                count: 1
            }
        });

        this.reduce(results => results
            .groupBy(x => ({ firstName: x.firstName, lastName: x.lastName })).aggregate(g => {
                return {
                    firstName: g.key.firstName,
                    lastName: g.key.lastName,
                    count: g.values.reduce((a, b) => a + b.count, 0)
                }
            }));
    }
}

class User {
    public firstName: string;
    public lastName: string;
}