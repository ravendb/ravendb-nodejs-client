export type SsoProvider =
    "Github"
    | "Google"
    | "Microsoft"
    | "Windows";

/**
 * An SSO identity that maps to a certificate: the external provider,
 * an optional domain, and the identifier within that provider.
 */
export interface SsoIdentifier {
    provider: SsoProvider;
    domain?: string;
    identifier: string;
}

export type CertificateUsage =
    "RavenServer"
    | "RavenServerForCommunication"
    | "Client"
    | "SsoServer"
    | "SsoClient"
    | "WellKnownIssuer";
