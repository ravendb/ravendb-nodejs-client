import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import {
    AbstractCsharpIndexCreationTask,
} from "../../src/Documents/Indexes/AbstractCsharpIndexCreationTask";
import { assertThat } from "../Utils/AssertExtensions";
import { GetIndexOperation } from "../../src/Documents/Operations/Indexes/GetIndexOperation";

describe("RavenDB_12932", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canPersistPatternForOutputReduceToCollectionReferences", async () => {
        const indexToCreate = new Orders_ProfitByProductAndOrderedAt("CustomCollection");
        await indexToCreate.execute(store);

        const indexDefinition = await store.maintenance.send(new GetIndexOperation("Orders/ProfitByProductAndOrderedAt"));

        assertThat(indexDefinition.outputReduceToCollection)
            .isEqualTo("Profits");
        assertThat(indexDefinition.patternForOutputReduceToCollectionReferences)
            .isEqualTo("reports/daily/{OrderedAt:yyyy-MM-dd}");
        assertThat(indexDefinition.patternReferencesCollectionName)
            .isEqualTo("CustomCollection");
    });
});

// tslint:disable-next-line:class-name
class Orders_ProfitByProductAndOrderedAt extends AbstractCsharpIndexCreationTask {
    public constructor(referencesCollectionName: string) {
        super();

        this.map = "docs.Orders.SelectMany(order => order.Lines, (order, line) => new {\n" +
            "    Product = line.Product,\n" +
            "    OrderedAt = order.OrderedAt,\n" +
            "    Profit = (((decimal) line.Quantity) * line.PricePerUnit) * (1M - line.Discount)\n" +
            "})";

        this.reduce = "results.GroupBy(r => new {\n" +
            "    OrderedAt = r.OrderedAt,\n" +
            "    Product = r.Product\n" +
            "}).Select(g => new {\n" +
            "    Product = g.Key.Product,\n" +
            "    OrderedAt = g.Key.OrderedAt,\n" +
            "    Profit = Enumerable.Sum(g, r => ((decimal) r.Profit))\n" +
            "})";

        this.outputReduceToCollection = "Profits";
        this.patternForOutputReduceToCollectionReferences = "reports/daily/{OrderedAt:yyyy-MM-dd}";
        this.patternReferencesCollectionName = referencesCollectionName;
    }
}
