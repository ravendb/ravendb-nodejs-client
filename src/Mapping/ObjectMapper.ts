import { ObjectTypeDescriptor, ClassConstructor, ObjectLiteralDescriptor } from "../Types";
import { DateUtil } from "../Utility/DateUtil";
import { throwError } from "../Exceptions";
import { TypeUtil } from "../Utility/TypeUtil";

export interface TypeInfo {
    typeName?: string;
    nestedTypes?: NestedTypes;
}

export interface NestedTypes { 
    [propertyPath: string]: string;
}

export interface ITypesAwareObjectMapper {
    fromObjectLiteral<TResult extends object>(raw: object, typeInfo?: TypeInfo): TResult;
    toObjectLiteral<TFrom extends object>(obj: TFrom, typeInfo?: (typeInfo: TypeInfo) => void): object;
}

export class TypesAwareObjectMapper implements ITypesAwareObjectMapper {

    private _knownTypes: Map<string, ObjectTypeDescriptor>;
    private _dateFormat: string;

    public constructor(opts?: TypesAwareJsonObjectMapperOptions) {
        if (opts) {
            this._dateFormat = opts.dateFormat;
            this._knownTypes = opts.knownTypes || new Map();
        }
    }

    public registerType(classCtorOrTypeDescriptor: ObjectTypeDescriptor): this {
        this._knownTypes.set(classCtorOrTypeDescriptor.name, classCtorOrTypeDescriptor);
        return this;
    }

    public fromObjectLiteral<TResult extends object>(rawResult: object, typeInfo?: TypeInfo): TResult;
    public fromObjectLiteral<TResult extends object>(
        rawResult: object, typeInfo?: TypeInfo, knownTypes?: Map<string, ObjectTypeDescriptor>): TResult;
    public fromObjectLiteral<TResult extends object>(
        rawResult: object, typeInfo?: TypeInfo, knownTypes?: Map<string, ObjectTypeDescriptor>): TResult {
        if (!typeInfo) {
            return rawResult as TResult;
        }

        let result: TResult = rawResult as TResult; 
        const types = (knownTypes || this._knownTypes);
        if (typeInfo.typeName) {
            const ctorOrObjLiteralDescriptor = types.get(typeInfo.typeName);
            if (TypeUtil.isObjectLiteralTypeDescriptor(ctorOrObjLiteralDescriptor)) {
                result = (ctorOrObjLiteralDescriptor as ObjectLiteralDescriptor<TResult>).construct(rawResult);
            } else {
                result = Object.assign(
                    createEmptyObject<TResult>(ctorOrObjLiteralDescriptor as ClassConstructor), rawResult);
            }
        }

        this._applyNestedTypes(result, typeInfo, types);

        return result;
    }

    private _applyNestedTypes<TResult extends object>(
        obj: TResult, typeInfo?: TypeInfo, knownTypes?: Map<string, ObjectTypeDescriptor>) {
        const { nestedTypes } = typeInfo; 
        if (!nestedTypes) {
            return obj;
        }
            
        for (const propertyPath of Object.keys(nestedTypes)) {
            const typeName = nestedTypes[propertyPath];
            const fieldContext = getFieldContext(obj, propertyPath.split("."));
            const fieldContexts = Array.isArray(fieldContext) 
                ? fieldContext 
                : [ fieldContext ];
            fieldContexts.forEach(
                (c, i) => applyTypeToNestedProperty(typeName, c, knownTypes));
        }

        return obj;
    }

    public toObjectLiteral<TFrom extends object>(
        obj: TFrom, typeInfoCallback?: (typeInfo: TypeInfo) => void): object {
        const nestedTypes = TypeUtil.isObject(obj) 
            ? getNestedTypes(obj)  
            : null;
        const typeInfo = {
            typeName: TypeUtil.isClassConstructor(obj.constructor) 
                ? obj.constructor.name
                : this._matchTypeDescriptor(obj).name,
            nestedTypes
        };

        if (typeInfoCallback) {
            typeInfoCallback(typeInfo);
        }

        return Object.assign({}, obj);
    }

    private _matchTypeDescriptor(obj: object) {
        for (const typeDescriptor of this._knownTypes.values()) {
            if (!TypeUtil.isObjectLiteralTypeDescriptor(typeDescriptor)) {
                return;
            }

            if (TypeUtil.isType(obj, typeDescriptor as ObjectLiteralDescriptor)) {
                return typeDescriptor;
            }
        }
    }
}

export interface TypesAwareJsonObjectMapperOptions {
    dateFormat?: string;
    knownTypes?: Map<string, ObjectTypeDescriptor>;
}

interface ObjectPropertyContext {
    parent: any;
    field: string;
}

function getFieldContext(parent: object, objPath: string[])
    : ObjectPropertyContext | ObjectPropertyContext[] {
    // tslint:disable-next-line:prefer-const
    let [field, ...fieldsPathTail] = objPath;

    let isFieldArray = false;
    if (field.endsWith("[]")) {
        field = field.replace(/\[\]$/g, "");
        isFieldArray = true;
    }

    const fieldVal = parent[field];
    if (!parent.hasOwnProperty(field)) {
        return null;
    }

    if (isFieldArray) {
        return (fieldVal as any[])
            .map((x, i) => {
                if (!fieldsPathTail.length) {
                    return {
                        parent: fieldVal,
                        field: i.toString()
                    };
                } else {
                    return getFieldContext(x, fieldsPathTail);
                }
            })
            .reduce((result: ObjectPropertyContext[], next) => {
                if (Array.isArray(next)) {
                    return [ ...result, ...next ];
                } else {
                    return [ ...result, next];
                }
            }, []);
    }

    if (fieldsPathTail.length) {
        return getFieldContext(parent[field], fieldsPathTail);
    }

    return { parent, field };
}

function applyTypeToNestedProperty(
    fieldTypeName: string, fieldContext: ObjectPropertyContext, knownTypes: Map<string, ObjectTypeDescriptor>) {
    let parent;
    let field: string;

    if (fieldContext) {
        ({ parent, field } = fieldContext);
    }

    const fieldVal = parent[field];
    if (typeof fieldVal === "undefined") {
        return;
    }

    if (fieldTypeName === "date") {
        parent[field] = DateUtil.parse(fieldVal);
    } else if (Array.isArray(fieldVal)) {
        for (let i = 0; i < fieldVal.length; i++) {
            applyTypeToNestedProperty(fieldTypeName, {
                parent: fieldVal as object,
                field: i.toString()
            }, knownTypes);
        }
    } else {
        const ctorOrTypeDescriptor = knownTypes.get(fieldTypeName);
        if (!ctorOrTypeDescriptor) {
            throwError("MappingError", `Type '${fieldTypeName}' is unknown for field '${fieldContext.field}'`);
        }

        if (TypeUtil.isClassConstructor(ctorOrTypeDescriptor)) {
            const emptyObj = createEmptyObject(ctorOrTypeDescriptor as ClassConstructor);
            parent[field] = Object.assign(emptyObj, fieldVal);
        } else {
            parent[field] = (ctorOrTypeDescriptor as ObjectLiteralDescriptor).construct(fieldVal);
        }
    }
}

function createEmptyObject<TResult extends object>(ctor: ClassConstructor) {
    // tslint:disable-next-line:new-parens
    return new (Function.prototype.bind.apply(ctor)) as TResult;
}

function getNestedTypes(obj: object, objPathPrefix?: string): NestedTypes {
    if (Array.isArray(obj)) {
        if (obj.length) {
            return getNestedTypes(obj[0], `${objPathPrefix}[]`);
        } else {
            return null;
        }
    }

    if (obj instanceof Date) {
        return { 
            [objPathPrefix]: "date" 
        };
    }

    return Object.keys(obj)
        .reduce((result, key) =>  {
            const fullPath = objPathPrefix ? `${objPathPrefix}.${key}` : key;
            const keyNestedTypes = getNestedTypes(obj, fullPath);
            return Object.assign(result, keyNestedTypes); 
        }, {});
}
