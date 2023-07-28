import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../src";
import { disposeTestDocumentStore, testContext, } from "../Utils/TestUtil";
import { assertThat, assertThrows } from "../Utils/AssertExtensions";
import { Employee } from "../Assets/Entities";

describe("RDBC-714", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
    });

    it("can use projection behavior", async () => {
        await store.executeIndex(new Employee_ByFullName());

        const session = store.openSession();
        await session.store(Object.assign(new Employee(), { firstName: "Robert", lastName: "King" }));
        await session.saveChanges();

        await testContext.waitForIndexing(store);

        const query = session.query(Employee, Employee_ByFullName)
            .selectFields(["fullName"], EmployeeProjectedDetails, "FromDocumentOrThrow")

        await assertThrows(async () => await query.all(),
            err => {
                assertThat(err.name)
                    .isEqualTo("InvalidQueryException");
            });
    });
})

class Employee_ByFullName extends AbstractJavaScriptIndexCreationTask<Employee> {
    public constructor() {
        super();

        this.map(Employee, e => {
            return {
                fullName: e.firstName + " " + e.lastName
            }
        })

        this.store("fullName", "Yes");
    }
}

class EmployeeProjectedDetails {
    private fullName: null;
    constructor() {
        this.fullName = null;
    }
}
