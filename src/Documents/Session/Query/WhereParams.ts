import {ConditionValue} from "./QueryLanguage";

export interface IWhereParams<V extends ConditionValue> {
  fieldName: string;
  value: V;
  allowWildcards?: boolean;
  isNestedPath?: boolean;
  exact?: boolean;
}

export class WhereParams<V extends ConditionValue> implements IWhereParams<V> {
  constructor(
    public fieldName: string,
    public value: V,
    public allowWildcards: boolean = false,
    public isNestedPath: boolean = false,
    public exact: boolean = false
  ) {}
}