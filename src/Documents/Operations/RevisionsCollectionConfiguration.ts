import { SetupDocumentBase } from "../SetupDocumentBase";
import { ObjectUtil } from "../../Utility/ObjectUtil";

export class RevisionsCollectionConfiguration extends SetupDocumentBase {

    public minimumRevisionsToKeep: number;
    public minimumRevisionAgeToKeep: string;
    public disabled: boolean;
    public purgeOnDelete: boolean;

    public toRemoteFieldNames() {
        return ObjectUtil.transformObjectKeys(this, { defaultTransform: "pascal" });
    }
}
