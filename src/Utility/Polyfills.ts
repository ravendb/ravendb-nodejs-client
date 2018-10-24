import * as values from "object.values";
import * as entries from "object.entries";

(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol("Symbol.asyncIterator");

if (!Object.values) {
    values.shim();
}

if (!Object.entries) {
    entries.shim();
}
