import {IOptionsSet} from "../Types/IOptionsSet";
import {IAuthOptions} from "./AuthOptions";
import {StringUtil} from "../Utility/StringUtil";
import {throwError} from "../Exceptions";

export type CertificateType = "pem" | "pfx";

export interface ICertificate {
  toAgentOptions(agentOptions: IOptionsSet): void;
}

export abstract class Certificate implements ICertificate {
  public static readonly PEM: CertificateType = "pem";
  public static readonly PFX: CertificateType = "pfx";

  protected _certificate: string | Buffer;
  protected _passphrase?: string;

  public static createFromOptions(options: IAuthOptions): ICertificate {
    let certificate: ICertificate = null;

    switch (options.type) {
      case Certificate.PEM:
        certificate = this.createPem(options.certificate, options.password);
        break;
      case Certificate.PFX:
        certificate = this.createPfx(options.certificate, options.password);
        break;
    }

    return certificate;
  }

  public static createPem(certificate: string | Buffer, passphrase?: string) {
    return new PemCertificate(certificate, passphrase);
  }

  public static createPfx(certificate: string | Buffer, passphrase?: string) {
    return new PfxCertificate(certificate, passphrase);
  }

  constructor(certificate: string | Buffer, passprase?: string) {
    this._certificate = certificate;
    this._passphrase = passprase;
  }

  public toAgentOptions(agentOptions: IOptionsSet): void {
    if (this._passphrase) {
      agentOptions.passphrase = this._passphrase;
    }    
  }
}

export class PemCertificate extends Certificate {
  private readonly certToken: string = "CERTIFICATE";
  private readonly keyToken: string  = "RSA PRIVATE KEY";
  protected _key: string;

  constructor(certificate: string | Buffer, passprase?: string) {    
    super(certificate, passprase);

    if (certificate instanceof Buffer) {
      this._certificate = certificate.toString();
    }

    this._key = this._fetchPart(this.keyToken);
    this._certificate = this._fetchPart(this.certToken);    
    
    if (!this._key && !this._certificate) {
      throwError("InvalidArgumentException", "Invalid .pem certificate provided");
    }    
  }

  public toAgentOptions(agentOptions: IOptionsSet): void {
    super.toAgentOptions(agentOptions);
    agentOptions.cert = this._certificate;
    agentOptions.key = this._key;
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
  constructor(certificate: string | Buffer, passprase?: string) {
    if (!(certificate instanceof Buffer)) {
      throwError("InvalidArgumentException", "Pfx certificate should be a Buffer");
    }

    super(certificate, passprase);
  }

  public toAgentOptions(agentOptions: IOptionsSet): void {
    super.toAgentOptions(agentOptions);
    agentOptions.pfx = this._certificate as Buffer;
  }
}
