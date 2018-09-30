// export interface IJsonable {
//   toJson(): object;
// }

// export interface IJsonConvertible {
//   fromJson(json: object): void;
// }

// export interface IStringable {
//   toString(): string;
// }

export interface IDisposable<T = void> {
    dispose(): T;
}
