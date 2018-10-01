import { CertificateType } from "./Certificate";

export interface IAuthOptions {
    type?: CertificateType;
    certificate?: string | Buffer;
    password?: string;
    ca?: string | Buffer;
}

// tslint:disable-next-line:no-empty-interface
export interface IStoreAuthOptions extends IAuthOptions {

}

// tslint:disable-next-line:no-empty-interface
export interface IRequestAuthOptions extends IAuthOptions {

}
