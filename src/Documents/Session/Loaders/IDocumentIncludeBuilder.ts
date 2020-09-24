export interface IDocumentIncludeBuilder<TBuilder> {
    includeDocuments(path: string): TBuilder;
}