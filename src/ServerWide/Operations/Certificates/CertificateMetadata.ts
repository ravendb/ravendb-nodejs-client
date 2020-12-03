import { SecurityClearance } from "./SecurityClearance";
import { DatabaseAccess } from "./DatabaseAccess";

export interface CertificateMetadata {
    name: string;
    securityClearance: SecurityClearance;
    thumbprint: string;
    notAfter: Date;
    permissions?: Record<string, DatabaseAccess>;
    collectionSecondaryKeys?: string[];
    collectionPrimaryKey?: string;
    publicKeyPinningHash: string;
}