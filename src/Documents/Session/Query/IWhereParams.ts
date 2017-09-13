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