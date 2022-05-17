import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_17041Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can_Include_Secondary_Level_With_Alias", async () => {
        const userIndex = new UserIndex();
        await userIndex.execute(store);

        {
            const session = store.openSession();
            const role1 = new RoleData();
            role1.name = "admin";
            role1.role = "role/1";

            const role2 = new RoleData();
            role2.name = "developer";
            role2.role = "role/2";

            const roles = [role1, role2];

            const user = new User();
            user.firstName = "Rhinos";
            user.lastName = "Hiber";
            user.roles = roles;

            await session.store(role1, role1.role);
            await session.store(role2, role2.role);
            await session.store(user);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = "from index 'UserIndex' as u " +
                "select { firstName : u.firstName, " +
                "lastName : u.lastName, " +
                "roles : u.roles.map(function(r){return {role:r.role};}) } " +
                "include 'u.roles[].role'";

            const users = await session.advanced.rawQuery(query, User)
                .all();

            assertThat(users)
                .hasSize(1);

            let loaded = await session.load("role/1", RoleData);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(loaded.role)
                .isEqualTo("role/1");

            loaded = await session.load("role/2", RoleData);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(loaded.role)
                .isEqualTo("role/2");
        }
    });
});


class UserIndex extends AbstractJavaScriptIndexCreationTask<User> {

    constructor() {
        super();

        this.map("Users", u => ({
            firstName: u.firstName,
            lastName: u.lastName,
            roles: u.roles
        }));
    }
}


class RoleData {
    name: string;
    role: string;
}

class User {
    firstName: string;
    lastName: string;
    roles: RoleData[];
}
