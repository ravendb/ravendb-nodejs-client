import { parseJson, stringifyJson } from "./JsonUtil";

export interface ObjectMapper {
    deserialize<TResult>(raw: string): TResult;
    serialize<TResult>(obj: TResult): string;
}

export class PascalCasedJsonObjectMapper {

    public deserialize<TResult>(raw: string) {
        return parseJson(raw, "PASCAL_TO_CAMELCASE");
    }

    public serialize<TResult>(obj: TResult): string {
        return stringifyJson(obj as Object, "CAMEL_TO_PASCALCASE");
    }
}

export function getDefaultMapper() {
    return new PascalCasedJsonObjectMapper();
}