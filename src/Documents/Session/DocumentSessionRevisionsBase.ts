import {ForceRevisionStrategy} from "./ForceRevisionStrategy";
import {throwError} from "../../Exceptions";
import {TypeUtil} from "../../Utility/TypeUtil";
import {StringUtil} from "../../Utility/StringUtil";
import {AdvancedSessionExtensionBase} from "./AdvancedSessionExtensionBase";

export class DocumentSessionRevisionsBase extends AdvancedSessionExtensionBase {
    forceRevisionCreationFor<T extends object>(entity: T)
    forceRevisionCreationFor<T extends object>(entity: T, strategy: ForceRevisionStrategy)
    forceRevisionCreationFor<T extends object>(id: string)
    forceRevisionCreationFor<T extends object>(id: string, strategy: ForceRevisionStrategy)
    forceRevisionCreationFor<T extends object>(entityOrId: T | string, strategy: ForceRevisionStrategy = "Before") {
        if (!entityOrId) {
            throwError("InvalidArgumentException", "Entity cannot be null");
        }

        if (TypeUtil.isString(entityOrId)) {
            this._addIdToList(entityOrId, strategy);
        } else {
            const documentInfo = this._session.documentsByEntity.get(entityOrId);
            if (!documentInfo) {
                throwError("InvalidOperationException", "Cannot create a revision for the requested entity because it is Not tracked by the session");
            }

            this._addIdToList(documentInfo.id, strategy);
        }
    }

    private _addIdToList(id: string, requestedStrategy: ForceRevisionStrategy) {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Id cannot be null or empty");
        }

        const existingStrategy = this._session.idsForCreatingForcedRevisions.get(id);
        const idAlreadyAdded = !!existingStrategy;
        if (idAlreadyAdded && existingStrategy !== requestedStrategy) {
            throwError("InvalidOperationException", "A request for creating a revision was already made for document "
                + id + " in the current session but with a different force strategy. New strategy requested: " + requestedStrategy
                + ". Previous strategy: " + existingStrategy + ".");
        }

        if (!idAlreadyAdded) {
            this._session.idsForCreatingForcedRevisions.set(id, requestedStrategy);
        }
    }
}