/**
 * How embedded CDC Sink data is stored in the parent document.
 *
 * - "Array": one-to-many, stored as a JSON array.
 * - "Map": one-to-many, stored as a JSON object keyed by primary key value(s).
 *   For composite PKs, the key is "pk1,pk2".
 * - "Value": many-to-one, stored as a single value/object.
 */
export type CdcSinkRelationType =
    "Array"
    | "Map"
    | "Value";
