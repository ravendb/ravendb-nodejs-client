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
    private _throwMappingErrors: boolean = false;

    public constructor(opts?: TypesAwareJsonObjectMapperOptions) {
        if (opts) {
            this._dateFormat = opts.dateFormat;
            this._knownTypes = opts.knownTypes || new Map();
        }
    }

    public get isThrowMappingErrors(): boolean {
        return this._throwMappingErrors;
    }

    public set setThrowMappingErrors(value: boolean) {
        this._throwMappingErrors = value;
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
        
        let result: TResult = Object.assign({}, rawResult as TResult);
        if (!typeInfo) {
            return rawResult as TResult;
        }

        const types = (knownTypes || this._knownTypes);
        if (typeInfo.typeName) {
            const ctorOrObjLiteralDescriptor = types.get(typeInfo.typeName);
            if (TypeUtil.isObjectLiteralTypeDescriptor(ctorOrObjLiteralDescriptor)) {
                result = (ctorOrObjLiteralDescriptor as ObjectLiteralDescriptor<TResult>).construct(rawResult);
            } else {
                result = Object.assign(
                    this._createEmptyObject<TResult>(ctorOrObjLiteralDescriptor as ClassConstructor), rawResult);
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
            const objPathSegments = propertyPath
                .replace(/\[/g, "![").split(/[!.]/g);
            const fieldContext = this._getFieldContext(obj, objPathSegments);
            const fieldContexts = Array.isArray(fieldContext)
                ? fieldContext
                : [fieldContext];
            fieldContexts.forEach(
                (c, i) => this._applyTypeToNestedProperty(typeName, c, knownTypes));
        }

        return obj;
    }

    public toObjectLiteral<TFrom extends object>(obj: TFrom): object;
    public toObjectLiteral<TFrom extends object>(
        obj: TFrom,
        typeInfoCallback?: (typeInfo: TypeInfo) => void): object;
    public toObjectLiteral<TFrom extends object>(
        obj: TFrom,
        typeInfoCallback?: (typeInfo: TypeInfo) => void,
        knownTypes?: Map<string, ObjectTypeDescriptor>): object;
    public toObjectLiteral<TFrom extends object>(
        obj: TFrom,
        typeInfoCallback?: (typeInfo: TypeInfo) => void,
        knownTypes?: Map<string, ObjectTypeDescriptor>): object {

        const types = (knownTypes || this._knownTypes);

        let nestedTypes: NestedTypes;
        const result = this._makeObjectLiteral(obj, null, (nestedType) => {
            nestedTypes = Object.assign(nestedTypes || {}, nestedType);
        }, Array.from(types.values()));

        let typeName;
        if (TypeUtil.isClassConstructor(obj.constructor)) {
            typeName = obj.constructor.name;
        } else {
            const typeDescriptor = TypeUtil.findType(obj, Array.from(types.values()));
            typeName = typeDescriptor ? typeDescriptor.name : null;
        }

        const typeInfo: TypeInfo = {};
        if (typeName) {
            typeInfo.typeName = typeName;
        }

        if (nestedTypes) {
            typeInfo.nestedTypes = nestedTypes;
        }

        if (typeInfoCallback) {
            typeInfoCallback(typeInfo);
        }

        return result;
    }

    private _getFieldContext(parent: object, objPath: string[])
        : ObjectPropertyContext | ObjectPropertyContext[] {
        // tslint:disable-next-line:prefer-const
        let [field, ...fieldsPathTail] = objPath;

            // HANDLE Set and Map here

        let isFieldArray = false;
        if (field.endsWith("[]")) {
            field = field.replace(/\[\]$/g, "");
            isFieldArray = true;
        }

        let fieldVal = parent[field];
        if (!parent.hasOwnProperty(field)) {
            if (isFieldArray) {
                fieldVal = parent;
            } else {
                return null;
            }

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
                        return this._getFieldContext(x, fieldsPathTail);
                    }
                })
                .reduce((result: ObjectPropertyContext[], next) => {
                    if (Array.isArray(next)) {
                        return [...result, ...next];
                    } else {
                        return [...result, next];
                    }
                }, []);
        }

        if (fieldsPathTail.length) {
            return this._getFieldContext(parent[field], fieldsPathTail);
        }

        return { parent, field };
    }

    private _applyTypeToNestedProperty(
        fieldTypeName: string, fieldContext: ObjectPropertyContext, knownTypes: Map<string, ObjectTypeDescriptor>) {
        let parent: object;
        let field: string;

        if (fieldContext) {
            ({ parent, field } = fieldContext);
        }

        if (typeof parent === "undefined") {
            return;
        }

        const fieldVal = parent[field];
        if (typeof fieldVal === "undefined") {
            return;
        }

        if (fieldTypeName === "date") {
            parent[field] = DateUtil.parse(fieldVal);
        } else if (fieldTypeName === "Set") { 
            parent[field] = new Set(fieldVal);
        } else if (fieldTypeName === "Map") {
            const parentMap = parent[field] = new Map(Object.keys(fieldVal)
                .reduce((result, next) => {
                    const nextVal = fieldVal[next];
                    return [ ...result, [ next, nextVal ]]
                }, []));
        } else if (Array.isArray(fieldVal)) {
            for (let i = 0; i < fieldVal.length; i++) {
                this._applyTypeToNestedProperty(fieldTypeName, {
                    parent: fieldVal as object,
                    field: i.toString()
                }, knownTypes);
            }
        } else {
            const ctorOrTypeDescriptor = knownTypes.get(fieldTypeName);
            if (!ctorOrTypeDescriptor) {
                if (this._throwMappingErrors) {
                    throwError("MappingError", `Type '${fieldTypeName}' is unknown for field '${fieldContext.field}'`);
                } else {
                    parent[field] = Object.assign({}, fieldVal);
                    return;
                }
            }

            if (TypeUtil.isClassConstructor(ctorOrTypeDescriptor)) {
                const emptyObj = this._createEmptyObject(ctorOrTypeDescriptor as ClassConstructor);
                parent[field] = Object.assign(emptyObj, fieldVal);
            } else {
                parent[field] = (ctorOrTypeDescriptor as ObjectLiteralDescriptor).construct(fieldVal);
            }
        }
    }

    private _createEmptyObject<TResult extends object>(ctor: ClassConstructor) {
        // tslint:disable-next-line:new-parens
        return new (Function.prototype.bind.apply(ctor)) as TResult;
    }

    private _makeObjectLiteral(
        obj: object,
        objPathPrefix: string,
        typeInfoCallback: (types: NestedTypes) => void,
        knownTypes: ObjectTypeDescriptor[]): any {

        if (TypeUtil.isDate(obj)) {
            typeInfoCallback({
                [objPathPrefix]: "date"
            });

            return DateUtil.stringify(obj as Date);
        }

        if (TypeUtil.isSet(obj)) {
            typeInfoCallback({
                [objPathPrefix]: "Set"
            });
            const newObjPathPrefix = `${objPathPrefix}$Set`;
            return Array.from((obj as Set<any>))
                .map(x => this._makeObjectLiteral(x, newObjPathPrefix, typeInfoCallback, knownTypes));
        }

        if (TypeUtil.isMap(obj)) {
            typeInfoCallback({
                [objPathPrefix]: "Map"
            });
            const newObjPathPrefix = `${objPathPrefix}$Map`;
            const map = obj as Map<string, any>;
            return Array.from(map.keys()).reduce((result, next) => {
                return Object.assign(result, { 
                    [next]: this._makeObjectLiteral(map.get(next), newObjPathPrefix, typeInfoCallback, knownTypes) 
                });
            }, {});
        }

        if (Array.isArray(obj)) {
            const newObjPathPrefix = `${objPathPrefix}[]`;
            return obj.map(x => this._makeObjectLiteral(x, newObjPathPrefix, typeInfoCallback, knownTypes));
        }

        if (TypeUtil.isObject(obj)) {
            if (objPathPrefix) { // if it's non-root object
                const matchedType = TypeUtil.findType(obj, knownTypes);
                if (matchedType
                    && matchedType.name !== "Function") {
                    typeInfoCallback({ [objPathPrefix]: matchedType.name });
                }
            }

            return Object.keys(obj)
                .reduce((result, key) => {
                    const fullPath = objPathPrefix ? `${objPathPrefix}.${key}` : key;
                    result[key] = this._makeObjectLiteral(obj[key], fullPath, typeInfoCallback, knownTypes);
                    return result;
                }, {});
        }

        return obj;
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
