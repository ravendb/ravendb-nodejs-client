import { TcpConnectionStatus } from "./TcpConnectionStatus";
import { LicensedFeatures } from "./LicensedFeatures";

export interface TcpConnectionHeaderResponse {
    status: TcpConnectionStatus;
    message: string;
    version: number;
    licensedFeatures: LicensedFeatures;
}
