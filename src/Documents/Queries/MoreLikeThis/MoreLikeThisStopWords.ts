import { SetupDocumentBase } from "../../SetupDocumentBase";
import { ObjectUtil } from "../../../Utility/ObjectUtil";

export class MoreLikeThisStopWords extends SetupDocumentBase {
    public id: string;
    public stopWords: string[];

    public toRemoteFieldNames() {
        return ObjectUtil.transformObjectKeys(this, { defaultTransform: "pascal" });
    }
}
