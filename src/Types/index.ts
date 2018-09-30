import {SuggestionResult} from "../Documents/Queries/Suggestions/SuggestionResult";

export interface EntitiesCollectionObject<TEntity> extends IRavenObject<TEntity> {
    [id: string]: TEntity;
}

export interface RevisionsCollectionObject<TEntity> extends IRavenObject<TEntity> {
    [changeVector: string]: TEntity;
}

export interface SuggestionsResponseObject {
    [fieldName: string]: SuggestionResult;
}

export interface IRavenObject<T = any> {
    [property: string]: T;
}

export interface IRavenArrayResult {
    results: any[];
}

export interface ClassConstructor<T extends Object = Object> { 
    name: string;
    new(...args: any[]): any; 
}

export interface EntityConstructor<T extends object = object> 
    extends ClassConstructor<T> {
    new(...args: any[]): T;
    name: string;
}

export type ObjectTypeDescriptor<T extends object = object> = EntityConstructor<T> | ObjectLiteralDescriptor<T>;

export abstract class EntityObjectLiteralDescriptor<T extends object> implements ObjectLiteralDescriptor {
    public abstract name: string;
    public abstract isType(obj: object);
    public abstract construct(dto: object): T;
}

export interface ObjectLiteralDescriptor<TResult extends object = object> {
    name: string;
    isType(obj: object): boolean;
    construct(dto: object): TResult;
}

export abstract class PropsBasedObjectLiteralDescriptor<T extends object> 
    implements EntityObjectLiteralDescriptor<T> {
    // if it quacks like a duck...

    public abstract name: string;
    public abstract properties: string[];
    public abstract construct(dto: object): T; 

    public isType(obj: object) {
        return this._hasProperties(obj);
    } 
    
    private _hasProperties(obj: object): boolean {
        return this.properties.reduce((result, property) => {
            return result && obj.hasOwnProperty(property);
        }, true);
    }
}
