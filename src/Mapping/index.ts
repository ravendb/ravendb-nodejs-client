import { JsonSerializer, JSON_SERIALIZATION_TRANSORM } from "./Json";
import { TypesAwareObjectMapper } from "./ObjectMapper";
import { DateUtil } from "../Utility/DateUtil";

// needed tools
// json string -> casing aware -> object
// json string -> casing aware -> types aware -> entity

export class Mapping {
    private static _defaultJsonParser: JsonSerializer;
    private static _defaultEntityMapper: TypesAwareObjectMapper;

    public static getDefaultEntityMapper() {
        if (!this._defaultEntityMapper) {
            this._defaultEntityMapper = new TypesAwareObjectMapper({
                dateFormat: DateUtil.DEFAULT_DATE_FORMAT
            });
        }

        return this._defaultEntityMapper;
    }

    public static getDefaultJsonSerializer() {
        if (!this._defaultJsonParser) {
            this._defaultJsonParser = new JsonSerializer({
                transform: JSON_SERIALIZATION_TRANSORM.targetJsonPascalCase
            });
        }

        return this._defaultJsonParser;
    }
}