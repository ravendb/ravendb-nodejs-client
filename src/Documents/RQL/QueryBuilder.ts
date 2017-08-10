import {TypeUtil} from "../../Utility/TypeUtil";
import {StringUtil} from "../../Utility/StringUtil";

export class QueryBuilder {

  private _select: string;
  private _from: string;
  private _where: string;
  private _order: string;
  private _clear: boolean;
  public defaultOperator: string;
  public operator: string;
  public negate: boolean;
  public rqlText: string = '';

  constructor() {
    this._select = '';
    this._from = '';
    this._where = '';
    this._order = '';
    this._clear = true;
    this.defaultOperator = '';
    this.operator = this.defaultOperator;
    this.negate = false;
    this.rqlText = null;
  }

  public get and() {
    this.operator = 'AND';
    return this;
  }

  public get or() {
    this.operator = 'OR';
    return this;
  }

  public get andNot() {
    this.operator = 'AND NOT';
    return this;
  }

  public get not() {
    this.negate = true;
    return this;
  }

  public select(fields = '') {

    if (TypeUtil.isArray(fields)) {
      this._select = fields.join(', ');
    }
    else if (fields) {
      this._select = fields;
    }
    else {
      this._select = '*';
    }

    return this;

  }

  public from(collectionOrIndex) {

    this._from = collectionOrIndex;

    return this;

  }

  public order(field, direction = 'ASC') {

    this._order = StringUtil.format(`{0} {1}`, field, direction);

    return this;

  }

  public where(conditionType, conditionField, conditionValue = null) {
    this._where = '';
    this._clear = true;

    switch (conditionType) {
      case 'greaterThan':
        this.rqlText = StringUtil.format(`{0}>{1}`, conditionField, conditionValue);
        break;
      case 'lessThan':
        this.rqlText = StringUtil.format(`{0}<{1}`, conditionField, conditionValue);
        break;
      case 'search':
        //OR boost({0} = '{1}', {2}
        this.rqlText = StringUtil.format(`search({0},'{1}')`, conditionField, conditionValue);
        break;
      case 'equals':
        (conditionValue === null || conditionValue === 'null') ?
          this.rqlText = StringUtil.format(`{0}={1}`, conditionField, conditionValue) :
          this.rqlText = StringUtil.format(`{0}='{1}'`, conditionField, conditionValue);
        break;
      case 'clear':
        (conditionValue === null || conditionValue === 'null') ?
          this.rqlText = StringUtil.format(`{0}={1}`, conditionField, conditionValue) :
          this.rqlText = StringUtil.format(`{0}='{1}'`, conditionField, conditionValue);
        this._clear = false;
        break;
      case 'between':
        this.rqlText = StringUtil.format(`BETWEEN {1}`, conditionValue);
        break;
      case 'whereFiled':
        this.rqlText = StringUtil.format(`{0}`, conditionField);
        break;
      case 'startsWith':
        this.rqlText = StringUtil.format(`StartsWith({0}, '{1}')`, conditionField, conditionValue);
        break;
      case 'endsWith':
        this.rqlText = StringUtil.format(`EndsWith({0}, '{1}')`, conditionField, conditionValue);
        break;
      case 'in':
        this.rqlText = StringUtil.format(`{0} IN ('{1}')`, conditionField, conditionValue);
        break;
    }

    this.whereRaw(this.rqlText);

    return this;

  }

  public between(start, end) {

    this.rqlText = StringUtil.format(`BETWEEN {0} AND {1}`, start, end);

    this.whereRaw(this.rqlText);

    return this;

  }


  public whereRaw(rqlCondition) {

    let addNot: string = this.negate ? 'NOT ' : '';

    this._where += `${this.operator} ${rqlCondition} ${addNot}`;

    this.operator = this.defaultOperator;
    this.negate = false;

  }

  public getRql() {

    let rql: string = ``;

    if (this._select) {
      rql += `SELECT ${this._select} `;
    }

    if (this._from) {
      rql += `FROM ${this._from}`;
      this._from = '';
    }

    if (this._where) {
      if(this._clear) {
        rql += ` WHERE ${this._where}`;
      }
      else {
        rql += ` ${this._where}`;
      }
    }

    if (this._order) {
      rql += ` ORDER BY ${this._order}`;
    }

    return rql as string;
  }


}