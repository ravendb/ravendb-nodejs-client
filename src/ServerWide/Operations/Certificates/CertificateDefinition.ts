import { CertificateMetadata } from "./CertificateMetadata";

export interface CertificateDefinition extends CertificateMetadata {
    certificate: string;
    password?: string;
}

