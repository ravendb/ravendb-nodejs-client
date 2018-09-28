import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {IDocumentStore} from "../../src";
import {GetDocumentsCommand} from "../../src/Documents/Commands/GetDocumentsCommand";

describe("CustomSerializationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        testContext.customizeStore = async store => {
            const conventions = store.conventions;

            /* TODO (Greg)
               SimpleModule module = new SimpleModule();
                module.addSerializer(new MoneySerializer());
                module.addDeserializer(Money.class, new MoneyDeserializer());

                conventions.getEntityMapper().registerModule(module);
             */

            conventions.registerQueryValueConverter<Money>(Money, (fieldName, value, forRange, objectValue) => {
                objectValue(value.toJSON());
                return true;
            });
        };
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it.skip("can use custom serialization", async () => {
        {
            const session = store.openSession();
            const product1 = new Product();
            product1.name = "iPhone";
            product1.price = Money.forDollars(9999);

            const product2 = new Product();
            product2.name = "Camera";
            product2.price = Money.forEuro(150);

            const product3 = new Product();
            product3.name = "Bread";
            product3.price = Money.forDollars(2);

            await session.store(product1);
            await session.store(product2);
            await session.store(product3);
            await session.saveChanges();
        }

        // verify if value was properly serialized
        {
            const command = new GetDocumentsCommand({
                id: "products/1-A",
                conventions: store.conventions
            });
            await store.getRequestExecutor().execute(command);

            const productJson = command.result.results[0];
            assert.strictEqual(productJson.price, "9999 USD");
        }

        // verify if query properly serialize value
        {
            const session = store.openSession();
            const productsForTwoDollars = await session.query<Product>(Product)
                .whereEquals("price", Money.forDollars(2))
                .all();

            assert.strictEqual(productsForTwoDollars.length, 1);
            assert.strictEqual(productsForTwoDollars[0].name, "Bread");
        }
    });
});

export class Product {
    public name: string;
    public price: Money;
}

export class Money {
    public currency: string;
    public amount: number;

    constructor();
    constructor(amount: number, currency: string)
    constructor(amount?: number, currency?: string) {
        this.currency = currency;
        this.amount = amount;
    }

    public static forDollars(amount: number) {
        return new Money(amount, "USD");
    }

    public static forEuro(amount: number) {
        return new Money(amount, "EUR");
    }

    public toJSON() {
        return this.amount + " " + this.currency;
    }
}
