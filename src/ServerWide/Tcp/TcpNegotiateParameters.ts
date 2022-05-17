import { AuthorizationInfo, OperationTypes } from "./TcpConnectionHeaderMessage";
import { Socket } from "net";

export interface TcpNegotiateParameters {
    operation: OperationTypes;
    authorizeInfo?: AuthorizationInfo;
    version: number;
    database: string;
    sourceNodeTag?: string;
    destinationNodeTag: string;
    destinationUrl: string;
    destinationServerId: string;
    readResponseAndGetVersionCallback: (url: string, socket: Socket) => Promise<number>;
}
