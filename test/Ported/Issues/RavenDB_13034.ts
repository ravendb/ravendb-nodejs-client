import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { IDocumentStore } from "../../../src";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_13034", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("exploringConcurrencyBehavior", async () => {
        {
            const s1 = store.openSession();

            const user = Object.assign(new User(), {
                name: "Nick",
                age: 99
            });

            await s1.store(user, "users/1-A");
            await s1.saveChanges();
        }

        {
            const s2 = store.openSession();
            s2.advanced.useOptimisticConcurrency = true;

            const u2 = await s2.load<User>("users/1-A", User);

            {
                const s3 = store.openSession();
                const u3 = await s3.load<User>("users/1-A", User);
                assertThat(u2)
                    .isNotEqualTo(u3);

                u3.age = u3.age - 1;

                await s3.saveChanges();
            }

            u2.age++;

            const u2_2 = await s2.load<User>("users/1-A", User);
            assertThat(u2)
                .isEqualTo(u2_2);
            assertThat(s2.advanced.numberOfRequests)
                .isEqualTo(1);

            await assertThrows(async () => await s2.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("ConcurrencyException");
            });

            assertThat(s2.advanced.numberOfRequests)
                .isEqualTo(2);

            const u2_3 = await s2.load<User>("users/1-A", User);
            assertThat(u2)
                .isEqualTo(u2_3);
            assertThat(s2.advanced.numberOfRequests)
                .isEqualTo(2);

            await assertThrows(async () => {
                await s2.saveChanges();
            }, err => {
                assertThat(err.name)
                    .isEqualTo("ConcurrencyException");
            });
        }

        {
            const s4 = store.openSession();
            const u4 = await s4.load<User>("users/1-A", User);
            assertThat(u4.age)
                .isEqualTo(98);
        }
    });
});

class User {
    public name: string;
    public age: number;
}
