import {RequestExecutor} from "../../src/Http/RequestExecutor";
// tslint:disable-next-line:no-var-requires
// const why = require("why-is-node-running");
import * as fs from "fs";
import * as path from "path";

import "source-map-support/register";
import {IDisposable} from "../../src/Types/Contracts";
import { RavenTestDriver } from "../../src/TestDriver";
import { RavenServerLocator } from "../../src/TestDriver/RavenServerLocator";
import { getLogger } from "../../src/Utility/LogUtil";
import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { throwError } from "../../src/Exceptions";
import { IAuthOptions } from "../../src/Auth/AuthOptions";
import * as os from "os";

// logOnUncaughtAndUnhandled();

function logOnUncaughtAndUnhandled() {
    process.on("unhandledRejection", (...args) => {
        // tslint:disable-next-line:no-console
        console.log(...args);
    });

    process.on("uncaughtException", (...args) => {
        // tslint:disable-next-line:no-console
        console.log(...args);
    });
}

class TestServiceLocator extends RavenServerLocator {}

class TestSecuredServiceLocator extends RavenServerLocator {
    public static ENV_SERVER_CA_PATH = "RAVENDB_TEST_CA_PATH";

    public static ENV_SERVER_CERTIFICATE_PATH = "RAVENDB_TEST_SERVER_CERTIFICATE_PATH";
    public static ENV_SERVER_HOSTNAME = "RAVENDB_TEST_SERVER_HOSTNAME";

    public static ENV_CLIENT_CERT_PATH = "RAVENDB_TEST_CLIENT_CERT_PATH";
    public static ENV_CLIENT_CERT_PASSPHRASE = "RAVENDB_TEST_CLIENT_CERT_PASSPHRASE";

    public withHttps() {
        return true;
    }

    public getCommandArguments() {
        const certPath = this.getServerCertificatePath();
        if (!certPath) {
            throwError("InvalidOperationException", "Unable to find RavenDB server certificate path. " +
                "Please make sure " + TestSecuredServiceLocator.ENV_SERVER_CERTIFICATE_PATH
                + " environment variable is set and valid " + "(current value = " + certPath + ")");
        }

        return [
            "--Security.Certificate.Path=" + certPath
        ];
    }

    public getServerHost() {
        return process.env[TestSecuredServiceLocator.ENV_SERVER_HOSTNAME] || "localhost";
    }

    public getServerCertificatePath() {
        return path.resolve(process.env[TestSecuredServiceLocator.ENV_SERVER_CERTIFICATE_PATH]);
    }

    public getClientAuthOptions(): IAuthOptions {
        const clientCertPath = process.env[TestSecuredServiceLocator.ENV_CLIENT_CERT_PATH];
        const clientCertPass = process.env[TestSecuredServiceLocator.ENV_CLIENT_CERT_PASSPHRASE];

        const serverCaCertPath = process.env[TestSecuredServiceLocator.ENV_SERVER_CA_PATH];

        if (!clientCertPath) {
            return {
                certificate: fs.readFileSync(this.getServerCertificatePath()),
                type: "pfx"
            };
        }

        return {
            type: "pem",
            certificate: fs.readFileSync(clientCertPath, "utf-8"),
            password: clientCertPass,
            ca: fs.readFileSync(serverCaCertPath, "utf-8"),
        };
    }
}

export class RavenTestContext extends RavenTestDriver implements IDisposable {

    public static isRunningOnWindows = os.platform() === "win32";

    public static isPullRequest = !!process.env["TRAVIS_PULL_REQUEST"];

    public static setupServer(): RavenTestContext {
        return new RavenTestContext(new TestServiceLocator(), new TestSecuredServiceLocator());
    }

    public enableFiddler(): IDisposable {
        RequestExecutor.requestPostProcessor = (req) => {
            req.proxy = "http://127.0.0.1:8888";
        };

        return {
            dispose() {
                RequestExecutor.requestPostProcessor = null;
            }
        };
    }
}

export async function disposeTestDocumentStore(store: IDocumentStore) {
    if (!store) {
        return;
    }

    await new Promise<void>(resolve => {
        store.once("executorsDisposed", () => resolve());
        store.dispose();
    });
}

export let testContext: RavenTestContext;
setupRavenDbTestContext();

function setupRavenDbTestContext() {

    before(() => {
        testContext = RavenTestContext.setupServer();
    });

    after(() => {
        testContext.dispose();
    });

    return testContext;
}
