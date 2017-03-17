export class BulkOperationOptions {
  protected allowStale: boolean = true;
  protected staleTimeout?: number = null;
  protected maxOpsPerSec?: number = null;
  protected retrieveDetails:boolean = false;

  constructor(allowStale: boolean = true, staleTimeout?: number, maxOpsPerSec?: number, retrieveDetails:boolean = false) {
    this.allowStale = allowStale;
    this.staleTimeout = staleTimeout;
    this.maxOpsPerSec = maxOpsPerSec;
    this.retrieveDetails = retrieveDetails;
  }
}
