import assert from "node:assert";
import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore,
    PatchCommandData,
    PatchOperation,
    PatchRequest
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("AvoidRaceConditionWhenWeLoadTheDataNotPatched", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("get returns filtered results", async () => {
        const users = [1, 2, 3].map(i => Object.assign(new UserProfile(), { id: "users/" + i }));
        const innovations = [1, 2, 3, 4, 5].map(i => Object.assign(new InnovationProfile(), { id: "innovations/" + i }));

        await new UserProfileIndex().execute(store);

        {
            const session = store.openSession();
            for (const innovation of innovations) {
                await session.store(innovation);
            }
            for (const user of users) {
                await session.store(user);
            }
            await session.saveChanges();
        }

        const patches = users.flatMap(user => innovations.flatMap(innovation => establish(innovation, user)));
        await commit(patches);

        const session = store.openSession();
        session.advanced.waitForIndexesAfterSaveChanges();
        const user = await session.load("users/1", UserProfile);

        assert.ok(user.relations.length > 0, "User has no relations");
    });

    function establish(edge1Profile: InnovationProfile, edgeNProfile: UserProfile): PatchCommandData[] {
        const edge1 = relation("HasCaseManager", edgeNProfile);
        const edgeN = relation("CaseManagerOf", edge1Profile);

        return [
            new PatchCommandData(edge1Profile.id, null, Object.assign(
                PatchRequest.forScript("addRelation(args.relationClrType, args.relation);"), {
                    values: {
                        relation: edge1,
                        relationClrType: edge1.type,
                        otherSideRelationType: edgeN.type,
                        otherSideRelationSubType: edgeN.subType
                    }
                }), null),
            new PatchCommandData(edgeNProfile.id, null, Object.assign(
                PatchRequest.forScript("addRelation(args.relationClrType, args.relation);"), {
                    values: {
                        relation: edgeN,
                        relationClrType: edgeN.type
                    }
                }), null)
        ];
    }

    async function commit(patches: PatchCommandData[]) {
        const byId = new Map<string, PatchCommandData[]>();
        for (const patch of patches) {
            byId.set(patch.id, [...(byId.get(patch.id) ?? []), patch]);
        }

        const mergedPatchOperations = [...byId.entries()].map(([docKey, group]) => {
            group.forEach((cmd, index) => {
                const originalValues = cmd.patch.values;
                cmd.patch.values = {};
                for (const [key, value] of Object.entries(originalValues)) {
                    const newKey = key + index;
                    cmd.patch.values[newKey] = value;
                    cmd.patch.script = cmd.patch.script.replace(new RegExp("\\b" + key + "\\b", "g"), newKey);
                }
            });

            const scriptedPatchRequest = Object.assign(PatchRequest.forScript(
                "var _this = this;" +
                "function addRelation(clrType, relation, thisArg) {" +
                "    relation['$type'] = clrType; " +
                "   (thisArg || _this).relations.push(relation);" +
                "}" +
                group.map(cmd => cmd.patch.script).join("\n\n")), {
                values: Object.assign({}, ...group.map(cmd => cmd.patch.values))
            });

            return new PatchOperation(docKey, null, scriptedPatchRequest);
        });

        for (const operation of mergedPatchOperations) {
            const result = await store.operations.send(operation);
            if (result.status !== "Patched") {
                throw new Error("Some patches failed");
            }
        }
    }
});

function relation(type: string, to: Profile, subType: string = null): Relation {
    return Object.assign(new Relation(), { type, subType, to });
}

class Relation {
    public type: string;
    public subType: string;
    public to: Profile;
}

class Profile {
    public id: string;
    public name: string;
    public relations: Relation[] = [];
}

class InnovationProfile extends Profile {
}

class UserProfile extends Profile {
}

class UserProfileIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from doc in docs.UserProfiles select new { " +
            "Id = Id(doc), " +
            "Status = LoadDocument(Id(doc) + \"/credentials\", \"Credentials\").status, " +
            "ManagedItems = from r in doc.relations where r.type == \"CaseManagerOf\" " +
            "let profile = LoadDocument(r.to.id, \"InnovationProfiles\") select r.to.id }";
    }
}
