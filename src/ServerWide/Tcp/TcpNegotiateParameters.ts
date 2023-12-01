import { AuthorizationInfo, OperationTypes } from "./TcpConnectionHeaderMessage";
import { Socket } from "net";
import { TcpNegotiationResponse } from "./TcpNegotiationResponse";
import { LicensedFeatures } from "./LicensedFeatures";

export interface TcpNegotiateParameters {
    operation: OperationTypes;
    authorizeInfo?: AuthorizationInfo;
    version: number;
    database: string;
    sourceNodeTag?: string;
    destinationNodeTag: string;
    destinationUrl: string;
    destinationServerId: string;
    licensedFeatures: LicensedFeatures;
    readResponseAndGetVersionCallback: (url: string, socket: Socket) => Promise<TcpNegotiationResponse>;
}
