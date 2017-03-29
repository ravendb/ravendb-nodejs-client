import * as Promise from 'bluebird';
import {IHeaders} from "../../Http/IHeaders";
import {AuthorizationException} from "../DatabaseExceptions";
import {PromiseResolve, PromiseReject} from "../../Utility/PromiseResolver";

export interface IAuthServerRequest {
  payload: Object,
  secretKey: Buffer
}

export class ApiKeyAuthenticator {
  private _serverPublicKeys: {
    [url: string]: Buffer
  };

  public authenticate(url: string, apiKey: string, headers: IHeaders): Promise<Buffer> {
    if (!apiKey) {
      return Promise.reject(new AuthorizationException('Api key is empty')) as Promise<Buffer>;
    }

    return this.getServerPublicKey(url)
      .then((publicKey: Buffer) => new Promise<Buffer>(
        (resolve: PromiseResolve<Buffer>, reject: PromiseReject) => {
          let name: string, secret: string;
          let request: IAuthServerRequest;

          [name, secret] = apiKey.split('/', 2);
          request = this.buildServerRequest(secret, publicKey);

          //TODO: call

          resolve(new Buffer(''));
        }
      ));
  }

  protected getServerPublicKey(url: string): Promise<Buffer> {
    if (url in this._serverPublicKeys) {
      return Promise.resolve(this._serverPublicKeys[url]) as Promise<Buffer>;
    }

    return new Promise<Buffer>((resolve: PromiseResolve<Buffer>) => {
      //TODO: call
      const publicKey: Buffer = new Buffer('');
      resolve(this._serverPublicKeys[url] = publicKey);
    });
  }

  protected buildServerRequest(secret: string, serverPublicKey: Buffer): IAuthServerRequest {
    //TODO: generate
    return {
      secretKey: new Buffer(''),
      payload: {
        'Secret'    : '',
        'PublicKey' : '',
        'Nonce'     : '',
        'ServerKey' : ''
      }
    }
  }
}