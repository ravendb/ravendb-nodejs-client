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
            const result = await session.query(Command)
                .include(i => i.includeCompareExchangeValue("id"))
                .first();

            assertThat(result)
                .isNotNull();

            let locker = await session.advanced
                .clusterTransaction
                .getCompareExchangeValue("cmd/239-A", Locker);
            assertThat(locker)
                .isNull();

            const lockerObject = new Locker();
            lockerObject.clientId = "a";
            locker = session.advanced.clusterTransaction.createCompareExchangeValue("cmd/239-A", lockerObject);

            locker.metadata["@expires"] = DateUtil.utc.stringify(moment().add(2, "minutes").toDate());
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const smile = await session.advanced.clusterTransaction.getCompareExchangeValue("cmd/239-A", Locker);
            assertThat(smile.value)
                .isNotNull();
        }
    });

    it("can store and read primitive compare exchange", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            session.advanced.clusterTransaction.createCompareExchangeValue("cmd/int", 5);
            session.advanced.clusterTransaction.createCompareExchangeValue("cmd/string", "testing");
            session.advanced.clusterTransaction.createCompareExchangeValue("cmd/true", true);
            session.advanced.clusterTransaction.createCompareExchangeValue("cmd/false", false);
            session.advanced.clusterTransaction.createCompareExchangeValue("cmd/zero", 0);
            session.advanced.clusterTransaction.createCompareExchangeValue("cmd/null", null);

            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const numberValue = await session.advanced.clusterTransaction.getCompareExchangeValue<number>("cmd/int");
            assertThat(numberValue.value)
                .isEqualTo(5);

            const stringValue = await session.advanced.clusterTransaction.getCompareExchangeValue<string>("cmd/string");
            assertThat(stringValue.value)
                .isEqualTo("testing");

            const trueValue = await session.advanced.clusterTransaction.getCompareExchangeValue<boolean>("cmd/true");
            assertThat(trueValue.value)
                .isEqualTo(true);

            const falseValue = await session.advanced.clusterTransaction.getCompareExchangeValue<boolean>("cmd/false");
            assertThat(falseValue.value)
                .isEqualTo(false);

            const zeroValue = await session.advanced.clusterTransaction.getCompareExchangeValue<number>("cmd/zero");
            assertThat(zeroValue.value)
                .isEqualTo(0);

            const nullValue = await session.advanced.clusterTransaction.getCompareExchangeValue<number>("cmd/null");
            assertThat(nullValue.value)
                .isNull();
        }
    })
});

class Locker {
    public clientId: string;
}

class Command {
    public id: string;
}