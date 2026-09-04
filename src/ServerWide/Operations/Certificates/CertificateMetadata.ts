import { SecurityClearance } from "./SecurityClearance.js";
import { DatabaseAccess } from "./DatabaseAccess.js";
import { CertificateUsage, SsoIdentifier } from "./SsoIdentifier.js";

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
    disabled?: boolean;
    usage?: CertificateUsage;

    /**
     * Public key pinning hashes of the SSO servers allowed to authorize this SSO user.
     */
    ssoServerPublicKeyPinningHashes?: string[];

    /**
     * When true, any SSO server may authorize this SSO user.
     */
    allowAnySsoServer?: boolean;

    /**
     * The SSO identities (provider + identifier) that map to this certificate.
     */
    ssoIdentifiers?: SsoIdentifier[];
}
