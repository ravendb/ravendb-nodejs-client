import { OperationTypes } from "./TcpConnectionHeaderMessage";

export interface TcpNegotiateParameters {
    operation: OperationTypes;
    version: number;
    database: string;
    sourceNodeTag?: string;
    destinationNodeTag: string;
    destinationUrl: string;
    readResponseAndGetVersionCallback: (url: string) => Promise<number>;
}
