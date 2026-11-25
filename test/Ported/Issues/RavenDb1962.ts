import { IDocumentSession, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

const CNTR = 5;

describe("RavenDb1962", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeData(session: IDocumentSession) {
        for (let i = 1; i <= CNTR; i++) {
            const user = new User();
            user.name = "Test User #" + i;
            await session.store(user, "users/" + i);
        }
        await session.saveChanges();
    }

    function lazyLoad(session: IDocumentSession) {
        for (let i = 1; i <= CNTR; i++) {
            session.advanced.lazily.load<User>("users/" + i);
        }
    }

    it("can execute lazy loads in async session, check single call", async () => {
        await storeData(store.openSession());

        const session = store.openSession();
        lazyLoad(session);

        const requestTimes = await session.advanced.eagerly.executeAllPendingLazyOperations();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        assertThat(typeof requestTimes.totalClientDuration).isEqualTo("number");
        assertThat(typeof requestTimes.totalServerDuration).isEqualTo("number");
        assertThat(requestTimes.durationBreakdown).hasSize(CNTR);
    });
});
