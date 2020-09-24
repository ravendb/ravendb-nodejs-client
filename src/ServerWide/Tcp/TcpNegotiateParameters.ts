import { AuthorizationInfo, OperationTypes } from "./TcpConnectionHeaderMessage";

export interface TcpNegotiateParameters {
    operation: OperationTypes;
    authorizeInfo: AuthorizationInfo;
    version: number;
    database: string;
    sourceNodeTag?: string;
    destinationNodeTag: string;
    destinationUrl: string;
    readResponseAndGetVersionCallback: (url: string) => Promise<number>;
}
