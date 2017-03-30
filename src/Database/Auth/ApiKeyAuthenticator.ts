import {api as sodium} from 'sodium';
import * as Promise from 'bluebird';
import * as RequestPromise from 'request-promise';
import {IHeaders} from "../../Http/IHeaders";
import {AuthenticationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {StatusCodes, StatusCode} from "../../Http/Response/StatusCode";
import {TypeUtil} from "../../Utility/TypeUtil";
import {RequestMethods} from "../../Http/Request/RequestMethod";

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
      return Promise.reject(new AuthenticationException('Api key is empty')) as Promise<Buffer>;
    }

    let name: string, secret: string;
    let publicKey: Buffer, secretKey: Buffer;

    [name, secret] = apiKey.split('/', 2);

    const tryAuthenticate: () => Promise<IResponse> = () => this.getServerPublicKey(url)
      .then((receivedKey: Buffer) => {
        const request: IAuthServerRequest = this.buildServerRequest(secret, receivedKey);

        return RequestPromise({
          json: true,
          body: request,
          headers: headers,
          method: RequestMethods.Post,
          url: '/api-key/validate',
          qs: {
            apiKey: name
          }
        })
        .then((response: IResponse) => {
          const code: StatusCode = response.statusCode;

          if (StatusCodes.isExpectationFailed(code)) {
            delete this._serverPublicKeys[url];

            return tryAuthenticate();
          }

          if (![StatusCodes.Forbidden, StatusCodes.Ok,
              StatusCodes.InternalServerError].includes(code)
          ) {
            return Promise.reject(new AuthenticationException('Bad response from server')) as Promise<IResponse>;
          }

          secretKey = request.secretKey;
          publicKey = receivedKey;
          return response;
        })
      });

    return tryAuthenticate()
      .then((response: IResponse) => {
        const body = response.body;

        if (body.Error) {
          return Promise.reject(new AuthenticationException(body.Error)) as Promise<Buffer>;
        }

        const token: string = atob(body.Token);
        const nonce: string = atob(body.Nonce);

        return new Buffer(sodium.crypto_box_open(token, nonce, publicKey, secretKey));
      });
  }

  protected getServerPublicKey(url: string): Promise<Buffer> {
    if (url in this._serverPublicKeys) {
      return Promise.resolve(this._serverPublicKeys[url]) as Promise<Buffer>;
    }

    return RequestPromise({
      json: true,
      method: RequestMethods.Get,
      resolveWithFullResponse: true,
      uri: StringUtil.format('{0}/api-key/public-key')
    }).then((response: IResponse) => {
      let publicKey: Buffer, body: IResponseBody;

      if (!StatusCodes.isOk(response.statusCode)
        && !TypeUtil.isObject(body = response.body) && !body.PublicKey
      ) {
        return Promise.reject(new AuthenticationException(`Bad response from server when \ 
trying to get public key`));
      }

      try {
        publicKey = new Buffer(atob(response.body.PublicKey));
        this._serverPublicKeys[url] = publicKey;
      } catch (exception) {
        return Promise.reject(new AuthenticationException(`Error decoding public key: ${exception.message}`));
      }

      return publicKey;
    }) as Promise<Buffer>;
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