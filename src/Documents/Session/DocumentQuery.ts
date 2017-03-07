import {IDocumentQuery} from "./IDocumentQuery";

export class DocumentQuery<T> implements IDocumentQuery<T>
{
  public Count(): number
  {
    return 1;
  }
}