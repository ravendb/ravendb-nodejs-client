export interface IJsonable {
  toJson(): object;
}

export interface IJsonConvertible {
  fromJson(json: object): void;
}