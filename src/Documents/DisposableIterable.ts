export interface DisposableIterable<T> extends Iterable<T> {
    dispose(): void;
}
