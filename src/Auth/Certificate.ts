import {IOptionsSet} from '../Typedef/IOptionsSet';
import {InvalidArgumentException} from '../Database/DatabaseExceptions';
import {IAuthOptions} from './AuthOptions';
import { StringUtil } from '../Utility/StringUtil';

export type CertificateType = 'pem' | 'pfx';

export interface ICertificate {
  toAgentOptions(agentOptions: IOptionsSet): void;
}

export abstract class Certificate implements ICertificate {
  public static readonly Pem: CertificateType = 'pem';
  public static readonly Pfx: CertificateType = 'pfx';

  protected _certificate: string;
  protected _passphrase?: string;

  public static createFromOptions(options: IAuthOptions): ICertificate {
    let certificate: ICertificate = null;

    switch (options.type) {
      case Certificate.Pem:
        certificate = this.createPem(options.certificate, options.password);
        break;
      case Certificate.Pfx:
        certificate = this.createPfx(options.certificate, options.password);
        break;
    }

    return certificate;
  }

  public static createPem(certificate: string, passphrase?: string) {
    return new PemCertificate(certificate, passphrase);
  }

  public static createPfx(certificate: string, passphrase?: string) {
    return new PfxCertificate(certificate, passphrase);
  }

  constructor(certificate: string, passprase?: string) {
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
  private readonly certToken: string = 'CERTIFICATE';
  private readonly keyToken: string  = 'RSA PRIVATE KEY';
  protected _key: string;

  constructor(certificate: string, passprase?: string) {    
    super(certificate, passprase);
    let matches: RegExpExecArray;

    this._key = this.fetchPart(this.keyToken);
    this._certificate = this.fetchPart(this.certToken);    
    
    if (!this._key && !this._certificate) {
      throw new InvalidArgumentException('Invalid .pem certificate provided');
    }    
  }

  public toAgentOptions(agentOptions: IOptionsSet): void {
    super.toAgentOptions(agentOptions);
    agentOptions.cert = this._certificate;
    agentOptions.key = this._key;
  }

  protected fetchPart(token: string): string {
    const cert: string = this._certificate;
    const prefixSuffix: string = '-----';
    const beginMarker: string = `${prefixSuffix}BEGIN ${token}${prefixSuffix}`;
    const endMarker: string = `${prefixSuffix}END ${token}${prefixSuffix}`;

    if (cert.includes(beginMarker) && cert.includes(endMarker)) {
      let part: string = cert.substring(
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
  public toAgentOptions(agentOptions: IOptionsSet): void {
    super.toAgentOptions(agentOptions);
    agentOptions.pfx = this._certificate;
  }
}