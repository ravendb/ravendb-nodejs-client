import { DateUtil } from "../../src/index.js";
import { format, parse } from "date-fns";
import assert from "node:assert";

function toServerLocalFormat(date: Date): string {
    const pad = (value: number, width = 2) => String(value).padStart(width, "0");
    return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
        + `.${pad(date.getMilliseconds(), 3)}${pad(date.getMilliseconds() % 7, 4)}`;
}

function parseWithDateFns(dateString: string): Date {
    return parse(dateString.slice(0, 23) + "0000", DateUtil.DEFAULT_DATE_FORMAT, new Date());
}

function instantsAcross(year: number, stepMinutes: number): Date[] {
    const start = new Date(0);
    start.setUTCFullYear(year, 0, 1);
    const end = new Date(0);
    end.setUTCFullYear(year + 1, 0, 1);
    const instants = [];
    for (let time = start.getTime(); time < end.getTime(); time += stepMinutes * 60_000 + 1_234) {
        instants.push(new Date(time));
    }
    return instants;
}

describe("DateUtil.parse", function () {

    it("parses local dates the same as date-fns across years and DST transitions", function () {
        const samples = [
            ...instantsAcross(2026, 17),
            ...[1, 99, 100, 1582, 1900, 1970, 2000, 2038, 9999].flatMap(year => instantsAcross(year, 24 * 60 + 61)),
        ].map(toServerLocalFormat);

        for (const sample of samples) {
            assert.strictEqual(DateUtil.default.parse(sample).getTime(), parseWithDateFns(sample).getTime(), sample);
        }
    });

    it("resolves local times in a DST gap the same as date-fns", function () {
        for (const sample of ["2026-03-29T02:30:00.0000000", "2026-03-08T02:30:00.0000000", "2026-10-25T02:30:00.0000000"]) {
            assert.strictEqual(DateUtil.default.parse(sample).getTime(), parseWithDateFns(sample).getTime(), sample);
        }
    });

    it("rejects out-of-range values", function () {
        const samples = [
            "0000-01-01T00:00:00.0000000",
            "2026-02-29T00:00:00.0000000",
            "2026-13-01T00:00:00.0000000",
            "2026-01-32T00:00:00.0000000",
            "2026-01-01T24:00:00.0000000",
            "2026-01-01T00:60:00.0000000",
            "2026-01-01T00:00:60.0000000",
        ];

        for (const sample of samples) {
            assert.throws(() => DateUtil.default.parse(sample), /Could not parse date string/, sample);
        }
    });

    it("keeps millisecond precision and ignores sub-millisecond digits", function () {
        const parsed = DateUtil.default.parse("2026-01-01T01:06:00.1239999");

        assert.strictEqual(parsed.getTime(), new Date(2026, 0, 1, 1, 6, 0, 123).getTime());
    });
});

describe("DateUtil.stringify", function () {

    it("formats local dates the same as date-fns across years and DST transitions", function () {
        const samples = [
            ...instantsAcross(2026, 17),
            ...[1, 99, 100, 1582, 1900, 1970, 2000, 2038, 9999].flatMap(year => instantsAcross(year, 24 * 60 + 61)),
        ];

        for (const sample of samples) {
            assert.strictEqual(DateUtil.default.stringify(sample), format(sample, DateUtil.DEFAULT_DATE_FORMAT), sample.toISOString());
        }
    });

    it("formats years outside 1-9999 and rejects invalid dates like date-fns", function () {
        const farFuture = new Date(0);
        farFuture.setFullYear(12345, 5, 6);
        const yearZero = new Date(0);
        yearZero.setFullYear(0, 5, 6);
        const negativeYear = new Date(0);
        negativeYear.setFullYear(-44, 2, 15);

        for (const sample of [farFuture, yearZero, negativeYear]) {
            assert.strictEqual(DateUtil.default.stringify(sample), format(sample, DateUtil.DEFAULT_DATE_FORMAT), sample.toISOString());
        }
        assert.throws(() => DateUtil.default.stringify(new Date(NaN)), RangeError);
    });
});
