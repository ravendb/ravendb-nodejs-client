import * as assert from "assert";

import { HashCalculator } from "../../../src/Documents/Queries/HashCalculator";
import { TypesAwareObjectMapper } from "../../../src/Mapping/ObjectMapper";

const mockObjectMapper = {
    toObjectLiteral: obj => obj.toString()
} as TypesAwareObjectMapper;

const hash = data => {
    const calculator = new HashCalculator();
    calculator.write(data, mockObjectMapper);
    return calculator.getHash();
}

describe('Hash calculator tests', () => {
    it('Calculates the same hash for the same object', async () => {
        const obj = {
            boolean: true,
            function: () => {
                console.log('No-op')
            },
            number: 4,
            object: {
                property: 'value'
            },
            string: 'hello',
            symbol: Symbol('world'),
            undefined: undefined,
        };

        assert.equal(hash(obj), hash(obj));
        assert.equal(hash(obj), hash({ ...obj }));
    });

    it('Calculates different hashes for different types', async () => {
        assert.notEqual(hash(1), hash(true))
        assert.notEqual(hash('1'), hash(true))
        assert.notEqual(hash(1), hash('1'))
    });

    it('Calculates different hashes for different numbers', async () => {
        assert.notEqual(hash(1), hash(257));
        assert.notEqual(hash(86400), hash(0));
    });
});
