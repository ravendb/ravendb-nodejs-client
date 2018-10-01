import {pascalCaseReplacer} from "./Replacers";
import {camelCaseReviver} from "./Revivers";
import {ReplacerTransformRule, RuleBasedReplacerFactory} from "./ReplacerFactory";
import {ReviverTransformRule, RuleBasedReviverFactory} from "./ReviverFactory";

export type JsonTransformFunction = (key, value) => any;

export interface JsonSerializerSettings {
    replacerRules?: ReplacerTransformRule[];
    reviverRules?: ReviverTransformRule[];
}

export class JsonSerializer {

    private _reviverRules: ReviverTransformRule[];
    private _replacerRules: ReplacerTransformRule[];

    public get reviverRules(): ReviverTransformRule[] {
        return this._reviverRules;
    }

    public set reviverRules(value: ReviverTransformRule[]) {
        this._reviverRules = value;
    }

    public get replacerRules(): ReplacerTransformRule[] {
        return this._replacerRules;
    }

    public set replacerRules(value: ReplacerTransformRule[]) {
        this._replacerRules = value;
    }

    constructor(opts?: JsonSerializerSettings) {
        opts = opts || {};
        this._reviverRules = opts.reviverRules || [];
        this._replacerRules = opts.replacerRules || [];
    }

    public deserialize<TResult = object>(jsonString: string) {
        const reviver = RuleBasedReviverFactory.build(this._reviverRules);
        return JSON.parse(jsonString, reviver) as TResult;
    }

    public serialize(obj: object): string {
        const replacer = RuleBasedReplacerFactory.build(this._replacerRules);
        return JSON.stringify(obj, replacer);
    }

    public static getDefault(): JsonSerializer {
        return new JsonSerializer();
    }

    public static getDefaultForCommandPayload(): JsonSerializer {
        return new JsonSerializer({
            reviverRules: [
                {
                    contextMatcher: () => true,
                    reviver: camelCaseReviver
                }
            ],
            replacerRules: [
                {
                    contextMatcher: () => true,
                    replacer: pascalCaseReplacer
                }
            ]
        });
    }

    public static getDefaultForEntities() {
        return new JsonSerializer();
    }
}
