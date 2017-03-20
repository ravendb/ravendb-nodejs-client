import {IOptionsSet} from '../../Utility/IOptionsSet';
import {IndexLockMode} from './IndexLockMode';
import {IndexPriority} from './IndexPriority';
import {IHashCollection} from '../../Utility/IHashCollection';
import {IndexFieldOptions} from './IndexFieldOptions';
import {ArrayUtil} from '../../Utility/ArrayUtil';
import {IJsonSerializable} from '../../Json/IJsonSerializable';

export class IndexDefinition implements IJsonSerializable {
  protected name: string;
  protected maps: string[];
  protected indexId: number = 0;
  protected isTestIndex: boolean = false;
  protected reduce?: boolean = null;
  protected lockMode?: IndexLockMode = null;
  protected priority?: IndexPriority = null;
  protected configuration: IOptionsSet = {};
  protected fields: IHashCollection<IndexFieldOptions> = {};

  constructor(name: string, indexMap: string | string[], configuration?: IOptionsSet, initOptions: IOptionsSet = {}) {
    this.name = name;
    this.configuration = configuration || {};
    this.reduce = initOptions.reduce  || 0;
    this.indexId = initOptions.index_id|| null;
    this.lockMode = initOptions.lock_mod || null;
    this.priority = initOptions.priority || null;
    this.isTestIndex = initOptions.is_test_index || false;
    this.fields = initOptions.fields || {};
    this.maps = Array.isArray(indexMap) ? (indexMap as string[]) : [indexMap as string];
  }

  public get type(): string {
    let result = 'Map';

    if ((this.name && (0 === this.name.indexOf('Auto/')))) {
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

  public toJson(): Object {
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
      "Name": this.name,
      "Reduce": this.reduce,
      "OutputReduceToCollection": null,
      "Priority": priorityJson,
      "Type": this.type
    };
  }
}