
export interface ConditionalLoadResult<T> {
    entity: T | null;
    changeVector: string;
}