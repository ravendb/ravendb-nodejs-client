import { testContext, disposeTestDocumentStore, storeNewDoc } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    GetDetailedStatisticsOperation,
    PutCompareExchangeValueOperation,
    DeleteCompareExchangeValueOperation,
} from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";
import { Person, User } from "../../Assets/Entities";

describe("RavenDB_10038Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("compareExchangeAndIdentitiesCount", async function () {
        let stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(0);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(0);

        {
            const session = store.openSession();
            await session.store(new Person(), "people|");
            await session.saveChanges();
        }
        
        stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(1);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(0);

        {
            const session = store.openSession();
            await session.store(new Person(), "people|");
            await session.store(new User(), "users|");
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(2);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(0);
        await store.operations.send(new PutCompareExchangeValueOperation<Person>("key/1", new Person(), 0));
        stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(2);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(1);

        let result = await store.operations.send(
            new PutCompareExchangeValueOperation<Person>("key/2", new Person(), 0));
        assertThat(result.successful)
            .isTrue();

        stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(2);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(2);

        result = await store.operations.send(
            new PutCompareExchangeValueOperation<Person>("key/2", new Person(), result.index));
        assertThat(result.successful)
            .isTrue();

        stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(2);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(2);

        result = await store.operations.send(
            new DeleteCompareExchangeValueOperation<Person>("key/2", result.index));
        assertThat(result.successful)
            .isTrue();

        stats = await store.maintenance.send(new GetDetailedStatisticsOperation());
        assertThat(stats.countOfIdentities)
            .isEqualTo(2);
        assertThat(stats.countOfCompareExchange)
            .isEqualTo(1);
    });
});
