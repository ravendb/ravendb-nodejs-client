import assert from "node:assert";
import { DocumentStore } from "../../../src/index.js";
import { DocumentQuery } from "../../../src/Documents/Session/DocumentQuery.js";

class Order {
    public id: string;
    public company: string;
    public freight: number;
    public name: string;
}

// Offline: builds the RQL only, nothing is sent to a server.
describe("addFromAliasToOrderByTokens", function () {

    let store: DocumentStore;

    beforeEach(() => {
        store = new DocumentStore("http://localhost:8080", "db");
        store.initialize();
    });

    afterEach(() => store.dispose());

    function query(): DocumentQuery<Order> {
        return store.openSession().query<Order>({ collection: "Orders" }) as DocumentQuery<Order>;
    }

    it("prefixes order by fields with the alias, keeping ordering and direction", () => {
        const q = query()
            .whereEquals("company", "companies/1")
            .orderBy("freight", "Double")
            .orderByDescending("name") as DocumentQuery<Order>;

        q.addFromAliasToWhereTokens("o");
        q.addFromAliasToOrderByTokens("o");

        assert.strictEqual(q.toString(),
            "from 'Orders' where o.company = $p0 order by o.freight as double, o.name desc");
    });

    it("keeps the ordering type and nulls ordering after aliasing", () => {
        const q = query()
            .orderBy("name", "First", "AlphaNumeric") as DocumentQuery<Order>;

        q.addFromAliasToOrderByTokens("o");

        assert.strictEqual(q.toString(), "from 'Orders' order by o.name as alphaNumeric nulls first");
    });

    it("leaves id() and RQL methods untouched", () => {
        const q = query()
            .orderBy("id()")
            .orderByScore()
            .randomOrdering() as DocumentQuery<Order>;

        q.addFromAliasToOrderByTokens("o");

        assert.strictEqual(q.toString(), "from 'Orders' order by id(), score(), random()");
    });
});
