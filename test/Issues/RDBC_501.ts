import { IDocumentStore, TimeSeriesAggregationResult, TimeSeriesValue } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";

import moment = require("moment");
import { assertThat } from "../Utils/AssertExtensions";
 
class SymbolPrice {
    open: number;
    close: number;
    high: number;
    low: number;

    static TIME_SERIES_VALUES: TimeSeriesValue<SymbolPrice> = [
        { field: "open", name: "Open" },
        { field: "close", name: "Close" },
        { field: "high", name: "High" },
        { field: "low", name: "Low" },
    ];
}

class MarketSymbol {

}

describe("RDBC-501", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("should properly map typed entries", async function () {

        const baseLine = moment().startOf("day");

        {
            const session = store.openSession();
            const symbol = new MarketSymbol();
            await session.store(symbol, "markerSymbols/1-A");

            const price1 = new SymbolPrice();
            price1.low = 1;
            price1.high = 10;
            price1.open = 4;
            price1.close = 7;

            const price2 = new SymbolPrice();
            price2.low = 21;
            price2.high = 210;
            price2.open = 24;
            price2.close = 27;

            const price3 = new SymbolPrice();
            price3.low = 321;
            price3.high = 310;
            price3.open = 34;
            price3.close = 37;

            const tsf = session.timeSeriesFor<SymbolPrice>(symbol, "history", SymbolPrice);

            tsf.append(baseLine.clone().add(1, "hours").toDate(), price1);
            tsf.append(baseLine.clone().add(2, "hours").toDate(), price2);
            tsf.append(baseLine.clone().add(2, "days").toDate(), price3);

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const aggregatedHistoryQueryResult = await session
                .query(MarketSymbol)
                .selectTimeSeries(
                    (builder) =>
                        builder.raw(
                            `from history 
          group by '1 days'
          select first(), last(), min(), max()`
                        ),
                    TimeSeriesAggregationResult
                )
                .firstOrNull();

            assertThat(aggregatedHistoryQueryResult.results)
                .hasSize(2);

            const typed = aggregatedHistoryQueryResult.asTypedEntry(SymbolPrice);
            assertThat(typed.results)
                .hasSize(2);

            const firstResult = typed.results[0];
            assertThat(firstResult.min.open)
                .isEqualTo(4);
            assertThat(firstResult.min.close)
                .isEqualTo(7);
            assertThat(firstResult.min.low)
                .isEqualTo(1);
            assertThat(firstResult.min.high)
                .isEqualTo(10);

            assertThat(firstResult.first.open)
                .isEqualTo(4);
            assertThat(firstResult.first.close)
                .isEqualTo(7);
            assertThat(firstResult.first.low)
                .isEqualTo(1);
            assertThat(firstResult.first.high)
                .isEqualTo(10);

            const secondResult = typed.results[1];
            assertThat(secondResult.min.open)
                .isEqualTo(34);
            assertThat(secondResult.min.close)
                .isEqualTo(37);
            assertThat(secondResult.min.low)
                .isEqualTo(321);
            assertThat(secondResult.min.high)
                .isEqualTo(310);
        }
    });
});