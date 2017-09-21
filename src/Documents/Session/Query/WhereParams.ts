export interface IWhereParams<V> {
  fieldName: string;
  value?: V;
  allowWildcards?: boolean;
  isNestedPath?: boolean;
  exact?: boolean;
}

export interface IParametrizedWhereParams extends IWhereParams<void> {
  parameterName: string;
}

export class WhereParams<V> implements IWhereParams<V> {
  constructor(
    public fieldName: string,
    public value: V,
    public allowWildcards: boolean = false,
    public isNestedPath: boolean = false,
    public exact: boolean = false
  ) {}

  public static from<V>(paramsObject: IWhereParams<V>): WhereParams<V> {
    return new (this as (typeof WhereParams))(
      paramsObject.fieldName,
      paramsObject.value,
      paramsObject.allowWildcards,
      paramsObject.isNestedPath,
      paramsObject.exact
    ) as WhereParams<V>;
  }
}