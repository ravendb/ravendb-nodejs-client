import { DeclareToken } from "../Session/Tokens/DeclareToken";
import { LoadToken } from "../Session/Tokens/LoadToken";
import { ProjectionBehavior } from "./ProjectionBehavior";

export class QueryData {

    public fields: string[];
    public projections: string[];
    public fromAlias: string;
    public declareTokens: DeclareToken[];
    public loadTokens: LoadToken[];
    public isCustomFunction: boolean;
    public mapReduce: boolean;
    public isProjectInto: boolean;
    public projectionBehavior: ProjectionBehavior;

    public constructor(fields: string[], projections: string[]);
    public constructor(
        fields: string[],
        projections: string[],
        fromAlias: string,
        declareTokens: DeclareToken[],
        loadTokens: LoadToken[],
        isCustomFunction: boolean);
    public constructor(
        fields: string[],
        projections: string[],
        fromAlias: string = null,
        declareTokens: DeclareToken[] = null,
        loadTokens: LoadToken[] = null,
        isCustomFunction: boolean = false) {

        this.fields = fields;
        this.projections = projections;
        this.fromAlias = fromAlias;
        this.declareTokens = declareTokens;
        this.loadTokens = loadTokens;
        this.isCustomFunction = isCustomFunction;
    }

    public static customFunction(alias: string, func: string): QueryData {
        return new QueryData([func], [], alias, null, null, true);
    }

}
