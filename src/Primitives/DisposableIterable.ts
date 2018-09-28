import { IDisposable } from "../Types/Contracts";

export interface DisposableIterable<T> 
    extends Iterable<T>, IDisposable {}
