import {IDocumentQuery} from "./IDocumentQuery";

export class DocumentQuery<T> implements IDocumentQuery<T> {
  public count(): number
  {
    return 1;
  }
}