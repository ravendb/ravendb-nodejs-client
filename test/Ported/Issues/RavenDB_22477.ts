import {
    AbstractCsharpCountersIndexCreationTask,
    AbstractCsharpTimeSeriesIndexCreationTask,
    AbstractMultiMapCountersIndexCreationTask,
    AbstractMultiMapTimeSeriesIndexCreationTask,
    AbstractRawJavaScriptCountersIndexCreationTask,
    AbstractRawJavaScriptTimeSeriesIndexCreationTask
} from "../../../src/index.js";
import { INDEXES } from "../../../src/Constants.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class MyCounterIndex extends AbstractRawJavaScriptCountersIndexCreationTask {
    public constructor() {
        super();

        this.maps = new Set([
            "counters.map('Companies', 'HeartRate', function (counter) {\n" +
            "return {\n" +
            "    HeartBeat: counter.Value,\n" +
            "    Name: counter.Name,\n" +
            "    User: counter.DocumentId\n" +
            "};\n" +
            "})"
        ]);

        this.searchEngineType = "Corax";
    }
}

class AverageHeartRate extends AbstractCsharpCountersIndexCreationTask {
    public constructor() {
        super();

        this.map = "from counter in counters.Users.HeartRate " +
            "select new { HeartBeat = counter.Value, Count = 1, Name = counter.Name }";

        this._reduce = "from r in results " +
            "group r by r.Name into g " +
            "let sumHeartBeat = g.Sum(x => x.HeartBeat) " +
            "let sumCount = g.Sum(x => x.Count) " +
            "select new { HeartBeat = sumHeartBeat / sumCount, Name = g.Key, Count = sumCount }";

        this.searchEngineType = "Corax";
    }
}

class CounterMapReduceIndexForMultipleCounterGroups extends AbstractMultiMapCountersIndexCreationTask {
    public constructor() {
        super();

        for (let i = 0; i < 100; i++) {
            this._addMap(`from counter in counters.Users.Counter${i} select new { Value = counter.Value, Count = 1 }`);
        }

        this._reduce = "from result in results " +
            "group result by new { result.Value } into g " +
            "select new { Value = g.Key.Value, Count = g.Sum(r => r.Count) }";

        this.searchEngineType = "Corax";
    }
}

class MyTsIndex extends AbstractRawJavaScriptTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.maps = new Set([
            "timeSeries.map('Companies', 'HeartRate', function (ts) {\n" +
            "return ts.Entries.map(entry => ({\n" +
            "        HeartBeat: entry.Values[0],\n" +
            "        Date: new Date(entry.Timestamp.getFullYear(), entry.Timestamp.getMonth(), entry.Timestamp.getDate()),\n" +
            "        User: ts.DocumentId\n" +
            "    }));\n" +
            "})"
        ]);

        this.searchEngineType = "Corax";
    }
}

class MyTsIndex_Strong extends AbstractCsharpTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.map = "from ts in timeSeries.Companies.HeartRate " +
            "from entry in ts.Entries " +
            "select new { HeartBeat = entry.Values[0], entry.Timestamp.Date, User = ts.DocumentId }";

        this.searchEngineType = "Corax";
    }
}

class TimeSeriesIndex extends AbstractMultiMapTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        for (const timeSeriesName of ["Heartrate", "Heartrate@By6Hours", "Heartrate@By1Day", "Heartrate@By30Minutes", "Heartrate@By1Hour"]) {
            this._addMap(`from ts in timeSeries.Users["${timeSeriesName}"] ` +
                "from entry in ts.Entries " +
                "select new { Name = ts.Name, Value = entry.Value, Start = ts.Start, End = ts.End }");
        }

        this.searchEngineType = "Corax";
    }
}

describe("RavenDB_22477", function () {

    it("indexes searchEngineType is respected counters", () => {
        const indexDefinition1 = new MyCounterIndex().createIndexDefinition();
        assertThat(indexDefinition1.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE]).isEqualTo("Corax");

        const indexDefinition2 = new AverageHeartRate().createIndexDefinition();
        assertThat(indexDefinition2.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE]).isEqualTo("Corax");

        const indexDefinition3 = new CounterMapReduceIndexForMultipleCounterGroups().createIndexDefinition();
        assertThat(indexDefinition3.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE]).isEqualTo("Corax");
    });

    it("indexes searchEngineType is respected time series", () => {
        const indexDefinition1 = new MyTsIndex().createIndexDefinition();
        assertThat(indexDefinition1.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE]).isEqualTo("Corax");

        const indexDefinition2 = new MyTsIndex_Strong().createIndexDefinition();
        assertThat(indexDefinition2.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE]).isEqualTo("Corax");

        const indexDefinition3 = new TimeSeriesIndex().createIndexDefinition();
        assertThat(indexDefinition3.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE]).isEqualTo("Corax");
    });
});
