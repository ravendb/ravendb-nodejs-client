import * as assert from "assert";
import * as moment from "moment";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PutDocumentCommand,
} from "../../src";
import { DateUtil } from "../../src/Utility/DateUtil";
import { GetDocumentsCommand } from "../../src/Documents/Commands/GetDocumentsCommand";

describe("DateUtil", function () {

    describe("without timezones", function () {

        it("should properly parse & format date (without UTC dates)", async function () {
            const dateUtil = new DateUtil({
                withTimezone: false
            });
            const date = new Date(2018, 9, 15, 9, 46, 28, 306);
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
            const date = new Date(2018, 9, 15, 9, 46, 28, 306);
            const stringified = dateUtil.stringify(date);
            assert.strictEqual(stringified, "2018-10-15T07:46:28.3060000Z");

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
            const date = moment.parseZone("2018-10-15T09:46:28.3060000+06:00").toDate();
            assert.strictEqual(date.getHours(), 5);

            const stringified = dateUtil.stringify(date);
            assert.strictEqual(stringified, "2018-10-15T05:46:28.3060000+02:00");

            const parsed = dateUtil.parse(stringified);
            assert.strictEqual(parsed.getHours(), date.getHours());
            assert.strictEqual(parsed.toISOString(), date.toISOString());
        });

        it("should properly format regular date using UTC dates", async function () {
            const dateUtil = new DateUtil({
                withTimezone: true,
                useUtcDates: true
            });
            const date = moment.parseZone("2018-10-15T09:46:28.3060000+06:00").toDate();
            assert.strictEqual(date.getHours(), 5);

            const stringified = dateUtil.stringify(date);
            assert.strictEqual(stringified, "2018-10-15T03:46:28.3060000+00:00");

            const parsed = dateUtil.parse(stringified);
            assert.strictEqual(parsed.getHours(), date.getHours());
            assert.strictEqual(parsed.toISOString(), date.toISOString());
        });

    });

});

describe("[RDBC-236] Dates storage", function () {

    let store: IDocumentStore;

    describe("store timezone info", function () {

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

        it("can store & load date with timezone info", async () => {
            const date = new Date(2018, 9, 12, 13, 10, 10, 0);

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
                    cmd.result.results[0]["start"], "2018-10-12T13:10:10.0000000+02:00");
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
            const date = new Date(2018, 9, 12, 13, 10, 10, 0);

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
                    cmd.result.results[0]["start"], "2018-10-12T11:10:10.0000000Z");
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

        it("can store & load date with timezone info", async () => {
            const date = new Date(2018, 9, 12, 13, 10, 10, 0);

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
                    cmd.result.results[0]["start"], "2018-10-12T11:10:10.0000000+00:00");
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
