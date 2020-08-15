import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { RefreshConfiguration } from "../../../src/Documents/Operations/Refresh/RefreshConfiguration";
import { ConfigureRefreshOperation } from "../../../src/Documents/Operations/Refresh/ConfigureRefreshOperation";
import { User } from "../../Assets/Entities";
import moment = require("moment");
import { Stopwatch } from "../../../src/Utility/Stopwatch";
import { throwError } from "../../../src/Exceptions/index";
import { assertThat } from "../../Utils/AssertExtensions";
import { delay } from "../../../src/Utility/PromiseUtil";
import { DateUtil } from "../../../src/Utility/DateUtil";

describe("RavenDB_13735", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("refreshWillUpdateDocumentChangeVector", async () => {
        await setupRefresh(store);

        let expectedChangeVector: string;
        {
            const session = store.openSession();
            const user = Object.assign(new User(), {
                name: "Oren"
            });

            await session.store(user, "users/1-A");

            const hourAgo = moment().add(-1, "hour");

            session.advanced.getMetadataFor(user)["@refresh"] = DateUtil.utc.stringify(hourAgo.toDate());

            await session.saveChanges();

            expectedChangeVector = session.advanced.getChangeVectorFor(user);
        }

        const sw = Stopwatch.createStarted();

        while (true) {
            if (sw.elapsed > 10_000) {
                throwError("TimeoutException");
            }

            {
                const session = store.openSession();
                const user = await session.load<User>("users/1-A", User);
                assertThat(user)
                    .isNotNull();

                if (session.advanced.getChangeVectorFor(user) !== expectedChangeVector) {
                    // change vector was changed - great!
                    break;
                }
            }

            await delay(200);
        }
    });

});

async function setupRefresh(store: IDocumentStore) {
    const config: RefreshConfiguration = {
        disabled: false,
        refreshFrequencyInSec: 1
    };

    return await store.maintenance.send(new ConfigureRefreshOperation(config));
}
