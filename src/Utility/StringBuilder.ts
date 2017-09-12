import * as NodeStringBuilder from 'node-stringbuilder';
import {IStringable} from "../Typedef/Contracts";

export interface IAbstractStringBuilder extends IStringable {
  replace(start: number, end: number, content: string): IAbstractStringBuilder;
  insert(offset: number, content: string): IAbstractStringBuilder;
  clear(): IAbstractStringBuilder;
  delete(start: number, end: number): IAbstractStringBuilder;
  deleteCharAt(index: number): IAbstractStringBuilder;
  reserve(start?: number, end?: number): IAbstractStringBuilder;
  reserveChunk(start?: number, length?: number): IAbstractStringBuilder;
  appendLine(content: string): IAbstractStringBuilder;
  appendRepeat(content: string, repeat?: number): IAbstractStringBuilder;
  append(content: string): IAbstractStringBuilder;
  reverse(): IAbstractStringBuilder;
  upperCase(): IAbstractStringBuilder;
  lowerCase(): IAbstractStringBuilder;
  replacePattern(pattern: string | RegExp | number | boolean, content: string, offset?: number, limit?: number): IAbstractStringBuilder;
  replaceAll(pattern: string | RegExp | number | boolean, content: string): IAbstractStringBuilder;
  trim(): IAbstractStringBuilder;
  expandCapacity(newCapacity: number, returnUpdatedCapacity?: boolean): IAbstractStringBuilder;
  shrinkCapacity(returnUpdatedCapacity?: boolean): IAbstractStringBuilder;
  repeat(repeatCount?: number): IAbstractStringBuilder;
  charAt(index: number): string;
  indexOfRegExp(regexp: RegExp, offset?: number, limit?: number): {index: number[]; lastIndex: number[]};
  indexOf(pattern: string | RegExp | number | boolean, offset?: number, limit?: number): number[];
  lastIndexOf(pattern: string | RegExp | number | boolean, offset?: number, limit?: number): number[];
  startsWith(pattern: string | RegExp | number | boolean): boolean;
  endsWith(pattern: string | RegExp | number | boolean): boolean;
  equals(data: string | Buffer | number | boolean | IAbstractStringBuilder): boolean;
  equalsIgnoringCase(data: string | Buffer | number | boolean | IAbstractStringBuilder): boolean;
  clone(): IAbstractStringBuilder;
  toString(start?: number, length?: number): string;
  toBuffer(start?: number, length?: number): Buffer;
}

export interface INodeStringBuilder extends IAbstractStringBuilder {
    count(): number;
    length(): number;
    capacity(): number;
}

export interface IStringBuilder extends IAbstractStringBuilder {
  length: number;
  capacity: number;
  wordsCount: number;
}

export class StringBuilder implements IStringBuilder {
  private _builder: INodeStringBuilder;

  public get length(): number {
    return this._builder.length();
  }

  public get capacity(): number {
    return this._builder.capacity();
  }

  public get wordsCount(): number {
    return this._builder.count();
  }

  public static from(source: string = '', initialCapacity: number = 128): IStringBuilder {
    return new (this as (typeof StringBuilder))(source, initialCapacity);
  }

  constructor(source: IAbstractStringBuilder);
  constructor(source?: string, initialCapacity?: number);
  constructor(source: string | IAbstractStringBuilder = '', initialCapacity: number = 128) {
    if (source instanceof NodeStringBuilder) {
      this._builder = source as INodeStringBuilder;
    } else {
      this._builder = new (NodeStringBuilder as {
        new(content: string, initialCapacity: number): INodeStringBuilder
      })(source as string, initialCapacity);
    }
  }

  public replace(start: number, end: number, content: string): IStringBuilder {
    this._builder.replace(start, end, content);
    return this;
  }

  public insert(offset: number, content: string): IStringBuilder {
    this._builder.insert(offset, content);
    return this;
  }

  public clear(): IStringBuilder {
    this._builder.clear();
    return this;
  }

  public delete(start: number, end: number): IStringBuilder {
    this._builder.delete(start, end);
    return this;
  }

  public deleteCharAt(index: number): IStringBuilder {
    this._builder.deleteCharAt(index);
    return this;
  }

  public reserve(start: number = 0, end?: number): IStringBuilder {
    this._builder.reserve(start, end);
    return this;
  }

  public reserveChunk(start: number = 0, length?: number): IStringBuilder {
    this._builder.reserveChunk(start, length);
    return this;
  }

  public appendLine(content: string): IStringBuilder {
    this._builder.appendLine(content);
    return this;
  }

  public appendRepeat(content: string, repeat: number = 1): IStringBuilder {
    this._builder.appendRepeat(content, repeat);
    return this;
  }

  public append(content: string): IStringBuilder {
    this._builder.append(content);
    return this;
  }

  public reverse(): IStringBuilder {
    this._builder.reverse();
    return this;
  }

  public upperCase(): IStringBuilder {
    this._builder.upperCase();
    return this;
  }

  public lowerCase(): IStringBuilder {
    this._builder.lowerCase();
    return this;
  }

  public replacePattern(pattern: string | RegExp | number | boolean, content: string, offset: number = 0, limit: number = 1): IStringBuilder {
    this._builder.replacePattern(pattern, content, offset, limit);
    return this;
  }

  public replaceAll(pattern: string | RegExp | number | boolean, content: string): IStringBuilder {
    this._builder.replaceAll(pattern, content);
    return this;
  }

  public trim(): IStringBuilder {
    this._builder.trim();
    return this;
  }

  public expandCapacity(newCapacity: number, returnUpdatedCapacity: boolean = false): IStringBuilder {
    this._builder.expandCapacity(newCapacity, returnUpdatedCapacity);
    return this;
  }

  public shrinkCapacity(returnUpdatedCapacity: boolean = false): IStringBuilder {
    this._builder.shrinkCapacity(returnUpdatedCapacity);
    return this;
  }

  public repeat(repeatCount: number = 1): IStringBuilder {
    this._builder.repeat(repeatCount);
    return this;
  }

  public charAt(index: number): string {
    return this._builder.charAt(index);
  }

  public indexOfRegExp(regexp: RegExp, offset: number = 0, limit: number = 1): { index: number[]; lastIndex: number[] } {
    return this._builder.indexOfRegExp(regexp, offset, limit);
  }

  public indexOf(pattern: string | RegExp | number | boolean, offset: number = 0, limit: number = 1): number[] {
    return this._builder.indexOf(pattern, offset, limit);
  }

  public lastIndexOf(pattern: string | RegExp | number | boolean, offset: number = 0, limit: number = 1): number[] {
    return this._builder.lastIndexOf(pattern, offset, limit);
  }

  public startsWith(pattern: string | RegExp | number | boolean): boolean {
    return this._builder.startsWith(pattern);
  }

  public endsWith(pattern: string | RegExp | number | boolean): boolean {
    return this._builder.endsWith(pattern);
  }

  public equals(data: string | Buffer | number | boolean | IStringBuilder): boolean {
    return this._builder.equals(data);
  }

  public equalsIgnoringCase(data: string | Buffer | number | boolean | IStringBuilder): boolean {
    return this._builder.equalsIgnoringCase(data);
  }

  public clone(): IStringBuilder {
    return new (this.constructor as (typeof StringBuilder))(this._builder.clone());
  }

  public toBuffer(start: number = 0, length?: number): Buffer {
    return this._builder.toBuffer(start, length);
  }
}