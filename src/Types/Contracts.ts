// TODO export interface IJsonable {
//   toJson(): object;
// }

// TODO export interface IJsonConvertible {
//   fromJson(json: object): void;
// }

// TODO export interface IStringable {
//   toString(): string;
// }

export interface IDisposable<T = void> {
    dispose(): T;
}
