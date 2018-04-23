import { AbstractIndexCreationTask } from "../../src";

export class UsersIndex extends AbstractIndexCreationTask {
    public constructor() {
        super();
        this.map = "from user in docs.users select new { user.name }";
    }
}
