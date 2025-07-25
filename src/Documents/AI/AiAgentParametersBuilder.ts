export interface IAiAgentParametersBuilder {
    addParameter(key: string, value: any): IAiAgentParametersBuilder;
}

export class AiAgentParametersBuilder implements IAiAgentParametersBuilder {
    private readonly _parameters = new Map<string, any>();

    public addParameter(key: string, value: any): IAiAgentParametersBuilder {
        this._parameters.set(key, value);
        return this;
    }

    public getParameters(): Record<string, any> | null {
        return this._parameters.size === 0 ? null : Object.fromEntries(this._parameters);
    }
}
