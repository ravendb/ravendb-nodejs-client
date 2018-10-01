import { RequestExecutor } from "../../src/Http/RequestExecutor";
// tslint:disable-next-line:no-var-requires
// const why = require("why-is-node-running");
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import { VError } from "verror";
import * as http from "http";
import * as https from "https";
import "source-map-support/register";
import { IDisposable } from "../../src/Types/Contracts";
import { RavenTestDriver } from "../../src/TestDriver";
import { RavenServerLocator } from "../../src/TestDriver/RavenServerLocator";
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

class TestServiceLocator extends RavenServerLocator {
    public getCommandArguments() {
        return ["--ServerUrl=http://127.0.0.1:0", "--ServerUrl.Tcp=tcp://127.0.0.1:38884"];
    }
}

class TestSecuredServiceLocator extends RavenServerLocator {
    public static ENV_SERVER_CA_PATH = "RAVENDB_TEST_CA_PATH";

    public static ENV_SERVER_CERTIFICATE_PATH = "RAVENDB_TEST_SERVER_CERTIFICATE_PATH";
    public static ENV_HTTPS_SERVER_URL = "RAVENDB_TEST_HTTPS_SERVER_URL";

    public static ENV_CLIENT_CERT_PATH = "RAVENDB_TEST_CLIENT_CERT_PATH";
    public static ENV_CLIENT_CERT_PASSPHRASE = "RAVENDB_TEST_CLIENT_CERT_PASSPHRASE";

    public getCommandArguments() {
        const certPath = this.getServerCertificatePath();
        if (!certPath) {
            throwError("InvalidOperationException", "Unable to find RavenDB server certificate path. " +
                "Please make sure " + TestSecuredServiceLocator.ENV_SERVER_CERTIFICATE_PATH
                + " environment variable is set and valid " + "(current value = " + certPath + ")");
        }

        return [
            "--Security.Certificate.Path=" + certPath,
            "--ServerUrl=" + this._getHttpsServerUrl(),
            "--ServerUrl.Tcp=" + this._getHttpsServerTcpUrl()
        ];
    }

    private _getHttpsServerUrl() {
        const httpsServerUrl = process.env[TestSecuredServiceLocator.ENV_HTTPS_SERVER_URL];
        if (!httpsServerUrl) {
            throwError("InvalidArgumentException",
                "Unable to find RavenDB https server url. " +
                "Please make sure " + TestSecuredServiceLocator.ENV_HTTPS_SERVER_URL
                + " environment variable is set and is valid " +
                "(current value = " + httpsServerUrl + ")");
        }

        return httpsServerUrl;
    }

    private _getHttpsServerTcpUrl() {
        const https = this._getHttpsServerUrl();
        return "tcp://" + url.parse(https).hostname + ":38882";
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

    public static isPullRequest = (
        typeof(process.env["TRAVIS_PULL_REQUEST"]) === "undefined" ||
        process.env["TRAVIS_PULL_REQUEST"] === "false") === false;

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

    return new Promise<void>(resolve => {
        if (store) {
            store.once("executorsDisposed", () => resolve());
            store.dispose();
        }
    });
}

export let testContext: RavenTestContext;
setupRavenDbTestContext();

// tslint:disable:no-console
function checkAgent(agentName: string, agent: http.Agent) {
    const reqKeys = Object.keys(agent.requests);
    if (reqKeys.length) {
        console.log(`${agentName} dangling requests: ${reqKeys}`);
    }

    const sockKeys = Object.keys(agent.sockets);
    if (sockKeys.length) {
        console.log(`${agentName} dangling sockets: ${sockKeys}`);
    }
}

function setupRavenDbTestContext() {

    before(() => {
        testContext = RavenTestContext.setupServer();
    });

    afterEach(function () {
        if (this.currentTest && this.currentTest.state === "failed") {
            console.error(VError.fullStack(this.currentTest.err));
        }
    });

    after(() => {
        testContext.dispose();
        checkAgent("http", http.globalAgent);
        checkAgent("https", https.globalAgent);
    });

    return testContext;
}
// tslint:enable:no-console
