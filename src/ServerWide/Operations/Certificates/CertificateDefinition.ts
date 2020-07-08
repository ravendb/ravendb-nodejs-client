import { DatabaseAccess } from "./DatabaseAccess";
import { SecurityClearance } from "./SecurityClearance";

export interface CertificateDefinition {
    name: string;
    certificate: string;
    password?: string;
    securityClearance: SecurityClearance;
    thumbprint: string;
    notAfter: Date;
    permissions?: Record<string, DatabaseAccess>;
    collectionPrimaryKey?: string;
    collectionSecondaryKeys?: string[];
}