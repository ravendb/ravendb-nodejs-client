
export interface IIncludeBuilder {
    includeCounter(name: string): IIncludeBuilder;
    includeCounters(names: string[]): IIncludeBuilder;
    includeAllCounters(): IIncludeBuilder;
    includeDocuments(path: string): IIncludeBuilder;
     //TBD expr TBuilder IncludeDocuments(Expression<Func<T, string>> path);
    //TBD expr TBuilder IncludeDocuments(Expression<Func<T, IEnumerable<string>>> path);
    //TBD expr TBuilder IncludeDocuments<TInclude>(Expression<Func<T, string>> path);
    //TBD expr TBuilder IncludeDocuments<TInclude>(Expression<Func<T, IEnumerable<string>>> path);
}
