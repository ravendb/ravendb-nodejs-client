export interface ObjectMapper {
    deserialize<TResult>(raw: string): TResult;
    serialize<TResult>(obj: TResult): string;
}
