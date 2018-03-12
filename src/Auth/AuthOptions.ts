import {CertificateType} from "./Certificate";

export interface IAuthOptions {
  type?: CertificateType;
  certificate?: string | Buffer;
  password?: string;
  ca?: string;
}   

export interface IStoreAuthOptions extends IAuthOptions {

}

export interface IRequestAuthOptions extends IAuthOptions {
  
}