 
export interface BatchOptions {
     waitForReplicas: boolean;
     numberOfReplicasToWaitFor: number;
     waitForReplicasTimeout: number;
     majority: boolean;
     throwOnTimeoutInWaitForReplicas: boolean;

     waitForIndexes: boolean;
     waitForIndexesTimeout: number;
     throwOnTimeoutInWaitForIndexes: boolean;
     waitForSpecificIndexes: string[];
}
