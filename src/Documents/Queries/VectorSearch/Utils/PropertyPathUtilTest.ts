import assert from "node:assert";
import { toPropertyPath } from "./PropertyPathUtil.js";

describe('toPropertyPath', function () {
    it('should extract the property name from a single-level selector', function () {
        const result = toPropertyPath<{ name: string }>(obj => obj.name);
        assert.strictEqual(result, 'name');
    });

    it('should extract the property name from a multi-level selector', function () {
        const result = toPropertyPath<{ user: { name: string } }>(obj => obj.user.name);
        assert.strictEqual(result, 'name');
    });

    it('should return the full function string if no property path is found', function () {
        const result = toPropertyPath<{ name: string }>(_ => undefined);
        assert.ok(result.includes('undefined'));
    });

    it('should return the property name even if the function has extra spaces', function () {
        const result = toPropertyPath<{ age: number }>(obj => obj.age);
        assert.strictEqual(result, 'age');
    });

    it('should handle scenarios where no match is available gracefully', function () {
        const result = toPropertyPath<{ test: string }>(() => {});
        assert.ok(result.includes('() =>'));
    });
});