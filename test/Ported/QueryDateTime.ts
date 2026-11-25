import { AbstractCsharpIndexCreationTask, IDocumentQuery, IDocumentStore } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";

class PersonAndDate {
    public name: string;
    public date: Date;
}

class PersonByDate extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = `from doc in docs.PersonAndDates
select new {
    date_Year = doc.date.Year,
    date_Month = doc.date.Month,
    date_Day = doc.date.Day,
    date_Hour = doc.date.Hour,
    date_Minute = doc.date.Minute,
    date_Second = doc.date.Second,
    date_Ticks = doc.date.Ticks,
    doc.date
}`;
    }
}

function dateOf(year: number, month: number, day: number, hour: number, minute: number, second: number): Date {
    const date = new Date(year, month - 1, day, hour, minute, second);
    date.setFullYear(year);
    return date;
}

describe("QueryDateTime", function () {

    let store: IDocumentStore;

    beforeEach(async () => {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        const people: [string, Date][] = [
            ["Oren", dateOf(1234, 5, 6, 7, 8, 9)],
            ["Tal", dateOf(1400, 11, 6, 3, 23, 43)],
            ["Maxim", dateOf(1654, 7, 17, 11, 24, 51)],
            ["Michael", dateOf(666, 12, 4, 7, 11, 45)],
            ["Iftah", dateOf(1, 1, 1, 1, 1, 1)],
            ["Karmel", dateOf(2025, 4, 28, 23, 28, 23)],
            ["Grisha", dateOf(11, 2, 17, 19, 23, 31)]
        ];
        for (const [name, date] of people) {
            await session.store(Object.assign(new PersonAndDate(), { name, date }));
        }
        await session.saveChanges();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    async function assertDateParts(query: () => IDocumentQuery<PersonAndDate>, fieldFor: (part: string) => string) {
        let res = await query().whereGreaterThanOrEqual(fieldFor("Year"), 1400).all();
        assertThat(res).hasSize(3);

        res = await query().whereLessThan(fieldFor("Day"), 7).all();
        assertThat(res).hasSize(4);

        res = await query()
            .whereGreaterThan(fieldFor("Month"), 7)
            .andAlso()
            .whereLessThanOrEqual(fieldFor("Month"), 11)
            .all();
        assertThat(res).hasSize(1);

        res = await query().whereGreaterThanOrEqual(fieldFor("Hour"), 20).all();
        assertThat(res).hasSize(1);

        res = await query().whereLessThanOrEqual(fieldFor("Minute"), 20).all();
        assertThat(res).hasSize(3);

        res = await query().whereEquals(fieldFor("Second"), 43).all();
        assertThat(res).hasSize(1);

        res = await query().whereGreaterThan(fieldFor("Ticks"), 600000000000000000).all();
        assertThat(res).hasSize(1);
    }

    it("dynamic querying date time should work", async () => {
        const session = store.openSession();

        await assertDateParts(() => session.query(PersonAndDate), part => "date." + part);

        const res = await session.advanced
            .rawQuery("from PersonAndDates where StartsWith(date,'1234-05-06')", PersonAndDate)
            .all();
        assertThat(res).hasSize(1);
    });

    it("static querying date time should work", async () => {
        await new PersonByDate().execute(store);
        await testContext.waitForIndexing(store);

        const session = store.openSession();

        await assertDateParts(() => session.query({ index: PersonByDate }), part => "date_" + part);
    });
});
