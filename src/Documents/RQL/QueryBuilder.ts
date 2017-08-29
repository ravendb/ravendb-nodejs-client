import {TypeUtil} from "../../Utility/TypeUtil";
import {StringUtil} from "../../Utility/StringUtil";
import {RqlOperators} from "./RQLOperator";
import {QueryOperators} from "../Session/QueryOperator";
import {RQLQuerySource, RQLQuerySources} from "./RQLQuerySources";

export class QueryBuilder {

  private _select: string;
  private _from: string;
  private _where: string;
  private _order: string;
  private _or: boolean;
  private _fromCollection: string;
  public defaultOperator: string;
  public operator: string;
  public openClause: string;
  public closeClause: string;
  public negate: boolean;

  constructor() {
    this._select = '';
    this._from = '';
    this._where = '';
    this._order = '';
    this._or = true;
    this._fromCollection = '';
    this.defaultOperator = '';
    this.operator = this.defaultOperator;
    this.openClause = '';
    this.closeClause = '';
    this.negate = false;
  }

  public get openSubClause() {
    this.openClause = QueryOperators.OPENSUBCLAUSE;
    return this;
  }

  public get closeSubClause() {
    this.closeClause = QueryOperators.CLOSESUBCLAUSE;
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

  public from(source: string, sourceType: RQLQuerySource = RQLQuerySources.Collection) {

    switch(sourceType) {

      case RQLQuerySources.Collection:
        this._fromCollection = source;
        break;

      case RQLQuerySources.Index:
        this._from = source;
        break;
    }

  }

  public fromCollection(collection) {
    this.from(collection, RQLQuerySources.Collection);
    return this;
  }

  public fromIndex(index) {
    this.from(index, RQLQuerySources.Index);
    return this;
  }

  public order(field, direction = 'ASC') {

    this._order = StringUtil.format(`{0} {1}`, field, direction);

    return this;

  }

  public where(conditionType, conditionField, conditionValue = null) {

    let rqlText: string;

    switch (conditionType) {
      case RqlOperators.GREATER_THAN:
        rqlText = StringUtil.format(`{0}>{1} `, conditionField, conditionValue);
        break;
      case RqlOperators.LESS_THAN:
        rqlText = StringUtil.format(`{0}<{1} `, conditionField, conditionValue);
        break;
      case RqlOperators.EQUALS:
        (conditionValue === null || conditionValue === 'null') ?
          rqlText = StringUtil.format(`{0}={1} `, conditionField, conditionValue) :
          rqlText = StringUtil.format(`{0}='{1}' `, conditionField, conditionValue);
        break;
      case RqlOperators.BETWEEN:
        rqlText = StringUtil.format(`{0} BETWEEN {1} AND {2}`, conditionField, conditionValue.start, conditionValue.end);
        break;
      case RqlOperators.STARTS_WITH:
        rqlText = StringUtil.format(`startsWith({0}, '{1}')`, conditionField, conditionValue);
        break;
      case RqlOperators.ENDS_WITH:
        rqlText = StringUtil.format(`endsWith({0}, '{1}')`, conditionField, conditionValue);
        break;
      case RqlOperators.IN:
        rqlText = StringUtil.format(`{0} IN ('{1}')`, conditionField, conditionValue);
        break;
      case RqlOperators.SEARCH:
        rqlText = StringUtil.format(`search({0},'{1}') `, conditionField, conditionValue);
        break;
      case RqlOperators.EXACT:
        rqlText = StringUtil.format(`exact({0}='{1}') `, conditionField, conditionValue);
        break;
      case RqlOperators.BOOST:
        rqlText = StringUtil.format(`boost({0} {1} '{2}', {3})`, conditionField.boostField, conditionField.boostExpression, conditionField.boostValue, conditionValue);
        break;
    }

    this.whereRaw(rqlText);

    return this;

  }

  public whereRaw(rqlCondition) {

    let addNot: string = this.negate ? 'NOT ' : '';

    this._where += StringUtil.format(`{0} {3}{1} {2}{4}`, this.operator, addNot, rqlCondition, this.openClause, this.closeClause);

    this.operator = this.defaultOperator;

    this.openClause = this.defaultOperator;
    this.closeClause = this.defaultOperator;

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