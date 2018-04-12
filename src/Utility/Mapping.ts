import { parseJson, stringifyJson } from "./JsonUtil";

export interface ObjectMapper {
    deserialize<TResult>(raw: string): TResult;
    serialize<TResult>(obj: TResult): string;
}

export class PascalCasedJsonObjectMapper implements ObjectMapper {

    public deserialize<TResult>(raw: string) {
        return parseJson(raw, "PASCAL_TO_CAMELCASE");
    }

    public serialize<TResult>(obj: TResult): string {
        return stringifyJson(obj as Object, "CAMEL_TO_PASCALCASE");
    }
}

export class RavenEntityMapper implements ObjectMapper {
    public deserialize<TResult>(raw: string) {
        return parseJson(raw, "PASCAL_TO_CAMELCASE");
    }

    public serialize<TResult>(obj: TResult): string {
        return stringifyJson(obj as Object, "CAMEL_TO_PASCALCASE");
    }
}

export class Mapping {
    private static _defaultMapper: ObjectMapper;
    private static _defaultEntityMapper: ObjectMapper;

    public static getDefaultMapper() {
        if (!this._defaultMapper) {
            this._defaultMapper = new PascalCasedJsonObjectMapper();
        }

        return this._defaultMapper;
    }

    public static getDefaultEntityMapper() {
        if (!this._defaultEntityMapper) {
            this._defaultEntityMapper = new RavenEntityMapper();
        }

        return this._defaultEntityMapper;
    }
}
