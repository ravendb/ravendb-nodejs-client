export type CountersByDocId = Map<string, [ boolean, Set<string> ]>;

export interface CounterTracking {
    gotAll: boolean;
    data: Map<string, number>;
}
