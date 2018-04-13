import {IStringable} from "../Types/Contracts";

export interface IStringBuilder extends IStringable {
  append(content: string): IStringBuilder;
  toString(): string;
}

export class StringBuilder implements IStringBuilder {
  protected readonly blockSize: number = 256;
  protected length: number = 0;
  protected capacity: number = 0;
  protected buffer: Buffer = null;

  public append(content: string): IStringBuilder {
    const contentBuffer = this._getBufferFromOutside(content);

    if (contentBuffer === undefined) {
        return this;
    }

    const contentBufferLength: number = contentBuffer.length;
    const concatLength: number = this.length + contentBufferLength;

    this._realloc(concatLength);
    contentBuffer.copy(this.buffer, this.length);
    this.length = concatLength;

    return this;
  }

  public toString(): string {
    return this.buffer.slice(0, this.length).toString("utf16le");
  }

  protected _getBufferFromOutside(source: string | number | boolean): Buffer | null {  
    const type: string = typeof source;  
    let dataBuffer: Buffer;

    switch (type) {
        case "boolean":
        case "number":
            dataBuffer = Buffer.from((source as boolean | number).toString(), "utf16le");
            break;
        case "string":
            dataBuffer = Buffer.from(source as string, "utf16le");
            break;
        default:
            return undefined;
    }

    return dataBuffer;
  }

  protected _realloc(newSize: number): void {
    if (this.capacity < newSize) {
        const count: number = Math.ceil((newSize - this.capacity) / this.blockSize);
        const sizeToAdd : number= count * this.blockSize;
        const emptyBuffer: Buffer = Buffer.allocUnsafe(sizeToAdd);

        if (!this.buffer) {
          this.buffer = Buffer.allocUnsafe(this.blockSize);
        }
        
        this.buffer = Buffer.concat([this.buffer, emptyBuffer]);
        this.capacity += sizeToAdd;
    }
  }
}