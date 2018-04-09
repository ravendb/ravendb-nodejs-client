import {IDisposable} from '../../src/Types/Contracts';
import { RavenTestDriver } from "../../src/TestDriver";
import { RavenServerLocator } from '../../src/TestDriver/RavenServerLocator';

logOnUncaughtAndUnhandled();

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
}

export class RemoteTestContext extends RavenTestDriver implements IDisposable {
    public static setupServer(): RemoteTestContext {
        return new RemoteTestContext(new TestServiceLocator(), null);
    }
}

export class RemoteSecuredTestContext extends RavenTestDriver {

    public static ENV_CERTIFICATE_PATH = "RAVENDB_TEST_CERTIFICATE_PATH";

    public withHttps() {
        return false;
    }

    public getCommandArguments() {
        return [];
    }
}
