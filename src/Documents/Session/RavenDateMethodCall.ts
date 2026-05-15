import { MethodCall } from "./MethodCall.js";

export type DateMethodType = "Now" | "Today";

/**
 * A MethodCall that represents a server-side date/time function (now() or today()).
 * Pass instances returned by RavenQuery.now() / RavenQuery.today() to DocumentQuery
 * where* methods to generate server-side RQL date expressions.
 */
export class RavenDateMethodCall extends MethodCall {
    public readonly dateMethodType: DateMethodType;

    private constructor(type: DateMethodType, args: string[]) {
        super();
        this.dateMethodType = type;
        this.args = args;
        this.accessPath = null;
    }

    public static now(offset?: string): RavenDateMethodCall {
        return new RavenDateMethodCall("Now", offset ? [offset] : []);
    }

    public static today(): RavenDateMethodCall {
        return new RavenDateMethodCall("Today", []);
    }
}
