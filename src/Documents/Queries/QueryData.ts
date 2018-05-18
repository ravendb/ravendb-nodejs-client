import { DeclareToken } from "../Session/Tokens/DeclareToken";
import { LoadToken } from "../Session/Tokens/LoadToken";

export class QueryData {

    public fields: string[];
    public projections: string[];
    public fromAlias: string;
    public declareToken: DeclareToken;
    public loadTokens: LoadToken[];
    public isCustomFunction: boolean;

    public constructor(fields: string[], projections: string[]); 
    public constructor(
        fields: string[], 
        projections: string[], 
        fromAlias: string, 
        declareToken: DeclareToken, 
        loadTokens: LoadToken[], 
        isCustomFunction: boolean); 
    public constructor(
        fields: string[], 
        projections: string[], 
        fromAlias: string = null, 
        declareToken: DeclareToken = null, 
        loadTokens: LoadToken[] = null, 
        isCustomFunction: boolean = false) {

        this.fields = fields;
        this.projections = projections;
        this.fromAlias = fromAlias;
        this.declareToken = declareToken;
        this.loadTokens = loadTokens;
        this.isCustomFunction = isCustomFunction;
    }

    public static customFunction(alias: string, func: string): QueryData  {
        return new QueryData([ func ], [], alias, null, null, false);
    }

}