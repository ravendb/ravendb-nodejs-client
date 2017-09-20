import {QueryToken} from "./QueryToken";
import {StringBuilder} from "../../../../Utility/StringBuilder";
import {QueryKeywords, QueryOperators, SearchOperator, SearchOperators, WhereOperator, WhereOperators} from "../QueryLanguage";
import {ShapeToken} from "./ShapeToken";
import {TypeUtil} from "../../../../Utility/TypeUtil";
import {ArgumentOutOfRangeException} from "../../../../Database/DatabaseExceptions";
import {SpatialConstants} from "../Spatial/SpatialConstants";

export interface IWhereTokenOptions {
  fieldName?: string;
  whereOperator?: WhereOperator;
  searchOperator?: SearchOperator;
  parameterName?: string;
  fromParameterName?: string;
  toParameterName?: string;
  exact?: boolean;
  distanceErrorPct?: number;
  whereShape?: ShapeToken;
}

export class WhereToken extends QueryToken
{
  private _fieldName: string;
  private _whereOperator: WhereOperator;
  private _searchOperator?: SearchOperator = null;
  private _parameterName: string;
  private _fromParameterName: string;
  private _toParameterName: string;
  private _boost?: number = null;
  private _fuzzy?: number = null;
  private _proximity?: number;
  private _exact: boolean = false;
  private _distanceErrorPct: number;
  private _whereShape: ShapeToken;

  public static equals(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.Equals,
      exact
    });
  }

  public static notEquals(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.NotEquals,
      exact
    });
  }

  public static startsWith(fieldName: string, parameterName: string): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.StartsWith
    });
  }

  public static endsWith(fieldName: string, parameterName: string): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.EndsWith
    });
  }

  public static greaterThan(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.GreaterThan,
      exact
    });
  }

  public static greaterThanOrEqual(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.GreaterThanOrEqual,
      exact
    });
  }

  public static lessThan(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.LessThan,
      exact
    });
  }

  public static lessThanOrEqual(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.LessThanOrEqual,
      exact
    });
  }

  public static in(fieldName: string, parameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.In,
      exact
    });
  }

  public static allIn(fieldName: string, parameterName: string): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.AllIn
    });
  }

  public static between(fieldName: string, fromParameterName: string, toParameterName: string, exact: boolean = false): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      fromParameterName,
      toParameterName,
      whereOperator: WhereOperators.Between,
      exact
    });
  }

  public static search(fieldName: string, parameterName: string, op: SearchOperator = SearchOperators.And): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.Search,
      searchOperator: op
    });
  }

  public static lucene(fieldName: string, parameterName: string): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      parameterName,
      whereOperator: WhereOperators.Lucene
    });
  }

  public static exists(fieldName: string): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      whereOperator: WhereOperators.Exists
    });
  }

  public static within(fieldName: string, shape: ShapeToken, distanceErrorPct: number): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      whereOperator: WhereOperators.Within,
      whereShape: shape,
      distanceErrorPct: distanceErrorPct
    });
  }

  public static contains(fieldName: string, shape: ShapeToken, distanceErrorPct: number): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      whereOperator: WhereOperators.Contains,
      whereShape: shape,
      distanceErrorPct: distanceErrorPct
    });
  }

  public static disjoint(fieldName: string, shape: ShapeToken, distanceErrorPct: number): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      whereOperator: WhereOperators.Disjoint,
      whereShape: shape,
      distanceErrorPct: distanceErrorPct
    });
  }

  public static intersects(fieldName: string, shape: ShapeToken, distanceErrorPct: number): WhereToken {
    return new (this as (typeof WhereToken))({
      fieldName,
      whereOperator: WhereOperators.Intersects,
      whereShape: shape,
      distanceErrorPct: distanceErrorPct
    });
  }

  constructor(whereOptions: IWhereTokenOptions) {
    super();
    this._fieldName = whereOptions.fieldName;
    this._whereOperator = whereOptions.whereOperator;
    this._searchOperator = whereOptions.searchOperator || null;
    this._parameterName = whereOptions.parameterName || null;
    this._fromParameterName = whereOptions.fromParameterName || null;
    this._toParameterName = whereOptions.toParameterName || null;
    this._exact = whereOptions.exact || false;
    this._distanceErrorPct = whereOptions.distanceErrorPct || null;
    this._whereShape = whereOptions.whereShape || null;
  }

  public get fieldName(): string {
    return this._fieldName;
  }

  public get whereOperator(): WhereOperator {
    return this._whereOperator;
  }

  public get searchOperator(): SearchOperator {
    return this._searchOperator;
  }

  public get parameterName(): string {
    return this._parameterName;
  }

  public get fromParameterName(): string {
    return this._fromParameterName;
  }

  public get toParameterName(): string {
    return this._toParameterName;
  }

  public get boost(): number {
    return this._boost;
  }

  public get fuzzy(): number {
    return this._fuzzy;
  }

  public get proximity(): number {
    return this._proximity;
  }

  public get exact(): boolean {
    return this._exact;
  }

  public get distanceErrorPct(): number {
    return this._distanceErrorPct;
  }

  public get whereShape(): ShapeToken {
    return this._whereShape;
  }

  public set boost(value: number) {
    this._boost = value;
  }

  public set fuzzy(value: number) {
    this._fuzzy = value;
  }

  public set proximity(value: number) {
    this._proximity = value;
  }

  public writeTo(writer: StringBuilder): void {
    if (!TypeUtil.isNone(this._boost)) {
      writer.append("boost(");
    }

    if (!TypeUtil.isNone(this._fuzzy)) {
      writer.append("fuzzy(");
    }

    if (!TypeUtil.isNone(this._proximity)) {
      writer.append("proximity(");
    }

    if (this._exact) {
      writer.append("exact(");
    }

    switch (this._whereOperator)
    {
      case WhereOperators.Search:
      case WhereOperators.Lucene:
      case WhereOperators.StartsWith:
      case WhereOperators.EndsWith:
      case WhereOperators.Exists:
      case WhereOperators.Within:
      case WhereOperators.Contains:
      case WhereOperators.Disjoint:
      case WhereOperators.Intersects:
        writer
          .append(this._whereOperator)
          .append("(");
        break;
    }

    this.writeField(writer, this._fieldName);

    switch (this._whereOperator) {
      case WhereOperators.In:
        writer
          .append(" ")
          .append(QueryKeywords.In)
          .append(" ($")
          .append(this._parameterName)
          .append(")");
        break;
      case WhereOperators.AllIn:
        writer
          .append(" ")
          .append(QueryKeywords.All)
          .append(" ")
          .append(QueryKeywords.In)
          .append(" ($")
          .append(this._parameterName)
          .append(")");
        break;
      case WhereOperators.Between:
        writer
          .append(" ")
          .append(QueryKeywords.Between)
          .append(" $")
          .append(this._fromParameterName)
          .append(" ")
          .append(QueryOperators.And)
          .append(" $")
          .append(this._toParameterName);
        break;
      case WhereOperators.Equals:
        writer
          .append(" = $")
          .append(this._parameterName);
        break;
      case WhereOperators.NotEquals:
        writer
          .append(" != $")
          .append(this._parameterName);
        break;
      case WhereOperators.GreaterThan:
        writer
          .append(" > $")
          .append(this._parameterName);
        break;
      case WhereOperators.GreaterThanOrEqual:
        writer
          .append(" >= $")
          .append(this._parameterName);
        break;
      case WhereOperators.LessThan:
        writer
          .append(" < $")
          .append(this._parameterName);
        break;
      case WhereOperators.LessThanOrEqual:
        writer
          .append(" <= $")
          .append(this._parameterName);
        break;
      case WhereOperators.Search:
        writer
          .append(", $")
          .append(this._parameterName);

        if (this._searchOperator === SearchOperators.And) {
          writer
            .append(", ")
            .append(this._searchOperator);
        }


        writer.append(")");
        break;
      case WhereOperators.Lucene:
      case WhereOperators.StartsWith:
      case WhereOperators.EndsWith:
        writer
          .append(", $")
          .append(this._parameterName)
          .append(")");
        break;
      case WhereOperators.Exists:
        writer
          .append(")");
        break;
      case WhereOperators.Within:
      case WhereOperators.Contains:
      case WhereOperators.Disjoint:
      case WhereOperators.Intersects:
        writer
          .append(", ");

        this._whereShape.writeTo(writer);

        if (Math.abs(this._distanceErrorPct - SpatialConstants.DefaultDistanceErrorPct) > Number.EPSILON) {
          writer.append(", ");
          writer.append(this._distanceErrorPct.toString());
        }

        writer
          .append(")");
        break;
      default:
        throw new ArgumentOutOfRangeException("Invalid where operator provided");
    }

    if (this._exact) {
      writer.append(")");
    }

    if (!TypeUtil.isNone(this._proximity)) {
      writer
        .append(", ")
        .append(this._proximity.toString())
        .append(")");
    }

    if (!TypeUtil.isNone(this._fuzzy)) {
      writer
        .append(", ")
        .append(this._fuzzy.toString())
        .append(")");
    }

    if (!TypeUtil.isNone(this._boost)) {
      writer
        .append(", ")
        .append(this._boost.toString())
        .append(")");
    }
  }
}