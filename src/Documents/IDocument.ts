export interface IDocument {
   entityName(): string;
   serialize(): Object;
   unserialize(from: Object): IDocument;
}