import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CountersByDocId } from "../CounterInternalTypes";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { CaseInsensitiveKeysMap } from "../../../Primitives/CaseInsensitiveKeysMap";
import { CaseInsensitiveStringSet } from "../../../Primitives/CaseInsensitiveStringSet";

export class IncludeBuilderBase {

    private _nextParameterId: number = 1;
    private readonly _conventions: DocumentConventions;

    public documentsToInclude: Set<string>;
    public alias: string;
    public countersToIncludeBySourcePath: CountersByDocId;

    public get countersToInclude(): Set<string> {
        if (!this.countersToIncludeBySourcePath) {
            return null;
        }

        const value = this.countersToIncludeBySourcePath.get("");
        return value ? value[1] : new Set();
    }

    public get isAllCounters(): boolean {
        if (!this.countersToIncludeBySourcePath) {
            return false;
        }

        const value = this.countersToIncludeBySourcePath.get("");
        return value ? value[0] : false;
    }

    public constructor(conventions: DocumentConventions) {
        this._conventions = conventions;
    }
    protected _includeCounterWithAlias(path: string, name: string): void;
    protected _includeCounterWithAlias(path: string, names: string[]): void;
    protected _includeCounterWithAlias(path: string, names: string | string[]): void {
        this._withAlias();
        if (Array.isArray(names)) {
            this._includeCounters(path, names);
        } else {
            this._includeCounter(path, names);
        }
    }

    protected _includeDocuments(path: string) {
        if (!this.documentsToInclude) {
            this.documentsToInclude = new Set();
        }

        this.documentsToInclude.add(path);
    }

    protected _includeCounter(path: string, name: string): void {
        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be empty.");
        }

        this._assertNotAllAndAddNewEntryIfNeeded(path);
        this.countersToIncludeBySourcePath.get(path)[1].add(name);
    }

    protected _includeCounters(path: string, names: string[]): void {
        if (!names) {
            throwError("InvalidArgumentException", "Names cannot be null.");
        }

        this._assertNotAllAndAddNewEntryIfNeeded(path);
        for (const name of names) {
            if (StringUtil.isNullOrWhitespace(name)) {
                throwError(
                    "InvalidArgumentException",
                    "Counters(String[] names): 'names' should not contain null or whitespace elements.");
            }

            this.countersToIncludeBySourcePath.get(path)[1].add(name);
        }
    }

    protected _includeAllCountersWithAlias(path: string): void {
        this._withAlias();
        this._includeAllCounters(path);
    }

    protected _includeAllCounters(sourcePath: string): void {
        if (!this.countersToIncludeBySourcePath) {
            this.countersToIncludeBySourcePath =
                CaseInsensitiveKeysMap.create<[boolean, Set<string>]>();
        }

        const val = this.countersToIncludeBySourcePath.get(sourcePath);
        if (val && val[1]) {
            throwError(
                "InvalidOperationException",
                "You cannot use allCounters() after using counter(String name) or counters(String[] names).");
        }

        this.countersToIncludeBySourcePath.set(sourcePath, [true, null]);
    }

    protected _assertNotAllAndAddNewEntryIfNeeded(path: string): void {
        if (this.countersToIncludeBySourcePath) {
            const val = this.countersToIncludeBySourcePath.get(path);
            if (val && val[0]) {
                throwError(
                    "InvalidOperationException", "You cannot use counter(name) after using allCounters().");
            }
        }

        if (!this.countersToIncludeBySourcePath) {
            this.countersToIncludeBySourcePath = CaseInsensitiveKeysMap.create<[boolean, Set<string>]>();
        }

        if (!this.countersToIncludeBySourcePath.has(path)) {
            this.countersToIncludeBySourcePath.set(
                path, [false, CaseInsensitiveStringSet.create()]);
        }
    }

    protected _withAlias(): void {
        if (!this.alias) {
            this.alias = "a_" + (this._nextParameterId++);
        }
    }
}
