import { throwError } from "../Exceptions";

export abstract class RavenServerLocator {

    public static ENV_SERVER_PATH = "RAVENDB_TEST_SERVER_PATH";

    public getServerPath(): string {
        const serverPath = process.env[RavenServerLocator.ENV_SERVER_PATH];
        if (!serverPath) {
            throwError("InvalidOperationException", 
                "Unable to find RavenDB server path. Please make sure " 
                    + RavenServerLocator.ENV_SERVER_PATH 
                    + " environment variable is set and is valid " +
                    "(current value = " + serverPath + ")");
        }

        return serverPath;
    }

    public withHttps(): boolean {
        return false;
    }

    public getCommand(): string {
        return this.getServerPath();
    }

    public getCommandArguments() {
        return [];
    }

    public getServerCertificatePath(): string {
        return throwError("NotSupportedException");
    }

}