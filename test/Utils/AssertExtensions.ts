import * as assert from "assert";

export async function throwsAsync(fn, regExp) {
  // tslint:disable-next-line:no-empty
  let f = () => {};
  try {
    await fn();
  } catch (e) {
    f = () => { throw e; };
  } finally {
    assert.throws(f, regExp);
  }
}