import { RavenCommand } from "../../Http/RavenCommand";
import { IDocumentStore } from "../../Documents/IDocumentStore";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { HttpCache } from "../../Http/HttpCache";
import { RequestExecutor } from "../..";
import { IRavenResponse } from "../../Types";

export type OperationResultType = "OPERATION_ID" | "COMMAND_RESULT" | "PATCH_STATUS";

interface IOperationBase {
    resultType: OperationResultType;
}

export interface IOperation<TResult> extends IOperationBase {
    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TResult>;
}

export interface IAwaitableOperation extends IOperation<OperationIdResult> {
}

export interface IMaintenanceOperation<TResult> extends IOperationBase {
     getCommand(conventions: DocumentConventions): RavenCommand<TResult>;
}

export interface IServerOperation<TResult> extends IOperationBase {
    getCommand(conventions: DocumentConventions): RavenCommand<TResult>;
}

abstract class AbstractAwaitableOperation {
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

export class OperationIdResult {
    public operationId: number;
}

export class OperationExceptionResult {
    public type: string;
    public message: string;
    public error: string;
    public statusCode: number;
}

// export abstract class OperationBase implements IOperation<{}> {
//     public abstract getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand<TResult>;
// }

// export abstract class AbstractOperation implements IOperation {
//   public abstract getCommand(conventions: DocumentConventions): RavenCommand;  
// }


// export abstract class AdminOperation extends AbstractOperation {

// }

// export abstract class ServerOperation extends AbstractOperation {

// }

// export abstract class PatchResultOperation extends Operation {

// }
