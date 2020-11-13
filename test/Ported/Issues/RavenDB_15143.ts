import { IDocumentStore, SessionOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import { DateUtil } from "../../../src/Utility/DateUtil";
import moment = require("moment");

describe("RavenDB_15143", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseCreateCmpXngToInSessionWithNoOtherChanges", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            await session.store(new Command(), "cmd/239-A");
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const result = await session.query<Command>(Command)
                .include(i => i.includeCompareExchangeValue("id"))
                .first();

            assertThat(result)
                .isNotNull();

            let locker = await session.advanced
                .clusterTransaction
                .getCompareExchangeValue<Locker>("cmd/239-A", Locker);
            assertThat(locker)
                .isNull();

            const lockerObject = new Locker();
            lockerObject.clientId = "a";
            locker = session.advanced.clusterTransaction.createCompareExchangeValue<Locker>("cmd/239-A", lockerObject);

            locker.metadata["@expires"] = DateUtil.utc.stringify(moment().add(2, "minutes").toDate());
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const smile = await session.advanced.clusterTransaction.getCompareExchangeValue<String>("cmd/239-A");
            assertThat(smile)
                .isNotNull();
        }
    });
});

class Locker {
    public clientId: string;
}

class Command {
    public id: string;
}