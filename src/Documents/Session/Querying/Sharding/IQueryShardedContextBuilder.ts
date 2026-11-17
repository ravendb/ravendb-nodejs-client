export interface IQueryShardedContextBuilder {
    byDocumentId(id: string): IQueryShardedContextBuilder;
    byDocumentIds(ids: string[]): IQueryShardedContextBuilder;
    /**
     * Limits the query to the shards of a prefix from the database sharding configuration (requires server 6.2+).
     */
    byPrefix(prefix: string): IQueryShardedContextBuilder;
    byPrefixes(prefixes: string[]): IQueryShardedContextBuilder;
}
