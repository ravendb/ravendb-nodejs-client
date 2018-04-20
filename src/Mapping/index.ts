import { JsonSerializer, camelCaseReviver, pascalCaseReplacer } from "./Json";
import { TypesAwareObjectMapper } from "./ObjectMapper";
import { DateUtil } from "../Utility/DateUtil";

// needed tools
// json string -> casing aware -> object
// json string -> casing aware -> types aware -> entity

export class Mapping {
    
    private static _defaultJsonSerializer: JsonSerializer;

    private static _defaultMapper: TypesAwareObjectMapper;
    private static _defaultEntityMapper: TypesAwareObjectMapper;

    public static getDefaultEntityMapper() {
        if (!this._defaultEntityMapper) {
            this._defaultEntityMapper = new TypesAwareObjectMapper({
                dateFormat: DateUtil.DEFAULT_DATE_FORMAT
            });
        }

        return this._defaultEntityMapper;
    }

    public static getDefaultMapper() {
        if (!this._defaultMapper) {
            this._defaultMapper = new TypesAwareObjectMapper({
                dateFormat: DateUtil.DEFAULT_DATE_FORMAT
            });
        }

        return this._defaultMapper;
    }

    public static getDefaultJsonSerializer() {
        if (!this._defaultJsonSerializer) {
            this._defaultJsonSerializer = new JsonSerializer({
                reviver: camelCaseReviver,
                replacer: pascalCaseReplacer
            });
        }

        return this._defaultJsonSerializer;
    }
}