import {IDocument} from "../IDocument";
import {IDocumentQuery} from "./IDocumentQuery";

export class DocumentQuery<T extends IDocument> implements IDocumentQuery<T> {
  public count(): number
  {
    return 1;
  }
}