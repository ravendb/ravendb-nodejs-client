import * as assert from "assert";

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
