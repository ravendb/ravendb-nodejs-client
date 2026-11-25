import { IDocumentStore } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";
import { User } from "../Assets/Entities.js";

class Company {
    public id: string;
    public name: string;
}

class OrderLine {
    public pricePerUnit: number;
    public quantity: number;
    public discount = 0;
}

class Order {
    public id: string;
    public company: string;
    public lines: OrderLine[];
}

function order(company: string, lines: Partial<OrderLine>[]): Order {
    return Object.assign(new Order(), {
        company,
        lines: lines.map(line => Object.assign(new OrderLine(), line))
    });
}

describe("Query", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("raw query with transformation function should work", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "Acme Inc." }), "Companies/1");
            await session.store(Object.assign(new Company(), { name: "Evil Corp" }), "Companies/2");

            await session.store(order("companies/1", [
                { pricePerUnit: 1.0, quantity: 3 },
                { pricePerUnit: 1.5, quantity: 3 }
            ]), "orders/1$companies/1");
            await session.store(order("companies/1", [
                { pricePerUnit: 1.0, quantity: 5 }
            ]), "orders/2$companies/1");
            await session.store(order("companies/2", [
                { pricePerUnit: 3.0, quantity: 6, discount: 3.5 },
                { pricePerUnit: 8.0, quantity: 3, discount: 3.5 },
                { pricePerUnit: 1.8, quantity: 2 }
            ]), "orders/3$companies/2");
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const rawQuery = await session.advanced.rawQuery<{ companyName: string }>(`
                DECLARE function companyNameAndTotalSumSpent(o)
                {
                  var totalSumInLines = 0;
                  for(var i = 0; i < o.lines.length; i++)
                  {
                      var l = o.lines[i];
                      totalSumInLines = l.pricePerUnit * l.quantity - l.discount;
                  }

                  var company = load(o.company);

                  return { orderedAt: o.orderedAt, companyName: company.name, totalSumSpent: totalSumInLines };
                }

                FROM Orders as o
                SELECT companyNameAndTotalSumSpent(o)
            `).all();

            assertThat(rawQuery).isNotEmpty();
            assertThat(rawQuery).hasSize(3);
            assertThat(rawQuery.every(item => item !== null && item !== undefined)).isTrue();

            for (const item of rawQuery) {
                assertThat(item.companyName === "Acme Inc." || item.companyName === "Evil Corp").isTrue();
            }
        }
    });

    it("query over max size of term", async () => {
        const newSession = store.openSession();
        const longName = "x".repeat(700);
        await newSession.store(Object.assign(new User(), { name: longName }), "users/1");
        await newSession.saveChanges();

        const queryResult = await newSession.query(User)
            .whereEquals("name", longName)
            .all();

        assertThat(queryResult).hasSize(1);
    });
});
