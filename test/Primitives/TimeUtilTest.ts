import { assertThat } from "../Utils/AssertExtensions";
import { TimeUtil } from "../../src/Utility/TimeUtil";

describe("TimeUtil", function () {

    it("millisToTimeSpan", async () => {
        assertThat(TimeUtil.millisToTimeSpan(0))
            .isEqualTo("00:00:00");

        assertThat(TimeUtil.millisToTimeSpan(2 * 1000))
            .isEqualTo("00:00:02");

        assertThat(TimeUtil.millisToTimeSpan(3 * 60 * 1000))
            .isEqualTo("00:03:00");

        assertThat(TimeUtil.millisToTimeSpan(4 * 3600 * 1000))
            .isEqualTo("04:00:00");

        assertThat(TimeUtil.millisToTimeSpan(24 * 3600 * 1000))
            .isEqualTo("1.00:00:00");

        assertThat(TimeUtil.millisToTimeSpan(2 /* days */ * 24 * 3600 * 1000)
            + 5 /* hours */ * 3600 * 1000
            + 3 /* minutes */ * 60 * 1000
            + 7 /* seconds */ * 1000)
            .isEqualTo("2.05:03:07");

        assertThat(TimeUtil.millisToTimeSpan(2))
            .isEqualTo("00:00:00.0020000");
    });

    it("timeSpanToDuration", () => {
        assertThat(TimeUtil.timeSpanToDuration("00:00:01"))
            .isEqualTo(1000);

        assertThat(TimeUtil.timeSpanToDuration("00:00:00"))
            .isEqualTo(0);

        assertThat(TimeUtil.timeSpanToDuration("2.00:00:01"))
            .isEqualTo(2 * 24 * 3600 * 1000 + 1000);

        assertThat(TimeUtil.timeSpanToDuration("00:00:00.1234"))
            .isEqualTo(123);
    });
});