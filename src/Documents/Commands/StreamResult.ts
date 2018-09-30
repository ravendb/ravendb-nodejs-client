export interface StreamResult<T> {
    id: string;
    changeVector: string;
    metadata: object;
    document: T;
}
