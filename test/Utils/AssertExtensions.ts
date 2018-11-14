import * as assert from "assert";

export async function throwsAsync(fn, regExp) {
    // tslint:disable-next-line:no-empty
    let f = () => {
    };
    try {
        await fn();
    } catch (e) {
        f = () => {
            throw e;
        };
    } finally {
        assert.throws(f, regExp);
    }
}

export async function assertThrows(func: Function, errAssert?: (err: Error) => void) {
    try {
        await func();
        assert.fail(`Function '${func.name || func.toString()}' should have thrown.`);
    } catch (err) {
        if (errAssert) {
            errAssert(err);
        }

        return err;
    }
}

export function assertThat(value) {
    return new JavaAssertionBuilder(value);
}

export class JavaAssertionBuilder {
    constructor(private _value) {}

    public isNull() {
        assert.ok(!this._value);
        return this;
    }

    public isEqualTo(val) {
        assert.strictEqual(this._value, val);
        return this;
    }

    public isZero() {
        assert.strictEqual(this._value, 0);
        return this;
    }

    public isTrue() {
        assert.strictEqual(this._value, true);
        return this;
    }

    public isFalse() {
        assert.strictEqual(this._value, false);
        return this;
    }

    public hasSize(n) {
        if (this._value instanceof Map) {
            assert.strictEqual(this._value.size, n);
        } else {
            assert.strictEqual(Object.keys(this._value).length, n);
        }

        return this;
    }

    public containsEntry(k, v) {
        if (this._value instanceof Map) {
            assert.ok(this._value.has(k));
            assert.strictEqual(this._value.get(k), v);
        } else {
            assert.ok(k in this._value);
            assert.strictEqual(this._value[k], v);
        }

        return this;
    }
}