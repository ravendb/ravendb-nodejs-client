import {IDocument} from './IDocument';

export class Document implements IDocument
{
  public entityName(): string
  {
      return this.constructor.name;
  }
}