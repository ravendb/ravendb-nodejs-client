import {TypeUtil} from "../../Utility/TypeUtil";
import {StringUtil} from "../../Utility/StringUtil";
import {IRQLEqualsOperatorOptions, RQLOperator, RQLOperators, RQLJoinOperators, RQLOrderDirections, RQLOrderDirection} from "./RQLOperator";
import {RQLQuerySource, RQLQuerySources} from "./RQLQuerySource";
import {RQLValue, RQLRangeValue, RQLConditionValue} from "./RQLValue";

export class QueryBuilder {
  private _select: string = '*';
  private _from: string = '@all_docs';
  private _where: string = '';
  private _order: string = '';

  private _nextOperator: string = '';
  private _negateNext: boolean = false;
  private _boostNext: number = null;

  public openSubClause(): QueryBuilder {
    this.whereRaw(RQLJoinOperators.OPEN_SUBCLAUSE);

    return this;
  }

  public closeSubClause(): QueryBuilder {
    this.whereRaw(RQLJoinOperators.CLOSE_SUBCLAUSE);

    return this;
  }

  public and(): QueryBuilder {
    this._nextOperator = RQLJoinOperators.AND;

    return this;
  }

  public or(): QueryBuilder {
    this._nextOperator = RQLJoinOperators.OR;

    return this;
  }

  public not(): QueryBuilder {
    this._negateNext = true;

    return this;
  }

  public boost(boostFactor: number): QueryBuilder {
    this._boostNext = boostFactor;

    return this;
  }

  public select(fields?: string | string[]): QueryBuilder {
    let joinedFields: string = fields as string;

    if (TypeUtil.isArray(fields)) {
      joinedFields = (fields as string[]).join(', ');
    }

    this._select = joinedFields || '*';
    return this;
  }

  public from(source?: string, sourceType: RQLQuerySource = RQLQuerySources.Collection): QueryBuilder {
    this._from = source || '@all_docs';

    if (source && (RQLQuerySources.Index === sourceType)) {
      this._from = `INDEX ${this._from}`;      
    }
    return this;
  }

  public fromCollection(collection: string): QueryBuilder {
    this.from(collection, RQLQuerySources.Collection);

    return this;
  }

  public fromIndex(index: string): QueryBuilder {
    this.from(index, RQLQuerySources.Index);

    return this;
  }

  public order(field: string, direction: RQLOrderDirection = RQLOrderDirections.Ascending): QueryBuilder {
    this._order = StringUtil.format(`{0} {1}`, field, direction);

    return this;
  }

  public where(operator: RQLOperator, field: string, value?: RQLConditionValue, options: IRQLEqualsOperatorOptions = {}): QueryBuilder {
    let rqlText: string;
    const range: RQLRangeValue<RQLValue> = <RQLRangeValue<RQLValue>>value; 
    const values: RQLValue[] = <RQLValue[]>value;

    switch (operator) {
      case RQLOperators.GREATER_THAN:
        rqlText = StringUtil.format(`{0} > {1}`, field, value);
        break;
      case RQLOperators.LESS_THAN:
        rqlText = StringUtil.format(`{0} < {1}`, field, value);
        break;
      case RQLOperators.EQUALS:
        const formattedValue = (TypeUtil.isNone(value) || (value === 'null')) ? 'null' : `'${value}'`;
        if(options.exact) {
          rqlText = StringUtil.format(`exact({0}={1})`, field, formattedValue);
        }
        else {
          rqlText = StringUtil.format(`{0}={1}`, field, formattedValue);
        }
        break;
      case RQLOperators.BETWEEN:
        rqlText = StringUtil.format(`{0} BETWEEN {1} AND {2}`, field, range.min, range.max);
        break;
      case RQLOperators.STARTS_WITH:
        rqlText = StringUtil.format(`startsWith({0}, '{1}')`, field, value);
        break;
      case RQLOperators.ENDS_WITH:
        rqlText = StringUtil.format(`endsWith({0}, '{1}')`, field, value);
        break;
      case RQLOperators.IN:
        rqlText = StringUtil.format(`{0} IN ('{1}')`, field, value);
        break;
      case RQLOperators.SEARCH:
        rqlText = StringUtil.format(`search({0}, '{1}')`, field, value);
        break;
      case RQLOperators.GREATER_THAN_OR_EQUAL:
        rqlText = StringUtil.format(`{0}>={1}`, field, value);
        break;
      case RQLOperators.LESS_THAN_OR_EQUAL:
        rqlText = StringUtil.format(`{0}<={1}`, field, value);
        break;
    }

    this.whereRaw(rqlText);
    return this;
  }

  public whereRaw(rqlCondition: string): QueryBuilder {
    let where: string = (this._negateNext ? 'NOT ' : '') + rqlCondition;

    if (!TypeUtil.isNone(this._boostNext)) {
      where = `BOOST(${where}, ${this._boostNext})`;
    }

    if(this._nextOperator != '') {
      this._nextOperator= ' ' + this._nextOperator;
    }

    this._where += [this._nextOperator, where].join(' ');
    this._nextOperator = '';
    this._negateNext = false;
    this._boostNext = null;

    return this;
  }

  public getRql(): string {
    let rql: string = '';

    if (this._select) {
      rql += StringUtil.format(`SELECT {0}`, this._select);
    }

    rql += StringUtil.format(` FROM {0}`, this._from);

    if (this._where) {
      rql += StringUtil.format(` WHERE{0}`, this._where);
    }

    if (this._order) {
      rql += StringUtil.format(` ORDER BY {0}`, this._order);
    }

    return rql;
  }
}