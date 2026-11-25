import { IQueryShardedContextBuilder } from "./IQueryShardedContextBuilder.js";

export class QueryShardedContextBuilder implements IQueryShardedContextBuilder {
    documentIds: Set<string> = new Set<string>();
    prefixes: Set<string> = new Set<string>();

    byDocumentId(id: string): IQueryShardedContextBuilder {
        this.documentIds.add(id);
        return this;
    }

    byDocumentIds(ids: string[]): IQueryShardedContextBuilder {
        ids.forEach((id: string) => this.documentIds.add(id));
        return this;
    }

    byPrefix(prefix: string): IQueryShardedContextBuilder {
        this.prefixes.add(prefix);
        return this;
    }

    byPrefixes(prefixes: string[]): IQueryShardedContextBuilder {
        prefixes.forEach((prefix: string) => this.prefixes.add(prefix));
        return this;
    }
}
