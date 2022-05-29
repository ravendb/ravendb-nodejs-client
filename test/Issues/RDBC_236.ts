import * as assert from "assert";
import * as moment from "moment";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { DateUtil } from "../../src/Utility/DateUtil";
import { GetDocumentsCommand } from "../../src/Documents/Commands/GetDocumentsCommand";
import { StringUtil } from "../../src/Utility/StringUtil";

// getTimezoneOffset() returns reversed offset, hence the "-"
const LOCAL_TIMEZONE_OFFSET = -(new Date(2018, 7, 1).getTimezoneOffset()); 
const LOCAL_TIMEZONE_OFFSET_HOURS = LOCAL_TIMEZONE_OFFSET / 60;
const LOCAL_TIMEZONE_STRING =
    `${LOCAL_TIMEZONE_OFFSET >= 0 ? "+" : "-"}${StringUtil.leftPad(LOCAL_TIMEZONE_OFFSET_HOURS.toString(), 2, "0")}:00`;

describe("DateUtil", function () {

    describe("without timezones", function () {

        it("should properly parse & format date (without UTC dates)", async function () {
            const dateUtil = new DateUtil({
                withTimezone: false
            });
            const date = moment("2018-10-15T09:46:28.306").toDate();
            const stringified = dateUtil.stringify(date);
            assert.strictEqual(stringified, "2018-10-15T09:46:28.3060000");

            const parsed = dateUtil.parse(stringified);
            assert.strictEqual(parsed.getHours(), date.getHours());
            assert.strictEqual(parsed.toISOString(), date.toISOString());
        });

        it("should properly format regular date using UTC dates", async function () {
            const dateUtil = new DateUtil({
                withTimezone: false,
                useUtcDates: true
            });
            const date = moment("2018-10-15T12:00:00.000").toDate();
            const stringified = dateUtil.stringify(date);

            const expected = new Date(2018, 9, 15, date.getHours() - LOCAL_TIMEZONE_OFFSET_HOURS, 0, 0, 0);
            const expectedStringified = moment(expected).format(DateUtil.DEFAULT_DATE_FORMAT) + "Z";
            assert.strictEqual(stringified, expectedStringified);

            const parsed = dateUtil.parse(stringified);
            assert.strictEqual(parsed.getHours(), date.getHours());
            assert.strictEqual(parsed.toISOString(), date.toISOString());
        });

    });

    describe("with timezones", function () {

        it("should properly parse & format date (without UTC dates)", async function () {
            const dateUtil = new DateUtil({
                withTimezone: true
            });

            const hour6 = 12;
            const timezoneOffsetHours = 6;
            const date = moment.parseZone(`2018-10-15T${hour6}:00:00.0000000+06:00`).toDate();
            // preconditions check
            assert.strictEqual(
                date.getHours(), hour6 - timezoneOffsetHours + LOCAL_TIMEZONE_OFFSET_HOURS);

            const expectedHours = date.getHours();
            const expected = new Date(2018, 9, 15, expectedHours, 0, 0, 0);
            const expectedStringified = 
                moment(expected).format(DateUtil.DEFAULT_DATE_FORMAT) + LOCAL_TIMEZONE_STRING;
            const stringified = dateUtil.stringify(date);
            assert.strictEqual(stringified, expectedStringified);

            const parsed = dateUtil.parse(stringified);
            assert.strictEqual(parsed.getHours(), date.getHours());
            assert.strictEqual(parsed.toISOString(), date.toISOString());
        });

        it("should properly format regular date using UTC dates", async function () {
            const dateUtil = new DateUtil({
                withTimezone: true,
                useUtcDates: true
            });

            const hour6 = 12;
            const timezoneOffsetHours = 6;
            const date = moment.parseZone(`2018-10-15T${hour6}:00:00.0000000+06:00`).toDate();
            // preconditions check
            assert.strictEqual(
                date.getHours(), hour6 - timezoneOffsetHours + LOCAL_TIMEZONE_OFFSET_HOURS);

            const expectedHours = date.getHours() - LOCAL_TIMEZONE_OFFSET_HOURS;
            const utcTimezoneString = "+00:00";
            const expected = new Date(2018, 9, 15, expectedHours, 0, 0, 0);
            const expectedStringified = 
                moment(expected).format(DateUtil.DEFAULT_DATE_FORMAT) + utcTimezoneString;
            const stringified = dateUtil.stringify(date);
            assert.strictEqual(stringified, expectedStringified);

            const parsed = dateUtil.parse(stringified);
            assert.strictEqual(parsed.getHours(), date.getHours());
            assert.strictEqual(parsed.toISOString(), date.toISOString());
        });

    });

});

describe("[RDBC-236] Dates storage", function () {

    let store: IDocumentStore;

    describe("storing timezone info", function () {

        beforeEach(async function () {
            testContext.customizeStore = async store => {
                store.conventions.storeDatesWithTimezoneInfo = true;
                store.conventions.findCollectionNameForObjectLiteral = () => "tests";
            };
            store = await testContext.getDocumentStore();
        });

        afterEach(function () {
            testContext.customizeStore = null;
        });

        afterEach(async () =>
            await disposeTestDocumentStore(store));

        it("can store & load date", async () => {
            const hoursLocal = 13;
            const date = new Date(2018, 9, 12, hoursLocal, 10, 10, 0);

            {
                const session = store.openSession();
                await session.store({
                    start: date
                }, "date/1");
                await session.saveChanges();
            }
            
            {
                const cmd = new GetDocumentsCommand({
                    ids: [ "date/1" ],
                    start: 0,
                    pageSize: 1,
                    conventions: store.conventions
                });
                await store.getRequestExecutor().execute(cmd);
                assert.strictEqual(
                    cmd.result.results[0]["start"], "2018-10-12T13:10:10.0000000" + LOCAL_TIMEZONE_STRING);
            }

            {
                const session = store.openSession();
                const loaded = await session.load("date/1");
                const { start } = loaded as any;
                assert.strictEqual(start.getHours(), date.getHours());
                assert.strictEqual(start.toString(), date.toString());
            }
        });

    });

    describe("store dates as UTC", function () {

        beforeEach(async function () {
            testContext.customizeStore = async store => {
                store.conventions.storeDatesInUtc = true;
                store.conventions.findCollectionNameForObjectLiteral = () => "tests";
            };
            store = await testContext.getDocumentStore();
        });

        afterEach(function () {
            testContext.customizeStore = null;
        });

        afterEach(async () =>
            await disposeTestDocumentStore(store));

        it("can properly store & load date", async () => {
            const hoursLocal = 13;
            const date = new Date(2018, 9, 12, hoursLocal, 10, 10, 0);

            {
                const session = store.openSession();
                await session.store({
                    start: date
                }, "date/1");
                await session.saveChanges();
            }
            
            {
                const cmd = new GetDocumentsCommand({
                    ids: [ "date/1" ],
                    start: 0,
                    pageSize: 1,
                    conventions: store.conventions
                });
                await store.getRequestExecutor().execute(cmd);
                const hoursUtcString = StringUtil.leftPad(
                    (hoursLocal - LOCAL_TIMEZONE_OFFSET_HOURS).toString(), 2, "0");
                assert.strictEqual(
                    cmd.result.results[0]["start"], `2018-10-12T${hoursUtcString}:10:10.0000000Z`);
            }

            {
                const session = store.openSession();
                const loaded = await session.load("date/1");
                const { start } = loaded as any;
                assert.strictEqual(start.getHours(), date.getHours());
                assert.strictEqual(start.toString(), date.toString());
            }
        });

    });

    describe("store dates as UTC with timezone info", function () {

        beforeEach(async function () {
            testContext.customizeStore = async store => {
                store.conventions.storeDatesWithTimezoneInfo = true;
                store.conventions.storeDatesInUtc = true;
                store.conventions.findCollectionNameForObjectLiteral = () => "tests";
            };
            store = await testContext.getDocumentStore();
        });

        afterEach(function () {
            testContext.customizeStore = null;
        });

        afterEach(async () =>
            await disposeTestDocumentStore(store));

        it("can store & load date", async () => {
            const hoursLocal = 13;
            const date = new Date(2018, 9, 12, hoursLocal, 10, 10, 0);

            {
                const session = store.openSession();
                await session.store({
                    start: date
                }, "date/1");
                await session.saveChanges();
            }
            
            {
                const cmd = new GetDocumentsCommand({
                    ids: [ "date/1" ],
                    start: 0,
                    pageSize: 1,
                    conventions: store.conventions
                });
                await store.getRequestExecutor().execute(cmd);
                const hoursUtcString = StringUtil.leftPad(
                    (hoursLocal - LOCAL_TIMEZONE_OFFSET_HOURS).toString(), 2, "0");
                assert.strictEqual(
                    cmd.result.results[0]["start"], 
                    `2018-10-12T${hoursUtcString}:10:10.0000000+00:00`);
            }

            {
                const session = store.openSession();
                const loaded = await session.load("date/1");
                const { start } = loaded as any;
                assert.strictEqual(start.getHours(), date.getHours());
                assert.strictEqual(start.toString(), date.toString());
            }
        });

    });

});
