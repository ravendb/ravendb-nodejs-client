import { ObjectTypeDescriptor, ClassConstructor, ObjectLiteralDescriptor } from "../Types";
import { DateUtil } from "../Utility/DateUtil";
import { throwError } from "../Exceptions";
import { TypeUtil } from "../Utility/TypeUtil";
import * as changeCase from "change-object-case";
import { getLogger } from "../Utility/LogUtil";
import { EntityConstructor } from "../Documents/DocumentAbstractions";

const log = getLogger({ module: "ObjectMapper" });

export interface TypeInfo {
    typeName?: string;
    nestedTypes?: NestedTypes;
}

export interface NestedTypes { 
    [propertyPath: string]: string;
}

export interface ITypesAwareObjectMapper {
    fromObjectLiteral<TResult extends Object>(raw: object, typeInfo?: TypeInfo): TResult;
    toObjectLiteral<TFrom extends Object>(obj: TFrom, typeInfo?: (typeInfo: TypeInfo) => void): object;
}

export class ObjectKeysTransform {
    public static camelCase(obj: object, recursive: boolean = false) {
        return changeCase.camelKeys(obj, { recursive });
    }
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

    public fromObjectLiteral<TResult extends Object>(rawResult: object, typeInfo?: TypeInfo): TResult;
    public fromObjectLiteral<TResult extends Object>(
        rawResult: object, typeInfo?: TypeInfo, knownTypes?: Map<string, ObjectTypeDescriptor>): TResult;
    public fromObjectLiteral<TResult extends Object>(
        rawResult: object, typeInfo?: TypeInfo, knownTypes?: Map<string, ObjectTypeDescriptor>): TResult {
        
        const typeName = typeInfo ? typeInfo.typeName : null;
        const nestedTypes = typeInfo ? typeInfo.nestedTypes : null;
        const types = (knownTypes || this._knownTypes);
        const ctorOrTypeDescriptor = this._getKnownType(typeName, knownTypes);
        const result = this._instantiateObject<TResult>(typeName, rawResult, ctorOrTypeDescriptor);

        this._applyNestedTypes(result, nestedTypes, types);

        return result;
    }

    private _applyNestedTypes<TResult extends Object>(
        obj: TResult, nestedTypes?: NestedTypes, knownTypes?: Map<string, ObjectTypeDescriptor>) {
        if (!nestedTypes) {
            return obj;
        }

        const nestedTypesKeys = Object.keys(nestedTypes);
        nestedTypesKeys.sort();
        for (const propertyPath of nestedTypesKeys) {
            const typeName = nestedTypes[propertyPath];
            const objPathSegments = propertyPath
                .replace(/\[/g, "![")
                .replace(/\$MAP/g, "!$MAP")
                .replace(/\$SET/g, "!$SET")
                .split(/[!.]/g);
            const fieldContext = this._getFieldContext(obj, objPathSegments);
            const fieldContexts = Array.isArray(fieldContext) ? fieldContext : [fieldContext];
            fieldContexts.forEach(
                (c, i) => this._applyTypeToNestedProperty(typeName, c, knownTypes));
        }

        return obj;
    }

    public toObjectLiteral<TFrom extends Object>(obj: TFrom): object;
    public toObjectLiteral<TFrom extends Object>(
        obj: TFrom,
        typeInfoCallback?: (typeInfo: TypeInfo) => void): object;
    public toObjectLiteral<TFrom extends Object>(
        obj: TFrom,
        typeInfoCallback?: (typeInfo: TypeInfo) => void,
        knownTypes?: Map<string, ObjectTypeDescriptor>): object;
    public toObjectLiteral<TFrom extends Object>(
        obj: TFrom,
        typeInfoCallback?: (typeInfo: TypeInfo) => void,
        knownTypes?: Map<string, ObjectTypeDescriptor>): object {

        const types = (knownTypes || this._knownTypes);

        let nestedTypes: NestedTypes;
        const result = this._makeObjectLiteral(obj, null, (nestedType) => {
            nestedTypes = Object.assign(nestedTypes || {}, nestedType);
        }, Array.from(types.values()));

        let typeName;
        if (TypeUtil.isClass(obj)) {
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

        const isFieldArray = field.endsWith("[]");
        if (isFieldArray) {
            field = field .replace(/\[\]$/g, "");
        }

        const isFieldSet = field.endsWith("$SET");
        if (isFieldSet) {
            field = field.replace(/\$SET$/g, "");
        }

        const isFieldMap = field.endsWith("$MAP");
        if (isFieldMap) {
            field = field.replace(/\$MAP$/g, "");
        }

        let fieldVal = parent[field];
        if (!parent.hasOwnProperty(field)) {
            if (isFieldArray || isFieldSet || isFieldMap) {
                fieldVal = parent;
            } else {
                return null;
            }
        }

        if (isFieldArray) {
            return this._getFieldContextsForArrayElements(fieldVal, fieldsPathTail);
        }

        if (isFieldSet) {
            return this._getFieldContextsForSetElements(fieldVal as Set<any>, fieldsPathTail);
        }

        if (isFieldMap) {
            return this._getFieldContextsForMapEntries(fieldVal as Map<string, any>, fieldsPathTail);
        }

        if (fieldsPathTail.length) {
            return this._getFieldContext(parent[field], fieldsPathTail);
        }

        return { 
            parent, 
            field,
            getValue() { return parent[field]; },
            setValue(val) { parent[field] = val; }
        };
    }

    private _getFieldContextsForMapEntries(mapFieldVal: Map<string, any>, fieldsPathTail: string[]) {
        const result = Array.from(mapFieldVal.entries()).map(([ key, val ]) => {
            if (!fieldsPathTail.length) {
                return {
                    parent: mapFieldVal,
                    field: key,
                    getValue: () => val,
                    setValue: (newVal) => {
                        mapFieldVal.set(key, newVal);
                    }
                };
            } else {
                return this._getFieldContext(val, fieldsPathTail);
            }
        });
        
        return this._flattenFieldContexts(result);
    }

    private _getFieldContextsForSetElements(setFieldVal: Set<any>, fieldsPathTail: string[]) {
        const result = Array.from(setFieldVal).map(x => {
            if (!fieldsPathTail.length) {
                return {
                    parent: setFieldVal,
                    field: x,
                    getValue: () => x,
                    setValue: (val) => {
                        setFieldVal.delete(x);
                        setFieldVal.add(val);
                    }
                };
            } else {
                return this._getFieldContext(x, fieldsPathTail);
            }
        });
        
        return this._flattenFieldContexts(result);
    }

    private _getFieldContextsForArrayElements(fieldVal, fieldsPathTail) {
        const result = (fieldVal as any[]).map((x, i) => {
            if (!fieldsPathTail.length) {
                return {
                    parent: fieldVal,
                    field: i.toString(),
                    getValue() { return fieldVal[i]; },
                    setValue(val) { fieldVal[i] = val; }
                };
            } else {
                return this._getFieldContext(x, fieldsPathTail);
            }
        });

        return this._flattenFieldContexts(result);
    }

    private _flattenFieldContexts(
        arr: Array<ObjectPropertyContext[] | ObjectPropertyContext>): ObjectPropertyContext[] {
            return arr.reduce((result: any, next) => {
                if (Array.isArray(next)) {
                    return result.concat(next as ObjectPropertyContext[]);
                }

                result.push(next as ObjectPropertyContext);
                return result;
            }, [] as ObjectPropertyContext[]);
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

        const fieldVal = fieldContext.getValue();
        if (typeof fieldVal === "undefined") {
            return;
        }

        if (fieldTypeName === "date") {
            fieldContext.setValue(DateUtil.parse(fieldVal));
            return;
        } 

        if (fieldTypeName === "Set") {
            fieldContext.setValue(new Set(fieldVal));
            return;
        }

        if (fieldTypeName === "Map") {
            const mapEntries = Object.keys(fieldVal)
                .reduce((result, next) => {
                    return [ ...result, [ next, fieldVal[next] ]];
                }, []);
            fieldContext.setValue(new Map(mapEntries));
            return;
        }
        
        if (Array.isArray(fieldVal)) {
            fieldVal.forEach((item, i) => {
                this._applyTypeToNestedProperty(fieldTypeName, {
                    field: i.toString(),
                    parent: fieldVal,
                    getValue: () => fieldVal[i],
                    setValue: (val) => fieldVal[i] = val
                }, knownTypes);
            });

            return;
        }

        const ctorOrTypeDescriptor = this._getKnownType(fieldTypeName, knownTypes);
        const instance = this._instantiateObject(fieldTypeName, fieldVal, ctorOrTypeDescriptor);
        fieldContext.setValue(instance);
    }

    private _instantiateObject<TResult>(
        typeName: string, rawValue: object, ctorOrTypeDescriptor: ObjectTypeDescriptor): TResult {
        let instance = null;
        if (!ctorOrTypeDescriptor) {
            instance = Object.assign({}, rawValue);
        } else if (TypeUtil.isClass(ctorOrTypeDescriptor)) {
            instance = this._createEmptyObject(ctorOrTypeDescriptor as ClassConstructor);
            instance = Object.assign(instance, rawValue);
        } else if (TypeUtil.isObjectLiteralTypeDescriptor(ctorOrTypeDescriptor)) {
            instance = (ctorOrTypeDescriptor as ObjectLiteralDescriptor).construct(rawValue);
        } else {
            throwError("InvalidArgumentException", 
                `Invalid type descriptor for type ${typeName}: ${ctorOrTypeDescriptor}`);
        }

        return instance as TResult;
    }

    private _getKnownType(typeName: string, knownTypes: Map<string, ObjectTypeDescriptor>): ObjectTypeDescriptor {
        if (!typeName) {
            return null;
        }

        const ctorOrTypeDescriptor = knownTypes.get(typeName);
        if (!ctorOrTypeDescriptor) {
            if (this._throwMappingErrors) {
                throwError("MappingError", `Could not find type descriptor '${typeName}'.`);
            } else {
                log.warn(`Could not find type descriptor '${typeName}'.`);
            }
        }

        return ctorOrTypeDescriptor;
    }

    private _createEmptyObject<TResult extends Object>(ctor: EntityConstructor<TResult>) {
        if (!ctor) {
            throwError("InvalidArgumentException", "ctor argument must not be null or undefined.");
        }

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
            const newObjPathPrefix = `${objPathPrefix}$SET`;
            return Array.from((obj as Set<any>))
                .map(x => this._makeObjectLiteral(x, newObjPathPrefix, typeInfoCallback, knownTypes));
        }

        if (TypeUtil.isMap(obj)) {
            typeInfoCallback({
                [objPathPrefix]: "Map"
            });
            const newObjPathPrefix = `${objPathPrefix}$MAP`;
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
    getValue();
    setValue(val: any);
}
