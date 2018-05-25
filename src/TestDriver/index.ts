import * as fs from "fs";
import * as BluebirdPromise from "bluebird";
import { ChildProcess, spawn } from "child_process";
import * as os from "os";
import { MultiError } from "verror";

import { IAuthOptions } from "../Auth/AuthOptions";
import { CONSTANTS } from "../Constants";
import { DocumentStore } from "../Documents/DocumentStore";
import { IDocumentStore } from "../Documents/IDocumentStore";
import { DatabaseStatistics } from "../Documents/Operations/DatabaseStatistics";
import { GetStatisticsOperation } from "../Documents/Operations/GetStatisticsOperation";
import { throwError, getError } from "../Exceptions";
import { DatabaseRecord } from "../ServerWide";
import { CreateDatabaseOperation } from "../ServerWide/Operations/CreateDatabaseOperation";
import { DeleteDatabasesOperation } from "../ServerWide/Operations/DeleteDatabasesOperation";
import { Todo } from "../Types";
import { IDisposable } from "../Types/Contracts";
import { getLogger } from "../Utility/LogUtil";
import { RavenServerLocator } from "./RavenServerLocator";
import { RavenServerRunner } from "./RavenServerRunner";
import { TypeUtil } from "../Utility/TypeUtil";
import { Certificate, ICertificate } from "../Auth/Certificate";

const log = getLogger({ module: "TestDriver" });

export abstract class RavenTestDriver implements IDisposable {

    private _locator: RavenServerLocator;
    private _securedLocator: RavenServerLocator;

    private static _globalServer: DocumentStore;
    private static _globalServerProcess: ChildProcess;

    private static _globalSecuredServer: DocumentStore;
    private static _globalSecuredServerProcess: ChildProcess;

    private _documentStores: Set<IDocumentStore> = new Set();

    private static _index: number = 0;

    protected _disposed: boolean = false;

    public constructor(locator: RavenServerLocator, securedLocator: RavenServerLocator) {
        this._locator = locator;
        this._securedLocator = securedLocator;
    }

    public isDisposed(): boolean {
        return this._disposed;
    }

    public static debug: boolean;

    public getSecuredDocumentStore(): Promise<DocumentStore>; 
    public getSecuredDocumentStore(database?): Promise<DocumentStore> { 
        return this.getDocumentStore(database, true, null);
    }

    private _customizeDbRecord: (dbRecord: DatabaseRecord) => void = TypeUtil.NOOP;

    public set customizeDbRecord(customizeDbRecord: (dbRecord: DatabaseRecord) => void) {
        this._customizeDbRecord = customizeDbRecord;
    }

    public get customizeDbRecord() {
        return this._customizeDbRecord;
    }

    public getDocumentStore(): Promise<DocumentStore>;
    public getDocumentStore(database: string): Promise<DocumentStore>;
    public getDocumentStore(database: string, secured: boolean): Promise<DocumentStore>;
    public getDocumentStore(
        database: string, secured: boolean, waitForIndexingTimeoutInMs?: number): Promise<DocumentStore>; 
    public getDocumentStore(
        database = "test_db", secured = false, waitForIndexingTimeoutInMs: number = null): Promise<DocumentStore> {

        const databaseName = database + "_" + (++RavenTestDriver._index);
        log.info(`getDocumentStore for db ${ database }.`);

        let documentStore: IDocumentStore;
        return Promise.resolve()
        .then(() => {
            if (!this._getGlobalServer(secured)) {
                return this._runServer(secured);
            }
        })
        .then(() => {
            documentStore = this._getGlobalServer(secured);
            const databaseRecord: DatabaseRecord = { databaseName };

            if (this._customizeDbRecord) {
                this._customizeDbRecord(databaseRecord);
            }

            const createDatabaseOperation = new CreateDatabaseOperation(databaseRecord);
            return documentStore.maintenance.server.send(createDatabaseOperation);
        })
        .then(createDatabaseResult => {
            const store = new DocumentStore(documentStore.urls, databaseName);
            if (secured) {
                store.authOptions = this._securedLocator.getClientAuthOptions();
            }

            store.initialize();

            (store as IDocumentStore).once("afterDispose", (callback) => {
                if (!this._documentStores.has(store)) {
                    callback();
                    return; 
                }

                return BluebirdPromise.resolve()
                    .then(() => {
                        return store.maintenance.server.send(new DeleteDatabasesOperation({
                            databaseNames: [ store.database ],
                            hardDelete: true
                        }));
                    })
                    .tap((deleteResult) => {
                        log.info(`Database ${store.database} deleted.`);
                    })
                    .catch(err => {
                        if (err.name === "DatabaseDoesNotExistException"
                        || err.name === "NoLeaderException") {
                            return;
                        }
                        
                        throwError("TestDriverTearDownError", `Error deleting database ${ store.database }.`, err);
                    })
                    .finally(() => callback());
            });

            return Promise.resolve()
                .then(() => this._setupDatabase(store))
                .then(() => {
                    if (!TypeUtil.isNullOrUndefined(waitForIndexingTimeoutInMs)) {
                        return this.waitForIndexing(store);
                    }
                })
                .then(() => this._documentStores.add(store))
                .then(() => store);

        });
    }

    protected _setupDatabase(documentStore: IDocumentStore): Promise<void> {
        return Promise.resolve();
    }

    private _runServer(secured: boolean): Promise<IDocumentStore> {
        log.info("Run global server");
        const process = RavenServerRunner.run(secured ? this._securedLocator : this._locator);
        this._setGlobalServerProcess(secured, process);

        process.once("exit", (code, signal) => {
            log.info("Exiting.");
        });

        const scrapServerUrl = () => {
            const SERVER_URL_REGEX = /Server available on:\s*(\S+)\s*$/m;
            const serverProcess = this._getGlobalProcess(secured);
            let serverOutput = "";
            const result = new BluebirdPromise<string>((resolve, reject) => {
                serverProcess.stdout
                    .on("data", (chunk) => {
                        serverOutput += chunk;
                        try {
                            const regexMatch = serverOutput.match(SERVER_URL_REGEX);
                            if (!regexMatch) {
                                return;
                            }

                            const data = regexMatch[1];
                            if (data) {
                                resolve(data);
                            }
                        } catch (err) { reject(err); }
                    })
                    .on("error", (err) => reject(err));
            });

            // timeout if url won't show up after 5s
            return result
                .timeout(10000)
                .catch((err) => {
                    throwError("UrlScrappingError", "Error scrapping URL from server process output: " 
                        + os.EOL + serverOutput, err);
                });
        };

        return Promise.resolve()
        .then(() => scrapServerUrl())
        .catch((err) => {

                try {
                    process.kill("SIGKILL");
                } catch (processKillErr) {
                    log.error(processKillErr);
                }

                throwError("InvalidOperationException", "Unable to start server.", err);
            })
            .then((serverUrl: string) => {
                const store = new DocumentStore([ serverUrl ], "test.manager");
                store.conventions.disableTopologyUpdates = true;

                if (secured) {
                    RavenTestDriver._globalSecuredServer = store;
                    store.authOptions = this._securedLocator.getClientAuthOptions();
                } else {
                    RavenTestDriver._globalServer = store;
                }

                return store.initialize();
            });
    }

    private static _killGlobalServerProcess(secured: boolean): void {
        let p: ChildProcess;
        if (secured) {
            p = RavenTestDriver._globalSecuredServerProcess;
            RavenTestDriver._globalSecuredServerProcess = null;
        } else {
            p = RavenTestDriver._globalServerProcess;
            RavenTestDriver._globalServerProcess = null;
        }

        if (p && !p.killed) {
            log.info("Kill global server");

            try {
                p.kill();
            } catch (err) {
                log.error(err);
            }
        }
    }

    private _getGlobalServer(secured: boolean): IDocumentStore {
        return secured ? RavenTestDriver._globalSecuredServer : RavenTestDriver._globalServer;
    }

    private _getGlobalProcess(secured: boolean): ChildProcess {
        return secured ? RavenTestDriver._globalSecuredServerProcess : RavenTestDriver._globalServerProcess;
    }

    private _setGlobalServerProcess(secured: boolean, p: ChildProcess): void {
        if (secured) {
            RavenTestDriver._globalSecuredServerProcess = p;
        } else {
            RavenTestDriver._globalServerProcess = p;
        }
    }

    public waitForIndexing(store: IDocumentStore): Promise<void>;
    public waitForIndexing(store: IDocumentStore, database?: string): Promise<void>;
    public waitForIndexing(store: IDocumentStore, database?: string, timeout?: number): Promise<void>;
    public waitForIndexing(
        store: IDocumentStore, database?: string, timeout?: number, throwOnIndexErrors?: boolean): Promise<void>;
    public waitForIndexing(
        store: IDocumentStore, 
        database?: string, 
        timeout?: number, 
        throwOnIndexErrors: boolean = true): Promise<void> {
        const admin = store.maintenance.forDatabase(database);

        if (!timeout) {
            timeout = 60 * 1000; // minute
        }

        const isIndexingDone = (): Promise<boolean> => {
            return Promise.resolve()
                .then(() => admin.send(new GetStatisticsOperation()))
                .then((dbStats: DatabaseStatistics) => {
                    const indexes = dbStats.indexes.filter(x => x.state !== "Disabled");

                    const errIndexes = indexes.filter(x => x.state === "Error");
                    if (errIndexes.length && throwOnIndexErrors) {
                        throwError("IndexInvalidException", 
                            `The following indexes are erroneous: ${errIndexes.map(x => x.name).join(", ")}`);
                    }

                    return indexes.every(x => !x.isStale
                        && !x.name.startsWith(CONSTANTS.Documents.Indexing.SIDE_BY_SIDE_INDEX_NAME_PREFIX));
                });
        };

        const pollIndexingStatus = () => {
            log.info("Waiting for indexing...");
            return BluebirdPromise.resolve()
                .then(() => isIndexingDone())
                .then(indexingDone => {
                    if (!indexingDone) {
                        return BluebirdPromise.resolve()
                            .delay(100)
                            .then(() => pollIndexingStatus());
                    } else {
                        log.info("Done waiting for indexing."); 
                    }
                });
        };

        const result = BluebirdPromise.resolve(pollIndexingStatus())
            .timeout(timeout)
            .tapCatch((err) => {
                log.warn(err, "Wait for indexing timeout.");  
            });

        return Promise.resolve(result);
    }

    public waitForUserToContinueTheTest(store: Todo): void {
        // TODO

        // String databaseNameEncoded = UrlUtils.escapeDataString(store.getDatabase());
        // String documentsPage = 
        //      store.getUrls()[0] + "/studio/index.html#databases/documents?&database=" 
        //      + databaseNameEncoded + "&withStop=true";

        // openBrowser(documentsPage);

        // do {
        //     try {
        //         Thread.sleep(500);
        //     } catch (InterruptedException ignored) {
        //     }

        //     try (IDocumentSession session = store.openSession()) {
        //         if (session.load(ObjectNode.class, "Debug/Done") != null) {
        //             break;
        //         }
        //     }

        // } while (true);
    }

    protected _openBrowser(url: string): void {
        // tslint:disable-next-line:no-console
        console.log(url);

        if (os.platform() === "win32") {
            spawn("powershell.exe", ["-c", `start-process ${url}`], {
                detached: true
            });
        } else {
            spawn("xdg-open", [ url ], {
                detached: true
            });
        }
    }

    public dispose(): void {
        log.info("Dispose.");

        if (this._disposed) {
            return;
        }

        this._disposed = true;

        const STORE_DISPOSAL_TIMEOUT = 10000;
        const storeDisposalPromises = [ ...this._documentStores ].map((store) => {
            return Promise.resolve()
                .then(() => {
                    const result = new BluebirdPromise((resolve) => {
                        store.once("executorsDisposed", () => {
                            resolve();
                        });
                    })
                    .timeout(STORE_DISPOSAL_TIMEOUT)
                    .then(() => null);

                    store.dispose();
                    return result;
                })
                .catch((err: Error) => 
                    getError("TestDriverTeardownError", "Error disposing document store", err));
        });

        BluebirdPromise.all(storeDisposalPromises)
            .then((errors) => {
                const anyErrors = errors.filter(x => !!x);
                if (anyErrors.length) {
                    throw new MultiError(anyErrors);
                }
            })
            .then(() => {
                if (RavenTestDriver._globalSecuredServer) {
                    RavenTestDriver._globalSecuredServer.dispose();
                }

                if (RavenTestDriver._globalServer) {
                    RavenTestDriver._globalServer.dispose();
                }
            })
            .finally(() => {
                RavenTestDriver._killGlobalServerProcess(true);
                RavenTestDriver._killGlobalServerProcess(false);
            });
    }
}
