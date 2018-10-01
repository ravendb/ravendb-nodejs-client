export class ClusterTopology {

    public lastNodeId: string;
    public topologyId: string;

    public members: { [key: string]: string };
    public promotables: { [key: string]: string };
    public watchers: { [key: string]: string };

    public contains(node: string) {
        if (this.members && this.members[node]) {
            return true;
        }
        if (this.promotables && this.promotables[node]) {
            return true;
        }

        return this.watchers && this.watchers[node];
    }

    public getUrlFromTag(tag: string): string {
        if (!tag) {
            return null;
        }

        if (this.members && this.members[tag]) {
            return this.members[tag];
        }

        if (this.promotables && this.promotables[tag]) {
            return this.promotables[tag];
        }

        if (this.watchers && this.watchers[tag]) {
            return this.watchers[tag];
        }

        return null;
    }

    public getAllNodes(): { [tag: string]: string } {
        return Object.assign({}, this.members, this.promotables, this.watchers);
    }
}
