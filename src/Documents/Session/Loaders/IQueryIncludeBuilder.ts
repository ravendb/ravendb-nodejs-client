import { IGenericIncludeBuilder } from "./IGenericIncludeBuilder";

export interface IQueryIncludeBuilder extends IGenericIncludeBuilder<IQueryIncludeBuilder> {

    includeCounter(name: string): IQueryIncludeBuilder;
    includeCounter(path: string, name: string): IQueryIncludeBuilder;

    includeCounters(names: string[]): IQueryIncludeBuilder;
    includeCounters(path: string, names: string[]): IQueryIncludeBuilder;

    includeAllCounters(): IQueryIncludeBuilder;
    includeAllCounters(path: string): IQueryIncludeBuilder;
}
