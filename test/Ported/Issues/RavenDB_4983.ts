import { randomUUID } from "node:crypto";
import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class IdObject {
    public id: string = randomUUID();
}

class User extends IdObject {
    public name: string;
    public userRoles: string[];
}

class UserRole extends IdObject {
    public name: string;
}

describe("RavenDB_4983", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function prepareDatabase(): Promise<User> {
        const user = new User();
        user.name = "Filipp";

        const session = store.openSession();
        await session.store(user);
        await session.saveChanges();

        return user;
    }

    it("should load user with includes from session twice in embedded document store", async () => {
        const administrator = new UserRole();
        administrator.name = "Administrator";
        const staff = new UserRole();
        staff.name = "Staff";
        const userRoles = [administrator, staff];
        const keys = userRoles.map(q => q.id);

        const user = new User();
        user.name = "Filipp";
        user.userRoles = keys;

        {
            const session = store.openSession();
            await session.store(user);
            for (const userRole of userRoles) {
                await session.store(userRole);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const userFromDb = await session.include("userRoles").load<User>(user.id);

            assertThat(userFromDb).isNotNull();

            for (const key of keys) {
                assertThat(session.advanced.isLoaded(key)).isTrue();
            }

            const userRolesFromDb = await session.load<UserRole>(userFromDb.userRoles);

            for (const userRole of Object.values(userRolesFromDb)) {
                assertThat(userRole).isNotNull();
                assertThat(userRole.name).isEqualTo(userRoles.find(q => q.id === userRole.id).name);
            }
        }
    });

    it("should load user from session twice in embedded document store", async () => {
        const user = await prepareDatabase();

        const session = store.openSession();
        const userA = await session.load<User>(user.id);
        const userB = await session.load<User>(user.id);

        assertThat(session.advanced.isLoaded(user.id)).isTrue();
        assertThat(userA).isNotNull();
        assertThat(userA.name).isEqualTo(user.name);
        assertThat(userA).isSameAs(userB);
    });

    it("should lazy load user from session twice in embedded document store", async () => {
        const user = await prepareDatabase();

        const session = store.openSession();
        const lazyUserA = session.advanced.lazily.load<User>(user.id);
        const lazyUserB = session.advanced.lazily.load<User>(user.id);

        await session.advanced.eagerly.executeAllPendingLazyOperations();

        const userA = await lazyUserA.getValue();
        const userB = await lazyUserB.getValue();

        assertThat(session.advanced.isLoaded(user.id)).isTrue();
        assertThat(userA).isNotNull();
        assertThat(userA.name).isEqualTo(user.name);
        assertThat(userA).isSameAs(userB);

        const lazyUserC = session.advanced.lazily.load<User>(user.id);
        const userC = await lazyUserC.getValue();

        assertThat(userC).isNotNull();
    });
});
