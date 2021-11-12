
export interface DetailedReplicationHubAccess {
    name: string;
    thumbprint: string;
    certificate: string;
    notBefore: Date;
    notAfter: Date;
    subject: string;
    issuer: string;

    allowedHubToSinkPaths?: string[];
    allowedSinkToHubPaths?: string[];
}
