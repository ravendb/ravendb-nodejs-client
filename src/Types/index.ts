export interface IRavenObject<T = any> {
    [property: string]: T;
}

export interface ClassConstructor { 
    name: string;
    new(...args: any[]): any; 
}

export interface EntityConstructor<T extends object> extends ClassConstructor { 
     new(...args: any[]): T; 
}

export interface Todo {}

export type ObjectTypeDescriptor = ClassConstructor | ObjectLiteralDescriptor;
export abstract class EntityObjectLiteralDescriptor<T extends object> implements ObjectLiteralDescriptor {
    public abstract name: string;
    public abstract isType(obj: object);
    public abstract construct(dto: object): T;
}

export interface ObjectLiteralDescriptor<TResult extends object = object> {
    name: string;
    isType(obj: object);
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