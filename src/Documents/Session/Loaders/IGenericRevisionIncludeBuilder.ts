
export interface IGenericRevisionIncludeBuilder<TBuilder> {
    includeRevisions(path: string): TBuilder;
    includeRevisions(before: Date): TBuilder;
}
