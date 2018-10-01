import {IMetadataDictionary, IRawMetadataDictionary} from "../Documents/Session/IMetadataDictionary";
import {throwError} from "../Exceptions";

export interface MetadataAsDictionaryParentInfo {
    parent: IMetadataDictionary;
    parentKey: string;
}

export interface MetadataAsDictionary extends IMetadataDictionary, MetadataAsDictionaryParentInfo {
}

const metadataDirtiness = new WeakMap<IMetadataDictionary, boolean>();
const metadataParents = new WeakMap<IMetadataDictionary, MetadataAsDictionaryParentInfo>();
const metadataProxyTargets = new WeakMap<object, IMetadataDictionary>();

export interface MetadataParameters {
    raw: IRawMetadataDictionary;
    parentInfo?: MetadataAsDictionaryParentInfo;
}

class MetadataInternal {

    constructor(obj) {
        if (obj) {
            for (const key of Object.keys(obj)) {
                this[key] = this._metadataConvertValue(key, obj[key]);
            }
        }
    }

    public isDirty(): boolean {
        return metadataDirtiness.get(metadataProxyTargets.get(this));
    }

    public getParent() {
        const parentData = metadataParents.get(metadataProxyTargets.get(this));
        return parentData ? parentData.parent : null;
    }

    public getParentKey() {
        const parentData = metadataParents.get(metadataProxyTargets.get(this));
        return parentData ? parentData.parentKey : null;
    }

    private _metadataConvertValue(key, val) {
        if (typeof val !== "object") {
            return val;
        }

        if (Array.isArray(val)) {
            return val.map((e) => this._metadataConvertValue(key, e));
        }

        return createMetadataDictionary({
            raw: val,
            parentInfo: {
                parent: this,
                parentKey: key
            }
        });
    }

    public static getChangeTrackingProxy(instance) {
        const proxy = new Proxy<MetadataAsDictionary>(instance, {
            get(obj, prop, value) {
                return Reflect.get(obj, prop, value);
            },
            set(obj, prop, value) {
                metadataDirtiness.set(obj, true);
                return Reflect.set(obj, prop, value);
            },
            deleteProperty(obj, prop) {
                metadataDirtiness.set(obj, true);
                return Reflect.deleteProperty(obj, prop);
            },
            ownKeys(target) {
                return Reflect.ownKeys(target)
                    .filter(x =>
                        x !== "getParentKey"
                        && x !== "getParent"
                        && x !== "isDirty"
                        && x !== "_metadataConvertValue");
            }
        });

        metadataProxyTargets.set(proxy, instance);
        return proxy;
    }
}

export function createMetadataDictionary(
    metadataParams: MetadataParameters): MetadataAsDictionary {
    const parentInfo = metadataParams.parentInfo;
    const metadata = new MetadataInternal(metadataParams.raw);

    const proxy = MetadataInternal.getChangeTrackingProxy(metadata);

    if (parentInfo) {
        if (!parentInfo.parent) {
            return throwError("InvalidArgumentException", "Parent cannot be null");
        }

        if (!parentInfo.parentKey) {
            return throwError("InvalidArgumentException", "Parent key cannot be null");
        }

        metadataParents.set(metadata, parentInfo);
    }

    metadataDirtiness.set(metadata, false);

    return proxy;
}
