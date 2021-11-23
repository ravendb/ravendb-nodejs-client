import {
    AbstractJavaScriptIndexCreationTask,
    IDocumentStore,
    TimeSeriesAggregationResult,
    TimeSeriesRawResult
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { assertThat } from "../../Utils/AssertExtensions";

describe("TimeSeriesRawQuery", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canQueryTimeSeriesAggregation_DeclareSyntax_WithOtherFields", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            for (let i = 0; i <= 3; i++) {
                const id = "people/" + i;

                const person = new Person();
                person.name = "Oren";
                person.age = i * 30;

                await session.store(person, id);

                const tsf = session.timeSeriesFor(id, "Heartrate");

                tsf.append(baseLine.clone().add(61, "minutes").toDate(), 59, "watches/fitbit");
                tsf.append(baseLine.clone().add(62, "minutes").toDate(), 79, "watches/fitbit");
                tsf.append(baseLine.clone().add(63, "minutes").toDate(), 69, "watches/fitbit");

                await session.saveChanges();
            }
        }

        await new PeopleIndex().execute(store);

        await testContext.waitForIndexing(store);
        {
            const session = store.openSession();
            const query = session.advanced.rawQuery(
                `declare timeseries out(p)
{
    from p.HeartRate between $start and $end
    group by 1h
    select min(), max()
}
from index 'People' as p
where p.age > 49
select out(p) as heartRate, p.name`, RawQueryResult)
                .addParameter("start", baseLine.toDate())
                .addParameter("end", baseLine.clone().add(1, "day").toDate());

            const result = await query.all();

            assertThat(result)
                .hasSize(2);

            for (let i = 0; i < 2; i++) {
                const agg = result[i];

                assertThat(agg.name)
                    .isEqualTo("Oren");

                const heartrate = agg.heartRate;

                assertThat(heartrate.count)
                    .isEqualTo(3);
                assertThat(heartrate.results)
                    .hasSize(1);

                const val = heartrate.results[0];

                assertThat(val.min[0])
                    .isEqualTo(59);
                assertThat(val.max[0])
                    .isEqualTo(79);

                assertThat(val.from.getTime())
                    .isEqualTo(baseLine.clone().add(60, "minutes").toDate().getTime());
                assertThat(val.to.getTime())
                    .isEqualTo(baseLine.clone().add(120, "minutes").toDate().getTime());
            }
        }
    });

    it("canQueryTimeSeriesAggregation_DeclareSyntax_MultipleSeries", async () => {
        const baseLine = testContext.utcToday();
        const baseLine2 = baseLine.clone().add(-1, "day");

        {
            const session = store.openSession();
            for (let i = 0; i <= 3; i++) {
                const id = "people/" + i;

                const person = new Person();
                person.name = "Oren";
                person.age = i * 30;

                await session.store(person, id);

                let tsf = session.timeSeriesFor(id, "Heartrate");

                tsf.append(baseLine.clone().add(61, "minutes").toDate(), 59, "watches/fitbit");
                tsf.append(baseLine.clone().add(62, "minutes").toDate(), 79, "watches/fitbit");
                tsf.append(baseLine.clone().add(63, "minutes").toDate(), 69, "watches/fitbit");

                tsf = session.timeSeriesFor(id, "BloodPressure");

                tsf.append(baseLine2.clone().add(61, "minutes").toDate(), 159, "watches/apple");
                tsf.append(baseLine2.clone().add(62, "minutes").toDate(), 179, "watches/apple");
                tsf.append(baseLine2.clone().add(63, "minutes").toDate(), 168, "watches/apple");

                await session.saveChanges();
            }
        }

        await new PeopleIndex().execute(store);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.advanced.rawQuery("declare timeseries heart_rate(doc)\n" +
                "{\n" +
                "    from doc.HeartRate between $start and $end\n" +
                "    group by 1h\n" +
                "    select min(), max()\n" +
                "}\n" +
                "declare timeseries blood_pressure(doc)\n" +
                "{\n" +
                "    from doc.BloodPressure between $start2 and $end2\n" +
                "    group by 1h\n" +
                "    select min(), max(), avg()\n" +
                "}\n" +
                "from index 'People' as p\n" +
                "where p.age > 49\n" +
                "select heart_rate(p) as heartRate, blood_pressure(p) as bloodPressure", RawQueryResult)
                .addParameter("start", baseLine.toDate())
                .addParameter("end", baseLine.clone().add(1, "day").toDate())
                .addParameter("start2", baseLine2.toDate())
                .addParameter("end2", baseLine2.clone().add(1, "day").toDate());

            const result = await query.all();

            assertThat(result)
                .hasSize(2);

            for (let i = 0; i < 2; i++) {
                const agg = result[i];

                const heartRate = agg.heartRate;
                assertThat(heartRate.count)
                    .isEqualTo(3);
                assertThat(heartRate.results)
                    .hasSize(1);

                let val = heartRate.results[0];

                assertThat(val.min[0])
                    .isEqualTo(59);
                assertThat(val.max[0])
                    .isEqualTo(79);

                assertThat(val.from.getTime())
                    .isEqualTo(baseLine.clone().add(60, "minutes").toDate().getTime());
                assertThat(val.to.getTime())
                    .isEqualTo(baseLine.clone().add(120, "minutes").toDate().getTime());

                const bloodPressure = agg.bloodPressure;

                assertThat(bloodPressure.count)
                    .isEqualTo(3);

                assertThat(bloodPressure.results)
                    .hasSize(1);

                val = bloodPressure.results[0];

                assertThat(val.min[0])
                    .isEqualTo(159);
                assertThat(val.max[0])
                    .isEqualTo(179);

                const expectedAvg = (159 + 168 + 179) / 3.0;

                assertThat(val.average[0])
                    .isEqualTo(expectedAvg);

                assertThat(val.from.getTime())
                    .isEqualTo(baseLine2.clone().add(60, "minutes").toDate().getTime());
                assertThat(val.to.getTime())
                    .isEqualTo(baseLine2.clone().add(120, "minutes").toDate().getTime());
            }
        }
    });

    it("canQueryTimeSeriesAggregation_NoSelectOrGroupBy_MultipleValues", async () => {
        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            for (let i = 0; i <= 3; i++) {
                const id = "people/" + i;

                const person = new Person();
                person.name = "Oren";
                person.age = i * 30;

                await session.store(person, id);

                const tsf = session.timeSeriesFor(id, "Heartrate");

                tsf.append(baseLine.clone().add(61, "minutes").toDate(), [ 59, 159 ], "watches/fitbit");
                tsf.append(baseLine.clone().add(62, "minutes").toDate(), [ 79, 179 ], "watches/fitbit");
                tsf.append(baseLine.clone().add(63, "minutes").toDate(), 69, "watches/apple");

                tsf.append(baseLine.clone().add(61, "minutes").add(1, "month").toDate(), [ 159, 259 ], "watches/fitbit");
                tsf.append(baseLine.clone().add(62, "minutes").add(1, "month").toDate(), [ 179 ], "watches/fitbit");
                tsf.append(baseLine.clone().add(63, "minutes").add(1, "month").toDate(), [ 169, 269 ], "watches/fitbit");

                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const query = session.advanced.rawQuery(
                    "declare timeseries out(x)\n" +
                    "{\n" +
                    "    from x.HeartRate between $start and $end\n" +
                    "}\n" +
                    "from People as doc\n" +
                    "where doc.age > 49\n" +
                    "select out(doc)",
                    TimeSeriesRawResult)
                    .addParameter("start", baseLine.toDate())
                    .addParameter("end", baseLine.clone().add(2, "months").toDate());

                const result = await query.all();
                assertThat(result)
                    .hasSize(2);

                for (let i = 0; i < 2; i++) {
                    const agg = result[i];

                    assertThat(agg.results)
                        .hasSize(6);

                    let val = agg.results[0];

                    assertThat(val.values)
                        .hasSize(2);
                    assertThat(val.values[0])
                        .isEqualTo(59);
                    assertThat(val.values[1])
                        .isEqualTo(159);

                    assertThat(val.tag)
                        .isEqualTo("watches/fitbit");
                    assertThat(val.timestamp.getTime())
                        .isEqualTo(baseLine.clone().add(61, "minutes").toDate().getTime());

                    val = agg.results[1];

                    assertThat(val.values)
                        .hasSize(2);
                    assertThat(val.values[0])
                        .isEqualTo(79);
                    assertThat(val.values[1])
                        .isEqualTo(179);

                    assertThat(val.tag)
                        .isEqualTo("watches/fitbit");
                    assertThat(val.timestamp.getTime())
                        .isEqualTo(baseLine.clone().add(62, "minutes").toDate().getTime());

                    val = agg.results[2];

                    assertThat(val.values)
                        .hasSize(1);
                    assertThat(val.values[0])
                        .isEqualTo(69);

                    assertThat(val.tag)
                        .isEqualTo("watches/apple");
                    assertThat(val.timestamp.getTime())
                        .isEqualTo(baseLine.clone().add(63, "minutes").toDate().getTime());

                    val = agg.results[3];

                    assertThat(val.values)
                        .hasSize(2);
                    assertThat(val.values[0])
                        .isEqualTo(159);
                    assertThat(val.values[1])
                        .isEqualTo(259);

                    assertThat(val.tag)
                        .isEqualTo("watches/fitbit");
                    assertThat(val.timestamp.getTime())
                        .isEqualTo(baseLine.clone().add(61, "minutes").add(1, "month").toDate().getTime());

                    val = agg.results[4];

                    assertThat(val.values)
                        .hasSize(1);
                    assertThat(val.values[0])
                        .isEqualTo(179);

                    assertThat(val.tag)
                        .isEqualTo("watches/fitbit");
                    assertThat(val.timestamp.getTime())
                        .isEqualTo(baseLine.clone().add(62, "minutes").add(1, "month").toDate().getTime());

                    val = agg.results[5];

                    assertThat(val.values)
                        .hasSize(2);
                    assertThat(val.values[0])
                        .isEqualTo(169);
                    assertThat(val.values[1])
                        .isEqualTo(269);

                    assertThat(val.tag)
                        .isEqualTo("watches/fitbit");
                    assertThat(val.timestamp.getTime())
                        .isEqualTo(baseLine.clone().add(63, "minutes").add(1, "month").toDate().getTime());
                }
            }
        }
    });
});

export class RawQueryResult {
    public heartRate: TimeSeriesAggregationResult;
    public bloodPressure: TimeSeriesAggregationResult;
    public name: string;
}

class Person {
    public name: string;
    public age: number;
    public worksAt: string;
    public event: string;
    public additionalData: AdditionalData;
}


class AdditionalData {
    public nestedClass: NestedClass;
}


class NestedClass {
    public event: Event;
    public accuracy: number;
}

class Event {
    public start: Date;
    public end: Date;
    public description: string;
}

class PeopleIndex extends AbstractJavaScriptIndexCreationTask<Person, Pick<Person, "age">> {

    constructor() {
        super();

        this.map("people", p => {
            return {
                age: p.age
            }
        });
    }

    getIndexName(): string {
        return "People";
    }
}