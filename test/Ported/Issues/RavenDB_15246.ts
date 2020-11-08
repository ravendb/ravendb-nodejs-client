import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { TimeSeriesRange } from "../../../src/Documents/Operations/TimeSeries/TimeSeriesRange";
import { GetMultipleTimeSeriesCommand } from "../../../src/Documents/Operations/TimeSeries/GetMultipleTimeSeriesOperation";
import { TypeUtil } from "../../../src/Utility/TypeUtil";

describe("RavenDB_15426", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("testClientCacheWithPageSize", async () => {
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            await session.store(new User(), "users/1-A");
            const tsf = session.timeSeriesFor("users/1-A", "Heartrate");
            for (let i = 0; i <= 20; i++) {
                tsf.append(baseLine.clone().add(i, "minute").toDate(), [ i ], "watches/apple");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1-A", User);
            const ts = session.timeSeriesFor(user, "Heartrate");
            let res = await ts.get(0, 0);
            assertThat(res)
                .hasSize(0);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            res = await ts.get(0, 10);

            assertThat(res)
                .hasSize(10);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            res = await ts.get(0, 7);
            assertThat(res)
                .hasSize(7);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            res = await ts.get(0, 20);
            assertThat(res)
                .hasSize(20);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            res = await ts.get(0, 25);
            assertThat(res)
                .hasSize(21);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
        }
    });

    it("testRanges", async () => {
        const baseLine = moment().startOf("day");
        const id = "users/1-A";

        {
            const session = store.openSession();
            await session.store(new User(), id);
            const tsf = session.timeSeriesFor(id, "raven");

            for (let i = 0; i <= 10; i++) {
                tsf.append(baseLine.clone().add(i, "minute").toDate(), [ i ], "watches/apple");
            }
            for (let i = 12; i <= 13; i++) {
                tsf.append(baseLine.clone().add(i, "minute").toDate(), [ i ], "watches/apple");
            }
            for (let i = 16; i <= 20; i++) {
                tsf.append(baseLine.clone().add(i, "minute").toDate(), [ i ], "watches/apple");
            }

            await session.saveChanges();
        }

        let rangesList: TimeSeriesRange[] = [
            {
                from: baseLine.clone().add(1, "minute").toDate(),
                to: baseLine.clone().add(7, "minute").toDate(),
                name: "raven"
            }
        ];

        const re = store.getRequestExecutor();
        let tsCommand = new GetMultipleTimeSeriesCommand(re.conventions, id, rangesList, 0, TypeUtil.MAX_INT32);
        await re.execute(tsCommand);

        let res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(1);

        rangesList = [
            {
                name: "raven",
                from: baseLine.clone().add(8, "minute").toDate(),
                to: baseLine.clone().add(11, "minute").toDate()
            }
        ];

        tsCommand = new GetMultipleTimeSeriesCommand(re.conventions, id, rangesList, 0, TypeUtil.MAX_INT32);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(1);

        rangesList = [
            {
                name: "raven",
                from: baseLine.clone().add(8, "minute").toDate(),
                to: baseLine.clone().add(17, "minute").toDate()
            }
        ];

        tsCommand = new GetMultipleTimeSeriesCommand(re.conventions, id, rangesList, 0, TypeUtil.MAX_INT32);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(1);

        rangesList = [
            {
                name: "raven",
                from: baseLine.clone().add(14, "minute").toDate(),
                to: baseLine.clone().add(15, "minute").toDate()
            }
        ];

        tsCommand = new GetMultipleTimeSeriesCommand(re.conventions, id, rangesList, 0, TypeUtil.MAX_INT32);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(1);

        rangesList = [
            {
                name: "raven",
                from: baseLine.clone().add(23, "minute").toDate(),
                to: baseLine.clone().add(25, "minute").toDate()
            }
        ];

        tsCommand = new GetMultipleTimeSeriesCommand(re.conventions, id, rangesList, 0, TypeUtil.MAX_INT32);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(1);

        rangesList = [
            {
                name: "raven",
                from: baseLine.clone().add(20, "minute").toDate(),
                to: baseLine.clone().add(26, "minute").toDate()
            }
        ];

        tsCommand = new GetMultipleTimeSeriesCommand(re.conventions, id, rangesList, 0, TypeUtil.MAX_INT32);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(1);
    });

    it.skip("testClientCacheWithStart", async () => { //TODO: waiting for RavenDB-15761
        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            await session.store(new User(), "users/1-A");
            const tsf = session.timeSeriesFor("users/1-A", "Heartrate");

            for (let i = 0; i < 20; i++) {
                tsf.append(baseLine.clone().add(i, "minute").toDate(), [ i ], "watches/apple");
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1-A", User);

            const ts = session.timeSeriesFor(user, "Heartrate");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            let res = await ts.get(20, TypeUtil.MAX_INT32);
            assertThat(res)
                .isNull();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            res = await ts.get(10, TypeUtil.MAX_INT32);
            assertThat(res)
                .hasSize(10);
            assertThat(res[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            res = await ts.get(0, TypeUtil.MAX_INT32);

            assertThat(res)
                .hasSize(20);
            assertThat(res[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(res[10].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            res = await ts.get(10, TypeUtil.MAX_INT32);
            assertThat(res)
                .hasSize(10);
            assertThat(res[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(10, "minutes").toDate().getTime());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            res = await ts.get(20, TypeUtil.MAX_INT32);
            assertThat(res)
                .hasSize(0);
        }
    });

    it("getResultsWithRange", async () => {
        const baseLine = moment().startOf("day");
        const id = "users/1-A";

        {
            const session = store.openSession();
            await session.store(new User(), id);
            let tsf = session.timeSeriesFor(id, "raven");
            for (let i = 0; i < 8; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), [ 64 ], "watches/apple");
            }

            await session.saveChanges();

            const rangesList: TimeSeriesRange[] = [
                {
                    name: "raven",
                    from: baseLine.clone().add(0, "minutes").toDate(),
                    to: baseLine.clone().add(3, "minutes").toDate(),
                },
                {
                    name: "raven",
                    from: baseLine.clone().add(4, "minutes").toDate(),
                    to: baseLine.clone().add(7, "minutes").toDate(),
                },
                {
                    name: "raven",
                    from: baseLine.clone().add(8, "minutes").toDate(),
                    to: baseLine.clone().add(11, "minutes").toDate(),
                }
            ];

            const re = store.getRequestExecutor();

            let tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 0, 10);
            await re.execute(tsCommand);

            let res = tsCommand.result;

            assertThat(res.values)
                .hasSize(1);
            assertThat(res.values.get("raven"))
                .hasSize(3);

            assertThat(res.values.get("raven")[0].entries)
                .hasSize(4);
            assertThat(res.values.get("raven")[1].entries)
                .hasSize(4);
            assertThat(res.values.get("raven")[2].entries)
                .hasSize(0);

            tsf = session.timeSeriesFor(id, "raven");
            for (let i = 8; i < 11; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), [ 1000 ], "watches/apple");
            }

            await session.saveChanges();

            tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 0, 10);

            await re.execute(tsCommand);

            res = tsCommand.result;

            assertThat(res.values)
                .hasSize(1);
            assertThat(res.values.get("raven"))
                .hasSize(3);

            assertThat(res.values.get("raven")[0].entries)
                .hasSize(4);
            assertThat(res.values.get("raven")[1].entries)
                .hasSize(4);
            assertThat(res.values.get("raven")[2].entries)
                .hasSize(2);
        }
    });

    it("resultsWithRangeAndPageSize", async () => {
        const tag = "raven";
        const id = "users/1";

        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            await session.store(new User(), id);
            const tsf = session.timeSeriesFor(id, tag);
            for (let i = 0; i <= 15; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), [ i ], "watches/apple");
            }

            await session.saveChanges();
        }

        const rangesList: TimeSeriesRange[] = [
            {
                name: "raven",
                from: baseLine.clone().add(0, "minutes").toDate(),
                to: baseLine.clone().add(3, "minutes").toDate(),
            },
            {
                name: "raven",
                from: baseLine.clone().add(4, "minutes").toDate(),
                to: baseLine.clone().add(7, "minutes").toDate(),
            },
            {
                name: "raven",
                from: baseLine.clone().add(8, "minutes").toDate(),
                to: baseLine.clone().add(11, "minutes").toDate(),
            }
        ];

        const re = store.getRequestExecutor();

        let tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 0, 0);
        await re.execute(tsCommand);

        let res = tsCommand.result;
        assertThat(res.values)
            .hasSize(0);

        tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 0, 30);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(3);

        assertThat(res.values.get("raven")[0].entries)
            .hasSize(4);
        assertThat(res.values.get("raven")[1].entries)
            .hasSize(4);
        assertThat(res.values.get("raven")[2].entries)
            .hasSize(4);

        tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 0, 6);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(2);

        assertThat(res.values.get("raven")[0].entries)
            .hasSize(4);
        assertThat(res.values.get("raven")[1].entries)
            .hasSize(2);
    });

    it("resultsWithRangeAndStart", async () => {
        const tag = "raven";
        const id = "users/1";

        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            await session.store(new User(), id);
            const tsf = session.timeSeriesFor(id, tag);
            for (let i = 0; i <= 15; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), [ i ], "watches/apple");
            }

            await session.saveChanges();
        }

        const rangesList: TimeSeriesRange[] = [
            {
                name: "raven",
                from: baseLine.clone().add(0, "minutes").toDate(),
                to: baseLine.clone().add(3, "minutes").toDate(),
            },
            {
                name: "raven",
                from: baseLine.clone().add(4, "minutes").toDate(),
                to: baseLine.clone().add(7, "minutes").toDate(),
            },
            {
                name: "raven",
                from: baseLine.clone().add(8, "minutes").toDate(),
                to: baseLine.clone().add(11, "minutes").toDate(),
            }
        ];

        const re = store.getRequestExecutor();

        let tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 0, 20);

        await re.execute(tsCommand);

        let res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(3);

        assertThat(res.values.get("raven")[0].entries)
            .hasSize(4);
        assertThat(res.values.get("raven")[1].entries)
            .hasSize(4);
        assertThat(res.values.get("raven")[2].entries)
            .hasSize(4);

        tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 3, 20);

        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(3);

        assertThat(res.values.get("raven")[0].entries)
            .hasSize(1);
        assertThat(res.values.get("raven")[1].entries)
            .hasSize(4);
        assertThat(res.values.get("raven")[2].entries)
            .hasSize(4);

        tsCommand = new GetMultipleTimeSeriesCommand(store.conventions, id, rangesList, 9, 20);
        await re.execute(tsCommand);

        res = tsCommand.result;

        assertThat(res.values)
            .hasSize(1);
        assertThat(res.values.get("raven"))
            .hasSize(3);

        assertThat(res.values.get("raven")[0].entries)
            .hasSize(0);
        assertThat(res.values.get("raven")[1].entries)
            .hasSize(0);
        assertThat(res.values.get("raven")[2].entries)
            .hasSize(3);
    });
});
