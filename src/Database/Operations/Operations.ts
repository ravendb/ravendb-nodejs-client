import {RequestExecutor} from "../../Http/Request/RequestExecutor";
import * as BluebirdPromise from "bluebird";
import {PromiseResolve, PromiseReject} from "../../Utility/PromiseResolver";
import {DateUtil} from "../../Utility/DateUtil";
import {GetOperationStateCommand} from "../Commands/GetOperationStateCommand";
import {IRavenResponse} from "../RavenCommandResponse";
import {DatabaseLoadTimeoutException, InvalidOperationException} from "../DatabaseExceptions";

export class Operations {
  protected requestExecutor: RequestExecutor;

  constructor(requestExecutor: RequestExecutor) {
    this.requestExecutor = requestExecutor;
  }

  public waitForOperationComplete(operationId: string, timeout?: number): BluebirdPromise<IRavenResponse> {
    return new BluebirdPromise<IRavenResponse>((resolve: PromiseResolve<IRavenResponse>, reject: PromiseReject) => {
      const startTime: number = DateUtil.timestamp();
      const getOperationCommand: GetOperationStateCommand = new GetOperationStateCommand(operationId);

      const execute: () => void = () => {
        this.requestExecutor.execute(getOperationCommand)          
          .then((response: IRavenResponse) => {
            const commandResponse: IRavenResponse = response;

            if (timeout && ((DateUtil.timestamp() - startTime) > timeout)) {
              reject(new DatabaseLoadTimeoutException('The operation did not finish before the timeout end'));
            } else if (commandResponse.Status == 'Completed') {
              resolve(response);
            } else if (commandResponse.Status == 'Faulted') {
              reject(new InvalidOperationException(commandResponse.Result.Error));
            } else {
              setTimeout(() => execute(), 500);
            }
          })
          .catch((error: Error) => reject(error))
      };

      execute();
    });
  }
}