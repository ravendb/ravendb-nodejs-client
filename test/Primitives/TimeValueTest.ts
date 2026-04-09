import assert from "node:assert";
import { describe, it } from "node:test";
import { TimeValue } from "../../src/Primitives/TimeValue.js";

describe("TimeValue.compareTo", function () {

    it("cross-unit comparison should compare other value, not self", function () {
        const twoMonths = TimeValue.ofMonths(2);
        const thirtySeconds = TimeValue.ofSeconds(30);

        const result = twoMonths.compareTo(thirtySeconds);
        assert.ok(result > 0,
            "2 months should be greater than 30 seconds, got compareTo=" + result);

        const reverse = thirtySeconds.compareTo(twoMonths);
        assert.ok(reverse < 0,
            "30 seconds should be less than 2 months, got compareTo=" + reverse);
    });

    it("MIN_VALUE compared to MIN_VALUE should be 0", function () {
        const result = TimeValue.MIN_VALUE.compareTo(TimeValue.MIN_VALUE);
        assert.strictEqual(result, 0,
            "MIN_VALUE.compareTo(MIN_VALUE) should be 0, got " + result);
    });

    it("MAX_VALUE compared to MAX_VALUE should be 0", function () {
        const result = TimeValue.MAX_VALUE.compareTo(TimeValue.MAX_VALUE);
        assert.strictEqual(result, 0,
            "MAX_VALUE.compareTo(MAX_VALUE) should be 0, got " + result);
    });

    it("MIN_VALUE should be less than any normal value", function () {
        const normal = TimeValue.ofSeconds(1);
        const result = TimeValue.MIN_VALUE.compareTo(normal);
        assert.ok(result < 0,
            "MIN_VALUE should be less than 1 second, got compareTo=" + result);
    });

    it("MAX_VALUE should be greater than any normal value", function () {
        const normal = TimeValue.ofSeconds(1);
        const result = TimeValue.MAX_VALUE.compareTo(normal);
        assert.ok(result > 0,
            "MAX_VALUE should be greater than 1 second, got compareTo=" + result);
    });
});
