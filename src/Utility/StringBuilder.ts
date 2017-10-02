import {IStringable} from "../Typedef/Contracts";

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
    var contentBuffer = this.getBufferFromOutside(content);

    if (contentBuffer === undefined) {
        return this;
    }

    var contentBufferLength: number = contentBuffer.length;
    var concatLength: number = this.length + contentBufferLength;

    this.reAlloc(concatLength);
    contentBuffer.copy(this.buffer, this.length);
    this.length = concatLength;

    return this;
  }

  public toString(): string {
    return this.buffer.slice(0, this.length).toString('utf16le');
  }

  protected getBufferFromOutside(source: string | number | boolean): Buffer | null {  
    const type: string = typeof source;  
    let dataBuffer: Buffer;

    switch (type) {
        case 'boolean':
        case 'number':
            dataBuffer = Buffer.from((<boolean | number>source).toString(), 'utf16le');
            break;
        case 'string':
            dataBuffer = Buffer.from(<string>source, 'utf16le');
            break;
        default:
            return undefined;
    }

    return dataBuffer;
  }

  protected reAlloc(newSize: number): void {
    if (this.capacity < newSize) {
        let count: number = Math.ceil((newSize - this.capacity) / this.blockSize);
        let sizeToAdd : number= count * this.blockSize;
        let emptyBuffer: Buffer = Buffer.allocUnsafe(sizeToAdd);

        if (!this.buffer) {
          this.buffer = Buffer.allocUnsafe(this.blockSize);
        }
        
        this.buffer = Buffer.concat([this.buffer, emptyBuffer]);
        this.capacity += sizeToAdd;
    }
  }
}