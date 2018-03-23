
import { VError } from "verror";

export function createServerError(message: string, cause?: Error, isReachedLeader?: boolean) {
    
}

export class RavenException extends Error {

    reachedLeader: boolean;

    public constructor(message: string) {
    }

    public RavenException(String message) {
        super(message);
    }

    public RavenException(String message, Throwable cause) {
        super(message, cause);
    }

    public boolean isReachedLeader() {
        return reachedLeader;
    }

    public void setReachedLeader(boolean reachedLeader) {
        this.reachedLeader = reachedLeader;
    }

    public static RavenException generic(String error, String json) {
        return new RavenException(error + ". Response: " + json);
    }
}
