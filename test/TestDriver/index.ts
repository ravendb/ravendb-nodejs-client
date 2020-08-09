import * as BluebirdPromise from "bluebird";
import { ChildProcess, spawn } from "child_process";
import * as os from "os";
import { MultiError } from "verror";

import { CONSTANTS } from "../../src/Constants";
import { DocumentStore } from "../../src/Documents/DocumentStore";
import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { DatabaseStatistics } from "../../src/Documents/Operations/DatabaseStatistics";
import { GetStatisticsOperation } from "../../src/Documents/Operations/GetStatisticsOperation";
import { throwError, getError } from "../../src/Exceptions";
import { DatabaseRecord } from "../../src/ServerWide";
import { CreateDatabaseOperation } from "../../src/ServerWide/Operations/CreateDatabaseOperation";
import { DeleteDatabasesOperation } from "../../src/ServerWide/Operations/DeleteDatabasesOperation";
import { IDisposable } from "../../src/Types/Contracts";
import { getLogger } from "../../src/Utility/LogUtil";
import { RavenServerLocator } from "./RavenServerLocator";
import { RavenServerRunner } from "./RavenServerRunner";
import { TypeUtil } from "../../src/Utility/TypeUtil";
import { RevisionsConfiguration } from "../../src/Documents/Operations/RevisionsConfiguration";
import { RevisionsCollectionConfiguration } from "../../src/Documents/Operations/RevisionsCollectionConfiguration";
import {
    ConfigureRevisionsOperation,
    ConfigureRevisionsOperationResult
} from "../../src/Documents/Operations/Revisions/ConfigureRevisionsOperation";
import { Dog, Entity, Genre, Movie, Rating, User } from "../Assets/Graph";

const log = getLogger({ module: "TestDriver" });

export abstract class RavenTestDriver implements IDisposable {

    private _serverVersion: string;

    public get serverVersion() {
        return this._serverVersion;
    }

    private readonly _locator: RavenServerLocator;
    private readonly _securedLocator: RavenServerLocator;

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
    private _customizeStore: (store: DocumentStore) => Promise<void> = TypeUtil.ASYNC_NOOP;

    public set customizeDbRecord(customizeDbRecord: (dbRecord: DatabaseRecord) => void) {
        this._customizeDbRecord = customizeDbRecord;
    }

    public get customizeDbRecord() {
        return this._customizeDbRecord;
    }

    public set customizeStore(customizeStore: (store: DocumentStore) => Promise<void>) {
        this._customizeStore = customizeStore;
    }

    public get customizeStore() {
        return this._customizeStore;
    }

    public setupRevisions(
        store: IDocumentStore,
        purgeOnDelete: boolean,
        minimumRevisionsToKeep: number): Promise<ConfigureRevisionsOperationResult> {

        const revisionsConfiguration = new RevisionsConfiguration();
        const defaultConfiguration = new RevisionsCollectionConfiguration();
        defaultConfiguration.purgeOnDelete = purgeOnDelete;
        defaultConfiguration.minimumRevisionsToKeep = minimumRevisionsToKeep;

        revisionsConfiguration.defaultConfig = defaultConfiguration;
        const operation = new ConfigureRevisionsOperation(revisionsConfiguration);
        return store.maintenance.send(operation);
    }

    public async createSimpleData(store: IDocumentStore) {
        {
            const session = store.openSession();

            const entityA = Object.assign(new Entity(), {
                id: "entity/1",
                name: "A"
            });

            const entityB = Object.assign(new Entity(), {
                id: "entity/2",
                name: "B"
            });

            const entityC = Object.assign(new Entity(), {
                id: "entity/3",
                name: "C"
            });

            await session.store(entityA);
            await session.store(entityB);
            await session.store(entityC);

            entityA.references = entityB.id;
            entityB.references = entityC.id;
            entityC.references = entityA.id;

            await session.saveChanges();
        }
    }

    public async createDogDataWithoutEdges(store: IDocumentStore) {
        {
            const session = store.openSession();

            const arava = Object.assign(new Dog(), {
                name: "Arava"
            });

            const oscar = Object.assign(new Dog(), {
                name: "Oscar"
            });

            const pheobe = Object.assign(new Dog(), {
                name: "Pheobe"
            });

            await session.store(arava);
            await session.store(oscar);
            await session.store(pheobe);

            await session.saveChanges();
        }
    }

    public async createDataWithMultipleEdgesOfTheSameType(store: IDocumentStore) {
        {
            const session = store.openSession();

            const arava = Object.assign(new Dog(), {
                name: "Arava"
            });

            const oscar = Object.assign(new Dog(), {
                name: "Oscar"
            });

            const pheobe = Object.assign(new Dog(), {
                name: "Pheobe"
            });

            await session.store(arava);
            await session.store(oscar);
            await session.store(pheobe);

            //dogs/1 => dogs/2
            arava.likes = [ oscar.id ];
            arava.dislikes = [ pheobe.id ];

            //dogs/2 => dogs/2,dogs/3 (cycle!)
            oscar.likes = [ oscar.id, pheobe.id ];
            oscar.dislikes = [];

            //dogs/3 => dogs/2
            pheobe.likes = [ oscar.id ];
            pheobe.dislikes = [ arava.id ];

            await session.saveChanges();
        }
    }

    public async createMoviesData(store: IDocumentStore) {
        {
            const session = store.openSession();

            const scifi = Object.assign(new Genre(), {
                name: "genres/1", //tODO: scifi?
                id: "genres/1"
            });

            const fantasy = Object.assign(new Genre(), {
                id: "genres/2",
                name: "Fantasy"
            });

            const adventure = Object.assign(new Genre(), {
                id: "genres/3",
                name: "Adventure"
            });

            await session.store(scifi);
            await session.store(fantasy);
            await session.store(adventure);

            const starwars = Object.assign(new Movie(), {
                id: "movies/1",
                name: "Star Wars Ep.1",
                genres: [ "genres/1", "genres/2" ]
            });

            const firefly = Object.assign(new Movie(), {
                id: "movies/2",
                name: "Firefly Serenity",
                genres: [ "genres/2", "genres/3" ]
            });

            const indianaJones = Object.assign(new Movie(), {
                id: "movies/3",
                name: "Indiana Jones and the Temple Of Doom",
                genres: [ "genres/3" ]
            });

            await session.store(starwars);
            await session.store(firefly);
            await session.store(indianaJones);

            const user1 = Object.assign(new User(), {
                id: "users/1",
                name: "Jack"
            });

            const rating11 = Object.assign(new Rating(), {
                movie: "movies/1",
                score: 5
            });

            const rating12 = Object.assign(new Rating(), {
                movie: "movies/2",
                score: 7
            });

            user1.hasRated = [ rating11, rating12 ];
            await session.store(user1);

            const user2 = Object.assign(new User(), {
                id: "users/2",
                name: "Jill"
            });

            const rating21 = Object.assign(new Rating(), {
                movie: "movies/2",
                score: 7
            });

            const rating22 = Object.assign(new Rating(), {
                movie: "movies/3",
                score: 9
            });

            user2.hasRated = [ rating21, rating22 ]; //TODO: in java we ahe rating11 (?)

            await session.store(user2);

            const user3 = Object.assign(new User(), {
                id: "users/3",
                name: "Bob"
            });

            const rating31 = Object.assign(new Rating(), {
                movie: "movies/3",
                score: 5
            });

            user3.hasRated = [ rating31 ];

            await session.store(user3);

            await session.saveChanges();
        }
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
            .then(async createDatabaseResult => {
                const store = new DocumentStore(documentStore.urls, databaseName);
                if (secured) {
                    store.authOptions = this._securedLocator.getClientAuthOptions();
                }

                if (this._customizeStore) {
                    await this._customizeStore(store);
                }

                store.initialize();

                (store as IDocumentStore)
                    .once("afterDispose", (callback) => {
                        if (!this._documentStores.has(store)) {
                            callback();
                            return;
                        }

                        BluebirdPromise.resolve()
                            .then(() => {
                                return store.maintenance.server.send(new DeleteDatabasesOperation({
                                    databaseNames: [store.database],
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

                                if (store.isDisposed() || !this._getGlobalProcess(secured)) {
                                    return;
                                }

                                throwError("TestDriverTearDownError",
                                    `Error deleting database ${ store.database }.`, err);
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
            const SERVER_VERSION_REGEX = /Version (4.\d)/;
            const SERVER_URL_REGEX = /Server available on:\s*(\S+)\s*$/m;
            const serverProcess = this._getGlobalProcess(secured);
            let serverOutput = "";
            const result = new BluebirdPromise<string>((resolve, reject) => {
                serverProcess.stderr
                    .on("data", (chunk) => serverOutput += chunk);
                serverProcess.stdout
                    .on("data", (chunk) => {
                        serverOutput += chunk;

                        const serverVersionMatch = serverOutput.match(SERVER_VERSION_REGEX);
                        if (serverVersionMatch && serverVersionMatch.length) {
                            this._serverVersion = serverVersionMatch[1];
                        }

                        try {
                            const regexMatch = serverOutput.match(SERVER_URL_REGEX);
                            if (!regexMatch) {
                                return;
                            }

                            const data = regexMatch[1];
                            if (data) {
                                resolve(data);
                            }
                        } catch (err) {
                            reject(err);
                        }
                    })
                    .on("error", (err) => reject(err));
            });

            // timeout if url won't show up after 5s
            return result
                // tslint:disable-next-line:no-console
                .tap(url => console.log("DEBUG: RavenDB server URL", url))
                .timeout(5000)
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
                const store = new DocumentStore([serverUrl], "test.manager");
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
        let store;
        if (secured) {
            store = RavenTestDriver._globalSecuredServer;
            RavenTestDriver._globalSecuredServer = null;
            p = RavenTestDriver._globalSecuredServerProcess;
            RavenTestDriver._globalSecuredServerProcess = null;
        } else {
            store = RavenTestDriver._globalServer;
            RavenTestDriver._globalServer = null;
            p = RavenTestDriver._globalServerProcess;
            RavenTestDriver._globalServerProcess = null;
        }

        new BluebirdPromise(resolve => {
            if (store) {
                store.on("executorsDisposed", () => resolve());
            } else {
                resolve();
            }
        })
            .timeout(2000)
            .finally(() => {
                if (p && !p.killed) {
                    log.info("Kill global server");

                    try {
                        p.kill();
                    } catch (err) {
                        log.error(err);
                    }
                }
            });

        if (store) {
            store.dispose();
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

    public waitForUserToContinueTheTest(store: DocumentStore): void {
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
            spawn("xdg-open", [url], {
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
        const storeDisposalPromises = [...this._documentStores].map((store) => {
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
