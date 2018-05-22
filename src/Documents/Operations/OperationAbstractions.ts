import { RavenCommand } from "../../Http/RavenCommand";
import { IDocumentStore } from "../../Documents/IDocumentStore";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { HttpCache } from "../../Http/HttpCache";
import { RequestExecutor } from "../..";

export type OperationResultType = "OPERATION_ID" | "COMMAND_RESULT" | "PATCH_STATUS";

export interface IAbstractOperation {
    resultType: OperationResultType;
}

export interface IOperation<TResult> extends IAbstractOperation {
    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TResult>;
}

export interface IAwaitableOperation extends IOperation<OperationIdResult> {
}

export interface IMaintenanceOperation<TResult> extends IAbstractOperation {
     getCommand(conventions: DocumentConventions): RavenCommand<TResult>;
}

export interface IServerOperation<TResult> extends IAbstractOperation {
    getCommand(conventions: DocumentConventions): RavenCommand<TResult>;
}

export abstract class AbstractAwaitableOperation {
    get resultType(): OperationResultType {
        return "OPERATION_ID";
    }
}

export class AwaitableServerOperation 
    extends AbstractAwaitableOperation 
    implements IServerOperation<OperationIdResult> {
    
    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        throw new Error("getCommand() must be implemented in extending class.");
    }
}

export class AwaitableMaintenanceOperation 
    extends AbstractAwaitableOperation 
    implements IMaintenanceOperation<OperationIdResult> {
    
    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        throw new Error("getCommand() must be implemented in extending class.");
    }
}

export class AwaitableOperation 
    extends AbstractAwaitableOperation    
    implements IOperation<OperationIdResult> {
    
    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        httpCache: HttpCache): RavenCommand<OperationIdResult> {
        throw new Error("getCommand() must be implemented in extending class.");
    }
}

export interface OperationIdResult {
    operationId: number;
}

export class OperationExceptionResult {
    public type: string;
    public message: string;
    public error: string;
    public statusCode: number;
}
