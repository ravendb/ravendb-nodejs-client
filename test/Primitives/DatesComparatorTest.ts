import moment = require("moment");
import { assertThat } from "../Utils/AssertExtensions";
import { DatesComparator, leftDate, rightDate } from "../../src/Primitives/DatesComparator";

describe("DatesComparatorTest", function () {

    it("canCompareDefinedDates", () => {
        const first = moment().toDate();
        const second = moment().add(1, "day").toDate();

        assertThat(DatesComparator.compare(leftDate(first), rightDate(second)))
            .isLessThan(0);

        assertThat(DatesComparator.compare(leftDate(first), rightDate(first)))
            .isEqualTo(0);
    });

    it("canCompareDatesWithNullUsingContext", () => {
        const first = moment().toDate();

        assertThat(DatesComparator.compare(leftDate(first), rightDate(null)))
            .isLessThan(0);

        assertThat(DatesComparator.compare(leftDate(null), rightDate(first)))
            .isLessThan(0);

        assertThat(DatesComparator.compare(leftDate(null), rightDate(null)))
            .isLessThan(0);

        assertThat(DatesComparator.compare(leftDate(null), leftDate(null)))
            .isEqualTo(0);

        assertThat(DatesComparator.compare(rightDate(null), rightDate(null)))
            .isEqualTo(0);
    });
});
