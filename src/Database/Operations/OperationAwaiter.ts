import * as BluebirdPromise from "bluebird";
import {IRequestExecutor} from "../../Http/Request/RequestExecutor";
import {DateUtil} from "../../Utility/DateUtil";
import {GetOperationStateCommand} from "../Commands/GetOperationStateCommand";
import {IRavenResponse} from "../RavenCommandResponse";
import {DatabaseLoadTimeoutException, InvalidOperationException, RavenException} from "../DatabaseExceptions";

export interface IOperationStatusResult {
  status: OperationStatus;
  response?: IRavenResponse;
  exception?: RavenException; 
}

export type OperationStatus = 'Completed' | 'Faulted' | 'Running';

export class OperationStatuses {
  public static readonly Completed: OperationStatus = 'Completed';
  public static readonly Faulted: OperationStatus = 'Faulted';
  public static readonly Running: OperationStatus = 'Running';
}

export class OperationAwaiter {
  protected requestExecutor: IRequestExecutor;
  protected operationId: string;
  protected timeout?: number = null;

  constructor(requestExecutor: IRequestExecutor, operationId: string, timeout?: number) {
    this.requestExecutor = requestExecutor;
    this.operationId = operationId;
    this.timeout = timeout || null;
  }

  public waitForCompletion(): BluebirdPromise<IRavenResponse> {
    return this.fetchOperationStatus()
      .then((result: IOperationStatusResult) => this.onNext(result));
  }

  protected fetchOperationStatus(): BluebirdPromise<IOperationStatusResult> {
    const startTime: number = DateUtil.timestamp();
    const statusCommand: GetOperationStateCommand = new GetOperationStateCommand(this.operationId);

    return this.requestExecutor.execute(statusCommand)  
      .then((response: IRavenResponse): IOperationStatusResult => {
        if (this.timeout && ((DateUtil.timestamp() - startTime) > this.timeout)) {
          return {
            status: OperationStatuses.Faulted,
            exception: new DatabaseLoadTimeoutException('The operation did not finish before the timeout end')
          };
        }

        switch (<OperationStatus>response.Status) {
          case OperationStatuses.Completed:
            return {
              status: response.Status,
              response: response
            };    
          case OperationStatuses.Faulted:
            return {
              status: response.Status,
              exception: new InvalidOperationException(response.Result.Error)
            };    
          default:
            return {
              status: OperationStatuses.Running
            };  
        }
      })
      .catch((exception: RavenException): BluebirdPromise<IOperationStatusResult> => BluebirdPromise.resolve<IOperationStatusResult>({
        status: OperationStatuses.Faulted,
        exception: exception
      }));
  }

  protected onNext(result: IOperationStatusResult): BluebirdPromise<IRavenResponse> {
    switch (result.status) {
        case OperationStatuses.Completed:
          return BluebirdPromise.resolve<IRavenResponse>(result.response);    
        case OperationStatuses.Faulted:
          return BluebirdPromise.reject<IRavenResponse>(result.exception);        
        default:
          return BluebirdPromise.delay(500)
            .then(() => this.fetchOperationStatus())
            .then((result: IOperationStatusResult) => this.onNext(result));
      }
  }
}