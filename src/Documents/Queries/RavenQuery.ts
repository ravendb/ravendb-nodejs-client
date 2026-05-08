import { RavenDateMethodCall } from "../Session/RavenDateMethodCall.js";

export class RavenQuery {
    /**
     * Returns a MethodCall representing the server-side `now()` RQL function.
     * The server evaluates the current UTC timestamp at query execution time,
     * avoiding clock skew between client and server.
     *
     * @param offset Optional duration string (e.g. "+1y6mo", "-2hours") — see RavenDB docs.
     *
     * @example
     * session.query(Order).whereGreaterThan("createdAt", RavenQuery.now())
     * session.query(Order).whereLessThan("expiresAt", RavenQuery.now("+30d"))
     */
    public static now(offset?: string): RavenDateMethodCall {
        return RavenDateMethodCall.now(offset);
    }

    /**
     * Returns a MethodCall representing the server-side `today()` RQL function.
     * Returns midnight of the current UTC day on the server.
     *
     * @example
     * session.query(Order).whereGreaterThanOrEqual("date", RavenQuery.today())
     */
    public static today(): RavenDateMethodCall {
        return RavenDateMethodCall.today();
    }
}
