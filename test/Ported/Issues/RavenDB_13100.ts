import { IndexDefinitionHelper } from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_13100", function () {

    it("canDetectTimeSeriesIndexSourceMethodSyntax", () => {
        const map = "timeSeries.Companies.SelectMany(ts => ts.Entries, (ts, entry) => new {" +
            "   HeartBeat = entry.Values[0], " +
            "   Date = entry.Timestamp.Date, " +
            "   User = ts.DocumentId " +
            "});";

        assertThat(IndexDefinitionHelper.detectStaticIndexSourceType(map))
            .isEqualTo("TimeSeries");
    });

    it("canDetectDocumentsIndexSourceMethodSyntax", () => {
        const map = "docs.Users.OrderBy(user => user.Id).Select(user => new { user.Name })";

        assertThat(IndexDefinitionHelper.detectStaticIndexSourceType(map))
            .isEqualTo("Documents");
    });

    it("canDetectTimeSeriesIndexSourceLinqSyntaxAllTs", () => {
        const map = "from ts in timeSeries";
        assertThat(IndexDefinitionHelper.detectStaticIndexSourceType(map))
            .isEqualTo("TimeSeries");
    });

    it("canDetectTimeSeriesIndexSourceLinqSyntaxSingleTs", () => {
        const map = "from ts in timeSeries.Users";
        assertThat(IndexDefinitionHelper.detectStaticIndexSourceType(map))
            .isEqualTo("TimeSeries");
    });

    it("canDetectTimeSeriesIndexSourceLinqSyntaxCanStripWhiteSpace", () => {
        const map = "\t\t  \t from    ts  \t \t in  \t \t timeSeries.Users";
        assertThat(IndexDefinitionHelper.detectStaticIndexSourceType(map))
            .isEqualTo("TimeSeries");
    });
});
