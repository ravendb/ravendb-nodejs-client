import { IGenericIncludeBuilder } from "./IGenericIncludeBuilder";

export interface IQueryIncludeBuilder extends IGenericIncludeBuilder<IQueryIncludeBuilder> {

    includeCounter(path: string, name: string): IQueryIncludeBuilder;
    
    includeCounters(path: string, names: string[]): IQueryIncludeBuilder;

    includeAllCounters(path: string): IQueryIncludeBuilder;
}
