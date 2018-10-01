import { IDatabaseChanges } from "./IDatabaseChanges";
import { IDisposable } from "../../Types/Contracts";

export interface IConnectableChanges<T extends IDatabaseChanges> extends IDisposable {

    connected: boolean;

    ensureConnectedNow(): Promise<IDatabaseChanges>;

    on(type: "connectionStatus", handler: () => void);

    off(type: "connectionStatus", handler: () => void);

    on(type: "error", handler: (error: Error) => void);

    off(type: "error", handler: (error: Error) => void);
}
