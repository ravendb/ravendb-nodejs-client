import { DocumentConventions } from "../..";

export class PatchRequest {
    public script: string;
    public values: { [key: string]: any };

    public static forScript(script: string) {
        return Object.assign(
            new PatchRequest(),
            { script }
        );
    }

    public serialize(conventions: DocumentConventions) {
        return {
            Script: this.script,
            Values: Object.keys(this.values).reduce((result, next) => {
                const literal = conventions.objectMapper.toObjectLiteral(this.values[next]);
                result[next] = conventions.transformObjectKeysToRemoteFieldNameConvention(literal);
                return result;
            }, {})
        };
    }
}
