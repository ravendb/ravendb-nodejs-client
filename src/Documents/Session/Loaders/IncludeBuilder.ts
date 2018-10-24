import { IQueryIncludeBuilder } from "./IQueryIncludeBuilder";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CountersByDocId } from "../CounterInternalTypes";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { CaseInsensitiveKeysMap } from "../../../Primitives/CaseInsensitiveKeysMap";
import { CaseInsensitiveStringSet } from "../../../Primitives/CaseInsensitiveStringSet";
import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { IIncludeBuilder } from "./IIncludeBuilder";
import { basename } from "path";

export class IncludeBuilder extends IncludeBuilderBase implements IIncludeBuilder {
    public constructor(conventions: DocumentConventions) {
        super(conventions);
    }

    public includeCounter(name: string): IIncludeBuilder;
    public includeCounter(path: string, name: string): IIncludeBuilder;
    public includeCounter(pathOrName: string, name?: string): IIncludeBuilder {
        if (arguments.length === 1) {
            this._includeCounter("", pathOrName);
        } else {
            this._includeCounterWithAlias(pathOrName, name);
        }

        return this;
    }

    public includeCounters(names: string[]): IIncludeBuilder;
    public includeCounters(path: string, names: string[]): IIncludeBuilder;
    public includeCounters(pathOrNames: string | string[], names?: string[]): IIncludeBuilder {
        if (arguments.length === 1) {
            this._includeCounters("", pathOrNames as string[]);
        } else {
            this._includeCounterWithAlias(pathOrNames as string, names);
        }

        return this;
    }

    public includeDocuments(path: string): IIncludeBuilder {
        this._includeDocuments(path);
        return this;
    }

    public includeAllCounters(): IIncludeBuilder {
        this._includeAllCounters("");
        return this;
    }
}
