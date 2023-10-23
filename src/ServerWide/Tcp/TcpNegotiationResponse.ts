import { LicensedFeatures } from "./LicensedFeatures";


export interface TcpNegotiationResponse {
    version: number;
    licensedFeatures: LicensedFeatures;
}
