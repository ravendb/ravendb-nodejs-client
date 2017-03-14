import {IDocument} from './IDocument';

export class Document implements IDocument {
  public entityName(): string {
      return this.constructor.name;
  }

  serialize(): Object {
    return {};
  }

  unserialize(from: Object): IDocument {
    return this;
  }
}