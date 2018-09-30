import {IDisposable} from "../../Types/Contracts";

export interface IChangesConnectionState<T> extends IDisposable {
    inc(): void;

    dec(): void;

    error(e: Error): void;

    ensureSubscribedNow(): Promise<void>;

    addOnChangeNotification(type: ChangesType, handler: (value: T) => void);

    removeOnChangeNotification(type: ChangesType, handler: (value: T) => void);

    addOnError(handler: (value: Error) => void);

    removeOnError(handler: (value: Error) => void);
}

export type ChangesType = "Document" | "Index" | "Operation";
