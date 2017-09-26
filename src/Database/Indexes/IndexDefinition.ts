import {IOptionsSet} from '../../Typedef/IOptionsSet';
import {IndexLockMode} from './IndexLockMode';
import {IndexPriority} from './IndexPriority';
import {IRavenObject} from '../../Typedef/IRavenObject';
import {IndexFieldOptions} from './IndexFieldOptions';
import {ArrayUtil} from '../../Utility/ArrayUtil';
import {IJsonable} from '../../Typedef/Contracts';
import {TypeUtil} from "../../Utility/TypeUtil";

export class IndexDefinition implements IJsonable {
  protected maps: string[];
  protected indexId: number = 0;
  protected isTestIndex: boolean = false;
  protected reduce?: boolean = null;
  protected lockMode?: IndexLockMode = null;
  protected priority?: IndexPriority = null;
  protected configuration: IOptionsSet = {};
  protected fields: IRavenObject<IndexFieldOptions> = {};
  private _name: string;

  constructor(name: string, indexMap: string | string[], configuration?: IOptionsSet, initOptions: IOptionsSet = {}) {
    this._name = name;
    this.configuration = configuration || {};
    this.reduce = initOptions.reduce || 0;
    this.indexId = <number>initOptions.index_id || null;
    this.lockMode = <IndexLockMode>initOptions.lock_mode || null;
    this.priority = <IndexPriority>initOptions.priority || null;
    this.isTestIndex = initOptions.is_test_index || false;
    this.fields = initOptions.fields || {};
    this.maps = TypeUtil.isArray(indexMap) ? (indexMap as string[]) : [indexMap as string];
  }

  public get name(): string {
    return this._name;
  }

  public get type(): string {
    let result = 'Map';

    if ((this._name && (0 === this._name.indexOf('Auto/')))) {
      result = 'Auto' + result;
    }

    if (this.reduce) {
      result += 'Reduce';
    }

    return result;
  }

  public get isMapReduce(): boolean {
    return this.reduce || false;
  }

  public get map(): string | null {
    if (this.maps.length) {
      return this.maps[0];
    }

    return null;
  }

  public set map(value: string) {
    if (this.maps.length) {
      this.maps.pop();
    }

    this.maps.push(value);
  }

  public toJson(): object {
    const lockModeJson: string | null = this.lockMode ? (this.lockMode as string) : null;
    const priorityJson: string | null = this.priority ? (this.priority as string) : null;
    const fieldsJson = ArrayUtil.mapObject(this.fields, (field: IndexFieldOptions) => field.toJson());

    return {
      "Configuration": this.configuration,
      "Fields": fieldsJson,
      "IndexId": this.indexId,
      "IsTestIndex": this.isTestIndex,
      "LockMode": lockModeJson,
      "Maps": this.maps,
      "Name": this._name,
      "Reduce": this.reduce,
      "OutputReduceToCollection": null,
      "Priority": priorityJson,
      "Type": this.type
    };
  }
}