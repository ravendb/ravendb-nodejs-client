import assert from "node:assert";
import { DocumentConventions } from "../../../src/index.js";

describe("DocumentConventions.registerQueryValueConverter", function () {

    class Money {
    }

    class Euro extends Money {
    }

    function convert(conventions: DocumentConventions, value: object) {
        let converted: string;
        conventions.tryConvertValueToObjectForQuery("price", value, false, v => converted = v);
        return converted;
    }

    it("keeps a subclass converter ahead of a base class converter registered later", () => {
        const conventions = new DocumentConventions();
        conventions.registerQueryValueConverter(Euro, (fieldName, value, forRange, stringValue) => {
            stringValue("euro");
            return true;
        });
        conventions.registerQueryValueConverter(Money, (fieldName, value, forRange, stringValue) => {
            stringValue("money");
            return true;
        });

        assert.strictEqual(convert(conventions, new Euro()), "euro");
        assert.strictEqual(convert(conventions, new Money()), "money");
    });

    it("puts a subclass converter ahead of a base class converter registered earlier", () => {
        const conventions = new DocumentConventions();
        conventions.registerQueryValueConverter(Money, (fieldName, value, forRange, stringValue) => {
            stringValue("money");
            return true;
        });
        conventions.registerQueryValueConverter(Euro, (fieldName, value, forRange, stringValue) => {
            stringValue("euro");
            return true;
        });

        assert.strictEqual(convert(conventions, new Euro()), "euro");
        assert.strictEqual(convert(conventions, new Money()), "money");
    });
});
