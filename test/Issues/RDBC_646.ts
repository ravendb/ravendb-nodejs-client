import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractJavaScriptIndexCreationTask, IndexDefinitionHelper,
} from "../../src";
import { assertThat } from "../Utils/AssertExtensions";

enum RoleString {
    Admin = "admin",
    User = "user"
}

enum RoleNumber {
    Admin,
    User
}

class User {
    id: string;
    name: string;
    roleString: RoleString;
    roleNumber: RoleNumber;
}

class UsersByStringRole extends AbstractJavaScriptIndexCreationTask<User, Pick<User, "name" | "roleString">> {

    constructor() {
        super();

        this.registerEnum(() => (RoleString.Admin));

        this.map(User, u => {
            if (u.roleString === RoleString.Admin) {
                return ({
                    name: u.name,
                    roleString: u.roleString
                });
            }
            return null;
        });
    }
}

class UsersByNumberRole extends AbstractJavaScriptIndexCreationTask<User, Pick<User, "name" | "roleNumber">> {

    constructor() {
        super();

        this.registerEnum(() => RoleNumber.Admin);

        this.map(User, u => {
            if (u.roleNumber === RoleNumber.Admin) {
                return ({
                    name: u.name,
                    roleNumber: u.roleNumber
                });
            }
            return null;
        });
    }
}

describe("RDBC-646", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("can handle enums in strongly typed indexes", function () {
        it("can handle string enums", async () => {
            await prepareUsers(store);

            await store.executeIndex(new UsersByStringRole());

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();
                const admins = await session.query(User, UsersByStringRole)
                    .whereEquals("roleString", RoleString.Admin)
                    .all();

                assertThat(admins)
                    .hasSize(1);
            }
        });

        it("can handle number enums", async () => {
            await prepareUsers(store);

            await store.executeIndex(new UsersByNumberRole());

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();
                const admins = await session.query(User, UsersByNumberRole)
                    .whereEquals("roleNumber", RoleNumber.Admin)
                    .all();

                assertThat(admins)
                    .hasSize(1);
            }
        });

    });

    describe("can extract enum notation", function () {
        it("can handle arrow function - with namespace prefix", () => {
            assertThat(IndexDefinitionHelper.extractEnumNotation("() => core_1.UserRole.Admin"))
                .isEqualTo("core_1.UserRole.Admin");
        });

        it("can handle arrow function - w/o namespace prefix", () => {
            assertThat(IndexDefinitionHelper.extractEnumNotation("() => UserRole.Admin"))
                .isEqualTo("UserRole.Admin");
        });

        it("can handle arrow function - with () and namespace prefix", () => {
            assertThat(IndexDefinitionHelper.extractEnumNotation("() => (core_1.UserRole.Admin)"))
                .isEqualTo("core_1.UserRole.Admin");
        });

        it("can handle arrow function - with () w/o namespace prefix", () => {
            assertThat(IndexDefinitionHelper.extractEnumNotation("() => (UserRole.Admin)"))
                .isEqualTo("UserRole.Admin");
        });

        it("can handle anonymous function - with () and namespace prefix", () => {
            assertThat(IndexDefinitionHelper.extractEnumNotation("function () { return core_1.UserRole.Admin; }"))
                .isEqualTo("core_1.UserRole.Admin");
            assertThat(IndexDefinitionHelper.extractEnumNotation("function () { return core_1.UserRole.Admin }"))
                .isEqualTo("core_1.UserRole.Admin");
            assertThat(IndexDefinitionHelper.extractEnumNotation(`function () { 
                return core_1.UserRole.Admin 
            }
            `))
                .isEqualTo("core_1.UserRole.Admin");
        });

        it("can handle anonymous function - with () w/o namespace prefix", () => {
            assertThat(IndexDefinitionHelper.extractEnumNotation("function () { return UserRole.Admin; }"))
                .isEqualTo("UserRole.Admin");
            assertThat(IndexDefinitionHelper.extractEnumNotation("function () { return UserRole.Admin }"))
                .isEqualTo("UserRole.Admin");
            assertThat(IndexDefinitionHelper.extractEnumNotation(`function () { 
                return UserRole.Admin 
            }`))
                .isEqualTo("UserRole.Admin");
        });
    });
});

async function prepareUsers(store: IDocumentStore) {
    const admin = new User();
    admin.name = "admin1";
    admin.roleNumber = RoleNumber.Admin;
    admin.roleString = RoleString.Admin;

    const user = new User();
    user.name = "user1";
    user.roleNumber = RoleNumber.User;
    user.roleString = RoleString.User;

    {
        const session = store.openSession();
        await session.store(admin);
        await session.store(user);

        await session.saveChanges();
    }
}
