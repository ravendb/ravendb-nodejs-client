import {TypeUtil} from "../../Utility/TypeUtil";
import {StringUtil} from "../../Utility/StringUtil";
import {RqlOperators} from "../RQL/RQLOperator";
import {QueryOperators} from "../Session/QueryOperator";

export class QueryBuilder {

  private _select: string;
  private _from: string;
  private _where: string;
  private _order: string;
  private _or: boolean;
  private _fromCollection: boolean;
  public defaultOperator: string;
  public operator: string;
  public negate: boolean;
  public rqlText: string = '';

  constructor() {
    this._select = '';
    this._from = '';
    this._where = '';
    this._order = '';
    this._or = true;
    this._fromCollection = false;
    this.defaultOperator = '';
    this.operator = this.defaultOperator;
    this.negate = false;
    this.rqlText = null;
  }

  public get openSubClause() {
    this.operator = QueryOperators.OPENSUBCLAUSE;
    return this;
  }

  public get closeSubClause() {
    this.operator = QueryOperators.CLOSESUBCLAUSE;
    return this;
  }

  public get and() {
    this.operator = QueryOperators.AND;
    return this;
  }

  public get or() {
    this.operator = QueryOperators.OR;
    return this;
  }

  public get not() {
    this.negate = true;
    return this;
  }

  public select(fields?) {

    if (TypeUtil.isArray(fields)) {
      this._select = fields.join(', ');
    }
    else if (fields) {
      this._select = fields;
    }
    else {
      this._select = '@all_docs';
    }

    return this;

  }

  public from(collectionOrIndex, fromCollection) {

    if(fromCollection) {
      this._fromCollection = collectionOrIndex;
    }
    else {
      this._from = collectionOrIndex;
    }

    return this;

  }

  public order(field, direction = 'ASC') {

    this._order = StringUtil.format(`{0} {1}`, field, direction);

    return this;

  }

  public where(conditionType, conditionField, conditionValue = null) {

    switch (conditionType) {
      case RqlOperators.GREATER_THAN:
        this.rqlText = StringUtil.format(`{0}>{1} `, conditionField, conditionValue);
        break;
      case RqlOperators.LESS_THAN:
        this.rqlText = StringUtil.format(`{0}<{1} `, conditionField, conditionValue);
        break;
      case RqlOperators.EQUALS:
        (conditionValue === null || conditionValue === 'null') ?
          this.rqlText = StringUtil.format(`{0}={1} `, conditionField, conditionValue) :
          this.rqlText = StringUtil.format(`{0}='{1}' `, conditionField, conditionValue);
        break;
      case RqlOperators.BETWEEN:
        this.rqlText = StringUtil.format(`{0} BETWEEN {1} AND {2}`, conditionField, conditionValue.start, conditionValue.end);
        break;
      case RqlOperators.STARTS_WITH:
        this.rqlText = StringUtil.format(`startsWith({0}, '{1}')`, conditionField, conditionValue);
        break;
      case RqlOperators.ENDS_WITH:
        this.rqlText = StringUtil.format(`endsWith({0}, '{1}')`, conditionField, conditionValue);
        break;
      case RqlOperators.IN:
        this.rqlText = StringUtil.format(`{0} IN ('{1}')`, conditionField, conditionValue);
        break;
      case RqlOperators.SEARCH:
        this.rqlText = StringUtil.format(`search({0},'{1}') `, conditionField, conditionValue);
        break;
      case RqlOperators.BOOST:
        this.rqlText = StringUtil.format(`boost({0} {1} '{2}', {3})`, conditionField.boostField, conditionField.boostExpression, conditionField.boostValue, conditionValue);
        break;
    }

    this.whereRaw(this.rqlText);

    return this;

  }


  public whereRaw(rqlCondition) {

    let addNot: string = this.negate ? 'NOT ' : '';

    this._where += StringUtil.format(`1{0} {1} {2}`, this.operator, addNot, rqlCondition);

    this.operator = this.defaultOperator;

    this.negate = false;

  }

  public getRql() {

    let rql: string = ``;

    if (this._select) {
      rql += StringUtil.format(`SELECT {0} `, this._select);
    }

    if (this._from) {
      rql += StringUtil.format(`FROM INDEX {0} `,this._from);
    }

    if (this._fromCollection) {
      rql += StringUtil.format(`FROM {0} `,this._fromCollection);
    }

    if (this._where) {
        rql += StringUtil.format(` WHERE {0}`, this._where);
    }

    if (this._order) {
      rql += StringUtil.format(` ORDER BY {0}`, this._order);
    }

    return rql as string;
  }

}