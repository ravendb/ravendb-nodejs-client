import { DocumentConventions } from "./Conventions/DocumentConventions";
import { TypeUtil } from "../Utility/TypeUtil";
import { EntityConstructor } from "./DocumentAbstractions";

export class DocumentTypeHelper {

    public static getType(entity: object, conventions: DocumentConventions) {
        return TypeUtil.isClassConstructor(entity.constructor)
            ? entity.constructor as EntityConstructor
            : conventions.registeredTypeDescriptors.find(x => TypeUtil.isType(entity, x));
    }

    public static get emptyChangeVector(): string {
        return null;
    }

    public static get emptyCollection(): string {
        return "@empty";
    }

    public static get systemMetaKeys(): string[] {
        return [
            "@collection", 
            "Raven-Node-Type", 
            "@nested_object_types"
        ];
    }

}
