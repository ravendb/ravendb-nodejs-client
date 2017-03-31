export type CryptMessage = Buffer;

export interface ICipherBox {
  cipherText: CryptMessage,
  nonce: CryptMessage
}

declare class Box {
  constructor(publicKey?: CryptMessage, secretKey?: CryptMessage, easy?: boolean);
  public encrypt(plainText: CryptMessage, encoding?: string): ICipherBox;
  public decrypt(cipherBox: ICipherBox, encoding?: string): CryptMessage;
}

declare class Random {
  constructor();
  public static buffer(length: number): CryptMessage;
}

declare namespace Key {
  class Box {
    constructor(publicKey?: CryptMessage, secretKey?: CryptMessage, encoding?: string);
    public getPublicKey(): CryptMessage;
    public getSecretKey(): CryptMessage;
  }
}