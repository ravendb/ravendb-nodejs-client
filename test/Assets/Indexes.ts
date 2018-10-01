import { AbstractIndexCreationTask } from "../../src";

export class UsersIndex extends AbstractIndexCreationTask {
    public constructor() {
        super();
        this.map = "from user in docs.users select new { user.name }";
    }
}

export class UsersInvalidIndex extends AbstractIndexCreationTask {
    public constructor() {
        super();
        this.map = "from u in docs.Users select new { a = 5 / u.Age }";
    }
}

export class UsersIndexWithPascalCasedFields extends AbstractIndexCreationTask {
    public constructor() {
        super();
        this.map = "from user in docs.users select new { user.Name }";
        this.index("Name", "Search");
        this.store("Name", "Yes");
    }
}
