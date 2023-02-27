import { AbstractGenericIndexCreationTask } from "./AbstractGenericIndexCreationTask";
import { EnumMapping } from "./Enums";
import { IndexDefinitionHelper } from "./IndexDefinitionHelper";
import { TypeUtil } from "../../Utility/TypeUtil";


export abstract class BaseJavaScriptIndexCreationTask<TField extends string = string> extends AbstractGenericIndexCreationTask<TField> {

    protected _registeredEnums: EnumMapping[] = [];

    /**
     * This extension point to tweak strongly typed index definitions
     * @param definition original index definition
     * @param origin origin of definition: map or reduce
     * @protected
     */
    protected postProcessDefinition(definition: string, origin: "map" | "reduce") {
        if (this._registeredEnums.length) {
            for (const transformation of this._registeredEnums) {
                const actualValue = transformation.actualValue;
                const escapedValue = TypeUtil.isNumber(actualValue) ? actualValue.toString() : '"' + actualValue + '"';
                definition = definition.replace(transformation.sourceCode, escapedValue);
            }
        }

        return definition;
    }

    protected registerEnum(provider: () => string | number) {
        const value = provider();
        const functionBody = provider.toString();

        this._registeredEnums.push({
            sourceCode: IndexDefinitionHelper.extractEnumNotation(functionBody),
            actualValue: value
        });
    }
}
