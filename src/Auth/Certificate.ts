import { IOptionsSet } from "../Types/IOptionsSet";
import { IAuthOptions } from "./AuthOptions";
import { StringUtil } from "../Utility/StringUtil";
import { throwError } from "../Exceptions";
import { AgentOptions, Agent } from "https";

export type CertificateType = "pem" | "pfx";

export interface ICertificate {
    toAgentOptions(): AgentOptions;
}

export abstract class Certificate implements ICertificate {
    public static readonly PEM: CertificateType = "pem";
    public static readonly PFX: CertificateType = "pfx";

    protected _certificate: string | Buffer;
    protected _ca: string | Buffer;
    protected _passphrase?: string;

    public static createFromOptions(options: IAuthOptions): ICertificate {
        if (!options) {
            return null;
        }
        
        let certificate: ICertificate = null;

        switch (options.type) {
            case Certificate.PEM:
                certificate = this.createPem(options.certificate, options.password, options.ca);
                break;
            case Certificate.PFX:
                certificate = this.createPfx(options.certificate, options.password, options.ca);
                break;
        }

        return certificate;
    }

    public static createPem(certificate: string | Buffer, passphrase?: string, ca?: string | Buffer) {
        return new PemCertificate(certificate, passphrase, ca);
    }

    public static createPfx(certificate: string | Buffer, passphrase?: string, ca?: string | Buffer) {
        return new PfxCertificate(certificate, passphrase, ca);
    }

    constructor(certificate: string | Buffer, passprase?: string, ca?: string | Buffer) {
        this._certificate = certificate;
        this._passphrase = passprase;
        this._ca = ca;
    }

    public toAgentOptions(): AgentOptions {
        if (this._passphrase) {
            return { passphrase: this._passphrase };
        }

        return {};
    }
}

export class PemCertificate extends Certificate {
    private readonly certToken: string = "CERTIFICATE";
    private readonly keyToken: string = "RSA PRIVATE KEY";
    protected _key: string;

    constructor(certificate: string | Buffer, passprase?: string, ca?: string | Buffer) {
        super(certificate, passprase, ca);

        if (certificate instanceof Buffer) {
            this._certificate = certificate.toString();
        }

        this._key = this._fetchPart(this.keyToken);
        this._certificate = this._fetchPart(this.certToken);

        if (!this._key && !this._certificate) {
            throwError("InvalidArgumentException", "Invalid .pem certificate provided");
        }
    }

    public toAgentOptions(): AgentOptions {
        const result = super.toAgentOptions();
        return Object.assign(result, {
            cert: this._certificate,
            key: this._key,
            ca: this._ca
        });
    }

    protected _fetchPart(token: string): string {
        const cert: string = this._certificate as string;
        const prefixSuffix: string = "-----";
        const beginMarker: string = `${prefixSuffix}BEGIN ${token}${prefixSuffix}`;
        const endMarker: string = `${prefixSuffix}END ${token}${prefixSuffix}`;

        if (cert.includes(beginMarker) && cert.includes(endMarker)) {
            const part: string = cert.substring(
                cert.indexOf(beginMarker),
                cert.indexOf(endMarker) + endMarker.length
            );

            if (!StringUtil.isNullOrWhiteSpace(part)) {
                return part;
            }
        }

        return null;
    }
}

export class PfxCertificate extends Certificate {
    constructor(certificate: string | Buffer, passprase?: string, ca?: string | Buffer) {
        if (!(certificate instanceof Buffer)) {
            throwError("InvalidArgumentException", "Pfx certificate should be a Buffer");
        }

        super(certificate, passprase, ca);
    }

    public toAgentOptions(): AgentOptions {
        return Object.assign(super.toAgentOptions(), {
            pfx: this._certificate as Buffer,
            ca: this._ca
        });
    }
}
