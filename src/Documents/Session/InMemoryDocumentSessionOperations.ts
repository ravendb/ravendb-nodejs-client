import { IDisposable } from "../../Types/Contracts";
import { IMetadataDictionary } from ".";
import { Todo } from "../../Types";
import { SessionEventsEmitter, SessionBeforeStoreEventArgs } from "./SessionEvents";

export abstract class InMemoryDocumentSessionOperations implements IDisposable, SessionEventsEmitter, Todo {
    
    public removeListener(
        eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;
    public removeListener(
        eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): void;
    public removeListener(
        eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): void;
    public removeListener(
        eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): void;
    public removeListener(
        eventName: string, eventHandler: (eventArgs: any) => void): this {
        throw new Error("Method not implemented.");
    }
    public on(eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;
    public on(eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): this;
    public on(eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): this;
    public on(eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): this;
    public on(eventName: string, eventHandler: (eventArgs: any) => void): this;
    public on(eventName: string, eventHandler: (eventArgs: any) => void): this {
        throw new Error("Method not implemented.");
    }
    public dispose(): void {
        throw new Error("Method not implemented.");
    }

    public getMetadataFor(...args): IMetadataDictionary {
        throw new Error("Method not implemented.");
    }
}