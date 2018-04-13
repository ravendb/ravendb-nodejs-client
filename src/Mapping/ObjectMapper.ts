import { ObjectTypeDescriptor, ClassConstructor, ObjectLiteralDescriptor } from "../Types";
import { DateUtil } from "../Utility/DateUtil";
import { throwError } from "../Exceptions";
import { TypeUtil } from "../Utility/TypeUtil";

export interface TypeInfo {
    typeName?: string;
    nestedTypes?: NestedTypes;
}

export type NestedTypes = Array<[string, string]>;

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

    public fromObjectLiteral<TResult extends object>(rawResult: object, typeInfo?: TypeInfo): TResult {
        if (!typeInfo) {
            return;
        }

        let result: TResult = rawResult as TResult; 
        if (typeInfo.typeName) {
            const ctorOrObjLiteralDescriptor = this._knownTypes.get(typeInfo.typeName);
            if (TypeUtil.isObjectLiteralTypeDescriptor(ctorOrObjLiteralDescriptor)) {
                return (ctorOrObjLiteralDescriptor as ObjectLiteralDescriptor<TResult>).construct(rawResult);
            } else {
                result = Object.assign(
                    createEmptyObject<TResult>(ctorOrObjLiteralDescriptor as ClassConstructor), rawResult);
            }
        }

        const { nestedTypes } = typeInfo; 
        if (!nestedTypes) {
            return result;
        }

        for (const nestedTypeInfo of nestedTypes) {
            const [ objPath, typeName ] = nestedTypeInfo;
            const fieldContext = getFieldContext(rawResult, objPath.split("."));
            if (Array.isArray(fieldContext)) {
                (fieldContext as ObjectPropertyContext[])
                    .forEach(c => applyTypeToNestedProperty(typeName, c, this._knownTypes));
            } else {
                applyTypeToNestedProperty(
                    typeName, fieldContext as ObjectPropertyContext, this._knownTypes);
            }
        }

        return result;
    }

    public toObjectLiteral<TFrom extends object>(obj: TFrom, typeInfoCallback?: (typeInfo: TypeInfo) => void): object {
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
    let [field, ...fieldsTail] = objPath;
    if (!fieldsTail && !fieldsTail.length) {
        return { parent, field };
    }

    let isFieldArray = false;
    if (field.endsWith("[]")) {
        field = field.replace(/\[\]$/g, "");
        isFieldArray = true;
    }

    const fieldVal = parent[field];
    if (!fieldVal) {
        return null;
    }

    if (isFieldArray) {
        return fieldVal.map(x => getFieldContext(x, fieldsTail))
            .reduce((result, next) => {
                if (Array.isArray(next)) {
                    return [ ...result, ...next ]
                } else {
                    result.push(next);
                    return result;
                }
            });
    }

    return getFieldContext(parent, fieldsTail);
}

function applyTypeToNestedProperty(
    fieldTypeName: string, fieldContext: ObjectPropertyContext, knownTypes: Map<string, ObjectTypeDescriptor>) {
    const { parent, field } = fieldContext;
    const fieldVal = parent[field];
    if (!fieldVal) {
        return;
    }

    if (fieldTypeName === "date") {
        parent[field] = DateUtil.parse(fieldVal);
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
        return [[ objPathPrefix, "date" ]];
    }

    return Object.keys(obj)
        .reduce((result, key) =>  {
            const fullPath = objPathPrefix ? `${objPathPrefix}.${key}` : key;
            const keyNestedTypes = getNestedTypes(obj, fullPath);
            return [ 
                ...result,
                ...keyNestedTypes 
            ];
        }, []);
}
