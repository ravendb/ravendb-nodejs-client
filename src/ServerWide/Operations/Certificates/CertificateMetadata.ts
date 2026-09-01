import { SecurityClearance } from "./SecurityClearance.js";
import { DatabaseAccess } from "./DatabaseAccess.js";
import { CertificateUsage } from "./CertificateUsage.js";
import { SsoIdentifier } from "./SsoIdentifier.js";

export interface CertificateMetadata {
    name: string;
    securityClearance: SecurityClearance;
    thumbprint: string;
    notAfter: Date;
    notBefore: Date;
    permissions?: Record<string, DatabaseAccess>;
    collectionSecondaryKeys?: string[];
    collectionPrimaryKey?: string;
    publicKeyPinningHash: string;
    usage?: CertificateUsage;
    ssoServerPublicKeyPinningHashes?: string[];
    allowAnySsoServer?: boolean;
    ssoIdentifiers?: SsoIdentifier[];
}
