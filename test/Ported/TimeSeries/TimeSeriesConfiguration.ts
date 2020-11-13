import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil";
import { GetDatabaseRecordOperation, IDocumentStore } from "../../../src";
import { TimeSeriesConfiguration } from "../../../src/Documents/Operations/TimeSeries/TimeSeriesConfiguration";
import { ConfigureTimeSeriesOperation } from "../../../src/Documents/Operations/TimeSeries/ConfigureTimeSeriesOperation";
import { CaseInsensitiveKeysMap } from "../../../src/Primitives/CaseInsensitiveKeysMap";
import { TimeSeriesCollectionConfiguration } from "../../../src/Documents/Operations/TimeSeries/TimeSeriesCollectionConfiguration";
import { TimeValue } from "../../../src/Primitives/TimeValue";
import { TimeSeriesPolicy } from "../../../src/Documents/Operations/TimeSeries/TimeSeriesPolicy";
import { RawTimeSeriesPolicy } from "../../../src/Documents/Operations/TimeSeries/RawTimeSeriesPolicy";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { delay } from "../../../src/Utility/PromiseUtil";
import { ConfigureTimeSeriesPolicyOperation } from "../../../src/Documents/Operations/TimeSeries/ConfigureTimeSeriesPolicyOperation";
import { ConfigureRawTimeSeriesPolicyOperation } from "../../../src/Documents/Operations/TimeSeries/ConfigureRawTimeSeriesPolicyOperation";
import {
    ConfigureTimeSeriesValueNamesOperation,
    ConfigureTimeSeriesValueNamesParameters
} from "../../../src/Documents/Operations/TimeSeries/ConfigureTimeSeriesValueNamesOperation";

(RavenTestContext.isPullRequest ? describe.skip : describe)("TimeSeriesConfiguration", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("testSerialization", async () => {

        const serialized = TimeValue.ofHours(2).serialize();
        assertThat(JSON.stringify(serialized, null, 0))
            .isEqualTo("{\"Value\":7200,\"Unit\":\"Second\"}");
    });

    it("testDeserialization", async () => {
        let timeValue = TimeValue.parse(JSON.parse("{\"Value\":7200,\"Unit\":\"Second\"}"));

        assertThat(timeValue.unit)
            .isEqualTo("Second");
        assertThat(timeValue.value)
            .isEqualTo(7200);

        timeValue = TimeValue.parse(JSON.parse("{\"Value\":2,\"Unit\":\"Month\"}"));

        assertThat(timeValue.unit)
            .isEqualTo("Month");
        assertThat(timeValue.value)
            .isEqualTo(2);

        timeValue = TimeValue.parse(JSON.parse("{\"Value\":0,\"Unit\":\"None\"}"));
        assertThat(timeValue.unit)
            .isEqualTo("None");
        assertThat(timeValue.value)
            .isEqualTo(0);
    });

    it("canConfigureTimeSeries", async () => {
        const config = new TimeSeriesConfiguration();
        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));

        config.collections = CaseInsensitiveKeysMap.create();
        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));

        config.collections.set("Users", new TimeSeriesCollectionConfiguration());
        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));

        const users = config.collections.get("Users");

        users.policies = [
            new TimeSeriesPolicy("ByHourFor12Hours", TimeValue.ofHours(1), TimeValue.ofHours(48)),
            new TimeSeriesPolicy("ByMinuteFor3Hours",TimeValue.ofMinutes(1), TimeValue.ofMinutes(180)),
            new TimeSeriesPolicy("BySecondFor1Minute",TimeValue.ofSeconds(1), TimeValue.ofSeconds(60)),
            new TimeSeriesPolicy("ByMonthFor1Year",TimeValue.ofMonths(1), TimeValue.ofYears(1)),
            new TimeSeriesPolicy("ByYearFor3Years",TimeValue.ofYears(1), TimeValue.ofYears(3)),
            new TimeSeriesPolicy("ByDayFor1Month",TimeValue.ofDays(1), TimeValue.ofMonths(1))
        ];

        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));

        users.rawPolicy = new RawTimeSeriesPolicy(TimeValue.ofHours(96));
        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));

        const updated = (await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database)))
            .timeSeries;

        const collection = updated.collections.get("Users");
        const policies = collection.policies;
        assertThat(policies)
            .hasSize(6);

        assertThat(policies[0].retentionTime.toString())
            .isEqualTo(TimeValue.ofSeconds(60).toString());
        assertThat(policies[0].aggregationTime.toString())
            .isEqualTo(TimeValue.ofSeconds(1).toString());

        assertThat(policies[1].retentionTime.toString())
            .isEqualTo(TimeValue.ofMinutes(180).toString());
        assertThat(policies[1].aggregationTime.toString())
            .isEqualTo(TimeValue.ofMinutes(1).toString());

        assertThat(policies[2].retentionTime.toString())
            .isEqualTo(TimeValue.ofHours(48).toString());
        assertThat(policies[2].aggregationTime.toString())
            .isEqualTo(TimeValue.ofHours(1).toString());

        assertThat(policies[3].retentionTime.toString())
            .isEqualTo(TimeValue.ofMonths(1).toString());
        assertThat(policies[3].aggregationTime.toString())
            .isEqualTo(TimeValue.ofDays(1).toString());

        assertThat(policies[4].retentionTime.toString())
            .isEqualTo(TimeValue.ofYears(1).toString());
        assertThat(policies[4].aggregationTime.toString())
            .isEqualTo(TimeValue.ofMonths(1).toString());

        assertThat(policies[5].retentionTime.toString())
            .isEqualTo(TimeValue.ofYears(3).toString());
        assertThat(policies[5].aggregationTime.toString())
            .isEqualTo(TimeValue.ofYears(1).toString());
    });

    it("notValidConfigureShouldThrow", async () => {
        const config = new TimeSeriesConfiguration();

        let timeSeriesCollectionConfiguration = new TimeSeriesCollectionConfiguration();
        config.collections.set("Users", timeSeriesCollectionConfiguration);

        timeSeriesCollectionConfiguration.rawPolicy = new RawTimeSeriesPolicy(TimeValue.ofMonths(1));

        timeSeriesCollectionConfiguration.policies = [
            new TimeSeriesPolicy("By30DaysFor5Years", TimeValue.ofDays(30), TimeValue.ofYears(5))
        ];

        await assertThrows(() => store.maintenance.send(new ConfigureTimeSeriesOperation(config)), err => {
            assertThat(err.message)
                .contains("month might have different number of days");
        });

        const config2 = new TimeSeriesConfiguration();
        timeSeriesCollectionConfiguration = new TimeSeriesCollectionConfiguration();
        config2.collections.set("Users", timeSeriesCollectionConfiguration);

        timeSeriesCollectionConfiguration.rawPolicy = new RawTimeSeriesPolicy(TimeValue.ofMonths(12));
        timeSeriesCollectionConfiguration.policies = [
            new TimeSeriesPolicy("By365DaysFor5Years", TimeValue.ofSeconds(365 * 24 * 3600), TimeValue.ofYears(5))
        ];

        await assertThrows(() => store.maintenance.send(new ConfigureTimeSeriesOperation(config2)), err => {
            assertThat(err.message)
                .contains("month might have different number of days");
        });

        const config3 = new TimeSeriesConfiguration();

        timeSeriesCollectionConfiguration = new TimeSeriesCollectionConfiguration();
        config3.collections.set("Users", timeSeriesCollectionConfiguration);

        timeSeriesCollectionConfiguration.rawPolicy = new RawTimeSeriesPolicy(TimeValue.ofMonths(1));
        timeSeriesCollectionConfiguration.policies = [
            new TimeSeriesPolicy("By27DaysFor1Year", TimeValue.ofDays(27), TimeValue.ofYears(1)),
            new TimeSeriesPolicy("By364DaysFor5Years", TimeValue.ofDays(364), TimeValue.ofYears(5))
        ];

        await assertThrows(() => store.maintenance.send(new ConfigureTimeSeriesOperation(config3)), err => {
            assertThat(err.message)
                .contains("The aggregation time of the policy 'By364DaysFor5Years' (364 days) must be divided by the aggregation time of 'By27DaysFor1Year' (27 days) without a remainder");
        });
    })

    it("canExecuteSimpleRollup", async () => {
        const p1 = new TimeSeriesPolicy("BySecond", TimeValue.ofSeconds(1));
        const p2 = new TimeSeriesPolicy("By2Seconds", TimeValue.ofSeconds(2));
        const p3 = new TimeSeriesPolicy("By4Seconds", TimeValue.ofSeconds(4));

        const collectionConfig = new TimeSeriesCollectionConfiguration();
        collectionConfig.policies = [ p1, p2, p3 ];

        const config = new TimeSeriesConfiguration();
        config.collections.set("Users", collectionConfig);

        config.policyCheckFrequencyInMs = 1000;

        await store.maintenance.send(new ConfigureTimeSeriesOperation(config));

        const baseLine = moment().startOf("day").subtract(1, "day");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Karmel";
            await session.store(user, "users/karmel");

            for (let i = 0; i < 100; i++) {
                session.timeSeriesFor("users/karmel", "Heartrate")
                    .append(baseLine.clone().add(400 * i, "milliseconds").toDate(), 29 * i, "watches/fitbit");
            }

            await session.saveChanges();
        }

        // wait for rollup to run
        await delay(1200);

        {
            const session = store.openSession();
            const ts = await session.timeSeriesFor("users/karmel", "Heartrate").get();

            const tsMillis = ts[ts.length - 1].timestamp.getTime() - ts[0].timestamp.getTime();

            const ts1 = await session.timeSeriesFor("users/karmel", p1.getTimeSeriesName("Heartrate")).get();

            const ts1Millis = ts1[ts1.length - 1].timestamp.getTime() - ts1[0].timestamp.getTime();

            assertThat(ts1Millis)
                .isEqualTo(tsMillis - 600);

            const ts2 = await session.timeSeriesFor("users/karmel", p2.getTimeSeriesName("Heartrate")).get();

            assertThat(ts2)
                .hasSize(ts1.length / 2);

            const ts3 = await session.timeSeriesFor("users/karmel", p3.getTimeSeriesName("Heartrate")).get();
            assertThat(ts1.length / 4);
        }
    });

    it("canConfigureTimeSeries2", async () => {
        const collectionName = "Users";

        const p1 = new TimeSeriesPolicy("BySecondFor1Minute", TimeValue.ofSeconds(1), TimeValue.ofSeconds(60));
        const p2 = new TimeSeriesPolicy("ByMinuteFor3Hours",TimeValue.ofMinutes(1), TimeValue.ofMinutes(180));
        const p3 = new TimeSeriesPolicy("ByHourFor12Hours",TimeValue.ofHours(1), TimeValue.ofHours(48));
        const p4 = new TimeSeriesPolicy("ByDayFor1Month",TimeValue.ofDays(1), TimeValue.ofMonths(1));
        const p5 = new TimeSeriesPolicy("ByMonthFor1Year",TimeValue.ofMonths(1), TimeValue.ofYears(1));
        const p6 = new TimeSeriesPolicy("ByYearFor3Years",TimeValue.ofYears(1), TimeValue.ofYears(3));

        let policies = [ p1, p2, p3, p4, p5, p6 ];

        for (const policy of policies) {
            await store.maintenance.send(new ConfigureTimeSeriesPolicyOperation(collectionName, policy));
        }

        await store.maintenance.send(
            new ConfigureRawTimeSeriesPolicyOperation(collectionName,
                new RawTimeSeriesPolicy(TimeValue.ofHours(96))));


        const parameters: ConfigureTimeSeriesValueNamesParameters = {
            collection: collectionName,
            timeSeries: "HeartRate",
            valueNames: ["HeartRate"],
            update: true
        };

        const nameConfig = new ConfigureTimeSeriesValueNamesOperation(parameters);
        await store.maintenance.send(nameConfig);

        const updated = (await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database))).timeSeries;
        const collection = updated.collections.get(collectionName);

        policies = collection.policies;

        assertThat(policies)
            .hasSize(6);

        assertThat(policies[0].retentionTime.toString())
            .isEqualTo(TimeValue.ofSeconds(60).toString());
        assertThat(policies[0].aggregationTime.toString())
            .isEqualTo(TimeValue.ofSeconds(1).toString());

        assertThat(policies[1].retentionTime.toString())
            .isEqualTo(TimeValue.ofMinutes(180).toString());
        assertThat(policies[1].aggregationTime.toString())
            .isEqualTo(TimeValue.ofMinutes(1).toString());

        assertThat(policies[2].retentionTime.toString())
            .isEqualTo(TimeValue.ofHours(48).toString());
        assertThat(policies[2].aggregationTime.toString())
            .isEqualTo(TimeValue.ofHours(1).toString());

        assertThat(policies[3].retentionTime.toString())
            .isEqualTo(TimeValue.ofMonths(1).toString());
        assertThat(policies[3].aggregationTime.toString())
            .isEqualTo(TimeValue.ofDays(1).toString());

        assertThat(policies[4].retentionTime.toString())
            .isEqualTo(TimeValue.ofYears(1).toString());
        assertThat(policies[4].aggregationTime.toString())
            .isEqualTo(TimeValue.ofMonths(1).toString());

        assertThat(policies[5].retentionTime.toString())
            .isEqualTo(TimeValue.ofYears(3).toString());
        assertThat(policies[5].aggregationTime.toString())
            .isEqualTo(TimeValue.ofYears(1).toString());

        assertThat(updated.namedValues)
            .isNotNull();

        assertThat(updated.namedValues)
            .hasSize(1);

        const mapper = updated.getNames(collectionName, "heartrate");

        assertThat(mapper)
            .isNotNull()
            .hasSize(1)
            .contains("HeartRate");
    });

    it("canConfigureTimeSeries3", async () => {
        await store.timeSeries.setPolicy(User, "By15SecondsFor1Minute", TimeValue.ofSeconds(15), TimeValue.ofSeconds(60));
        await store.timeSeries.setPolicy(User, "ByMinuteFor3Hours", TimeValue.ofMinutes(1), TimeValue.ofMinutes(180));
        await store.timeSeries.setPolicy(User, "ByHourFor12Hours", TimeValue.ofHours(1), TimeValue.ofHours(48));
        await store.timeSeries.setPolicy(User, "ByDayFor1Month", TimeValue.ofDays(1), TimeValue.ofMonths(1));
        await store.timeSeries.setPolicy(User, "ByMonthFor1Year", TimeValue.ofMonths(1), TimeValue.ofYears(1));
        await store.timeSeries.setPolicy(User, "ByYearFor3Years", TimeValue.ofYears(1), TimeValue.ofYears(3));

        let updated = (await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database))).timeSeries;
        let collection = updated.collections.get("Users");
        let policies = collection.policies;

        assertThat(policies)
            .hasSize(6);

        assertThat(policies[0].retentionTime.toString())
            .isEqualTo(TimeValue.ofSeconds(60).toString());
        assertThat(policies[0].aggregationTime.toString())
            .isEqualTo(TimeValue.ofSeconds(15).toString());

        assertThat(policies[1].retentionTime.toString())
            .isEqualTo(TimeValue.ofMinutes(180).toString());
        assertThat(policies[1].aggregationTime.toString())
            .isEqualTo(TimeValue.ofMinutes(1).toString());

        assertThat(policies[2].retentionTime.toString())
            .isEqualTo(TimeValue.ofHours(48).toString());
        assertThat(policies[2].aggregationTime.toString())
            .isEqualTo(TimeValue.ofHours(1).toString());

        assertThat(policies[3].retentionTime.toString())
            .isEqualTo(TimeValue.ofMonths(1).toString());
        assertThat(policies[3].aggregationTime.toString())
            .isEqualTo(TimeValue.ofDays(1).toString());

        assertThat(policies[4].retentionTime.toString())
            .isEqualTo(TimeValue.ofYears(1).toString());
        assertThat(policies[4].aggregationTime.toString())
            .isEqualTo(TimeValue.ofMonths(1).toString());

        assertThat(policies[5].retentionTime.toString())
            .isEqualTo(TimeValue.ofYears(3).toString());
        assertThat(policies[5].aggregationTime.toString())
            .isEqualTo(TimeValue.ofYears(1).toString());

        await assertThrows(() => store.timeSeries.removePolicy(User, "ByMinuteFor3Hours"),
            err => {
                assertThat(err.message)
                    .contains("System.InvalidOperationException: The policy 'By15SecondsFor1Minute' has a retention time of '60 seconds' but should be aggregated by policy 'ByHourFor12Hours' with the aggregation time frame of 60 minutes");
            });

        await assertThrows(() => store.timeSeries.setRawPolicy(User, TimeValue.ofSeconds(10)),
            err => {
                assertThat(err.message)
                    .contains("System.InvalidOperationException: The policy 'rawpolicy' has a retention time of '10 seconds' but should be aggregated by policy 'By15SecondsFor1Minute' with the aggregation time frame of 15 seconds");
            });

        await store.timeSeries.setRawPolicy(User, TimeValue.ofMinutes(120));
        await store.timeSeries.setPolicy(User, "By15SecondsFor1Minute", TimeValue.ofSeconds(30), TimeValue.ofSeconds(120));

        updated = (await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database))).timeSeries;
        collection = updated.collections.get("Users");
        policies = collection.policies;

        assertThat(policies)
            .hasSize(6);
        assertThat(policies[0].retentionTime.toString())
            .isEqualTo(TimeValue.ofSeconds(120).toString());
        assertThat(policies[0].aggregationTime.toString())
            .isEqualTo(TimeValue.ofSeconds(30).toString());

        await store.timeSeries.removePolicy(User, "By15SecondsFor1Minute");

        updated = (await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database))).timeSeries;
        collection = updated.collections.get("Users");
        policies = collection.policies;

        assertThat(policies)
            .hasSize(5);

        await store.timeSeries.removePolicy(User, RawTimeSeriesPolicy.POLICY_STRING);
    })
});
