import { CertificateType } from "./Certificate";

export interface IAuthOptions {
    type?: CertificateType;
    certificate?: string | Buffer;
    password?: string;
    ca?: string | Buffer;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IStoreAuthOptions extends IAuthOptions {

}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IRequestAuthOptions extends IAuthOptions {

}
