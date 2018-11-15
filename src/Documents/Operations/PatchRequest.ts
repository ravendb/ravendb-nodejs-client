import { DocumentConventions } from "../Conventions/DocumentConventions";

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
        const result = {
            Script: this.script
        };

        if (this.values && Object.keys(this.values).length) {
            result["Values"] = Object.entries(this.values).reduce((result, [key, val]) => {
                const literal = conventions.objectMapper.toObjectLiteral(val);
                result[key] = conventions.transformObjectKeysToRemoteFieldNameConvention(literal);
                return result;
            }, {});
        }

        return result;
    }
}
