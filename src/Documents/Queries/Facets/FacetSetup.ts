import {Facet} from "./Facet";
import {RangeFacet} from "./RangeFacet";
import {SetupDocumentBase} from "../../SetupDocumentBase";
import {ObjectUtil} from "../../../Utility/ObjectUtil";

export class FacetSetup extends SetupDocumentBase {
    public id: string;
    public facets: Facet[] = [];
    public rangeFacets: RangeFacet[] = [];

    public toRemoteFieldNames() {
        return ObjectUtil.transformObjectKeys(this, {
            defaultTransform: "pascal"
        });
    }
}
