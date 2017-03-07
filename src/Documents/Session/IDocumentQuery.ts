import {IDocument} from '../IDocument'

export interface IDocumentQuery<T extends IDocument> {
  count(): number;
}