import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import moment = require("moment");

describe("AddOrPatchTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canAddOrPatch", async () => {
        const id = "users/1";

        {
            const session = store.openSession();
            const user = new User();
            user.firstName = "Hibernating";
            user.lastName = "Rhinos";
            user.lastLogin = new Date();
            await session.store(user, id);
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

        {
            const session = store.openSession();
            const newUser = new User();
            newUser.firstName = "Hibernating";
            newUser.lastName = "Rhinos";
            newUser.lastLogin = new Date();

            const newDate = moment().startOf("day").set({ year: 1993 }).toDate();

            session.advanced.addOrPatch(id, newUser, "lastLogin", newDate);
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            await session.delete(id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const newUser = new User();
            newUser.firstName = "Hibernating";
            newUser.lastName = "Rhinos";
            newUser.lastLogin = new Date(0);

            const newDate = moment().startOf("day").set({ year: 1993 }).toDate();

            session.advanced.addOrPatch(id, newUser, "lastLogin", newDate);
            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const user = await session.load(id, User);
            assertThat(user.firstName)
                .isEqualTo("Hibernating");
            assertThat(user.lastName)
                .isEqualTo("Rhinos");
            assertThat(user.lastLogin.getTime())
                .isEqualTo(new Date(0).getTime());
        }
    });

    it("canAddOrPatchAddItemToAnExistingArray", async function () {
        const id = "users/1";

        {
            const session = store.openSession();
            const user = new User();
            user.firstName = "Hibernating";
            user.lastName = "Rhinos";

            const d2000 = moment().startOf("day").set({ year: 2000 }).toDate();

            user.loginTimes = [ d2000 ];
            await session.store(user, id);
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

        {
            const session = store.openSession();
            const newUser = new User();
            newUser.firstName = "Hibernating";
            newUser.lastName = "Rhinos";
            newUser.loginTimes = [new Date()];

            const d1993 = moment().startOf("day").set({ year: 1993 }).toDate();
            const d2000 = moment().startOf("day").set({ year: 2000 }).toDate();

            session.advanced.addOrPatchArray(id, newUser, "loginTimes", u => u.push(d1993, d2000));

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const user = await session.load(id, User);
            assertThat(user.loginTimes)
                .hasSize(3);

            await session.delete(id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const now = new Date();

            const newUser = new User();
            newUser.lastName = "Hibernating";
            newUser.firstName = "Rhinos";
            newUser.lastLogin = now;

            const d1993 = moment().startOf("day").set({ year: 1993 }).toDate();

            session.advanced.addOrPatch(id, newUser, "lastLogin", d1993);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const user = await session.load(id, User);
            assertThat(user.lastName)
                .isEqualTo("Hibernating");
            assertThat(user.firstName)
                .isEqualTo("Rhinos");
            assertThat(user.lastLogin.getTime())
                .isEqualTo(now.getTime());
        }
    });

    it("canAddOrPatchIncrement", async function () {
        const id = "users/1";

        {
            const session = store.openSession();
            const newUser = new User();
            newUser.firstName = "Hibernating";
            newUser.lastName = "Rhinos";
            newUser.loginCount = 1;

            await session.store(newUser, id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const newUser = new User();
            newUser.firstName = "Hibernating";
            newUser.lastName = "Rhinos";
            session.advanced.addOrIncrement(id, newUser, "loginCount", 3);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const user = await session.load(id, User);
            assertThat(user.loginCount)
                .isEqualTo(4);

            await session.delete(id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const newUser = new User();
            newUser.firstName = "Hibernating";
            newUser.lastName = "Rhinos";
            newUser.lastLogin = new Date(0);

            const d1993 = moment().startOf("day").set({ year: 1993 }).toDate();

            session.advanced.addOrPatch(id, newUser, "lastLogin", d1993);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const user = await session.load(id, User);
            assertThat(user.firstName)
                .isEqualTo("Hibernating");
            assertThat(user.lastName)
                .isEqualTo("Rhinos");
            assertThat(user.lastLogin.getTime())
                .isEqualTo(new Date(0).getTime());
        }
    });
});

class User {
    public lastLogin: Date;
    public firstName: string;
    public lastName: string;
    public loginTimes: Date[];
    public loginCount: number;
}