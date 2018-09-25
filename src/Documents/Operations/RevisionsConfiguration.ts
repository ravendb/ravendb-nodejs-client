import {SetupDocumentBase} from "../SetupDocumentBase";
import {RevisionsCollectionConfiguration} from "./RevisionsCollectionConfiguration";
import {ObjectUtil} from "../../Utility/ObjectUtil";

export class RevisionsConfiguration extends SetupDocumentBase {
    public defaultConfig: RevisionsCollectionConfiguration;
    public collections: Map<string, RevisionsCollectionConfiguration>;

    public toRemoteFieldNames() {
        return {
            Default: this.defaultConfig ? this.defaultConfig.toRemoteFieldNames() : undefined,
            Collections: this.collections
                ? ObjectUtil.mapToLiteral(this.collections, (key, value) => value.toRemoteFieldNames())
                : undefined
        };
    }
}
