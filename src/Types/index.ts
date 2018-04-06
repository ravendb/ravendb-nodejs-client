export interface IRavenObject<T = any> {
    [property: string]: T;
}

// tslint:disable-next-line:no-empty-interface
export interface IRavenResponse extends IRavenObject {}

export interface Todo {}