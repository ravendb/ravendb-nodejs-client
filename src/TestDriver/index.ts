import {IAuthOptions} from "../Auth/AuthOptions";
import { spawn, ChildProcess } from "child_process";
import { IDisposable } from "../Types/Contracts";
import { throwError } from "../Exceptions";
import { DocumentStore } from "../Documents/DocumentStore";
import { IDocumentStore } from "../Documents/IDocumentStore";
import { getLogger } from "../Utility/LogUtil";
import { DatabaseRecord } from "../ServerWide";
import { CreateDatabaseOperation } from "../ServerWide/Operations/CreateDatabaseOperation";
import { DeleteDatabasesOperation } from "../ServerWide/Operations/DeleteDatabasesOperation";
import { RavenServerLocator } from "./RavenServerLocator";
import { RavenServerRunner } from "./RavenServerRunner";

const log = getLogger({ module: "TestDriver" });

export abstract class RavenTestDriver implements IDisposable {

    private locator: RavenServerLocator;
    private securedLocator: RavenServerLocator;

    private static globalServer: DocumentStore;
    private static globalServerProcess: ChildProcess;

    private static globalSecuredServer: DocumentStore;
    private static globalSecuredServerProcess: ChildProcess;

    private documentStores: Set<IDocumentStore> = new Set();

    private static index: number = 0;

    protected disposed: boolean = false;

    public constructor(locator: RavenServerLocator, securedLocator: RavenServerLocator) {
        this.locator = locator;
        this.securedLocator = securedLocator;
    }

    public isDisposed(): boolean {
        return this.disposed;
    }

    public static debug: boolean;

    public getTestClientCertificate(): IAuthOptions {
        throw new Error("TODO");
    }

    public getSecuredDocumentStore(): Promise<DocumentStore>; 
    public getSecuredDocumentStore(database?): Promise<DocumentStore> { 
        return this.getDocumentStore(database, true, null);
    }

    // tslint:disable-next-line:no-empty
    protected _customizeDbRecord(dbRecord: DatabaseRecord): void {}

    public getDocumentStore(): Promise<DocumentStore>;
    public getDocumentStore(database: string): Promise<DocumentStore>;
    public getDocumentStore(
        database: string, secured: boolean, waitForIndexingTimeoutInMs?: number): Promise<DocumentStore>; 
    public getDocumentStore(
        database = "test_db", secured = false, waitForIndexingTimeoutInMs?: number = null): Promise<DocumentStore> {

        const databaseName = database + "_" + (++RavenTestDriver.index);
        log.info(`getDocumentStore for db ${ database }.`);

        if (!RavenTestDriver._getGlobalServer(secured)) {
            if (RavenTestDriver._getGlobalServer(secured) === null) {
                RavenTestDriver._runServer(secured);
            }
        }

        const documentStore: IDocumentStore = RavenTestDriver._getGlobalServer(secured);
        const databaseRecord = Object.assign(new DatabaseRecord(), { databaseName });

        this._customizeDbRecord(databaseRecord);

        const createDatabaseOperation = new CreateDatabaseOperation(databaseRecord);
        return Promise.resolve()
            .then(() => documentStore.maintenance.server.send(createDatabaseOperation))
        .then(createDatabaseResult => {
            const store = new DocumentStore(documentStore.urls, name);
            if (secured) {
                throw new Error("TODO");
                store.authOptions = null; // TODO
            }

            store.initialize();

            (store as IDocumentStore).on("afterClose", () => {
                if (!this.documentStores.has(store)) {
                    return; 
                }

                return Promise.resolve()
                    .then(() => {
                        return store.maintenance.server.send(new DeleteDatabasesOperation({
                            databaseNames: [ store.database ],
                            hardDelete: true
                        }));
                    })
                    .catch(err => {
                        if (err.name === "DatabaseDoesNotExistException"
                        || err.name === "NoLeaderException") {
                            return;
                        }
                        
                        throwError("TestDriverTearDownError", `Error deleting database ${ store.database }.`, err);
                    });
            });

            return Promise.resolve()
                .then(() => this._setupDatabase(store))
                // /* TODO
                //  if (waitForIndexingTimeout.HasValue)
                //         WaitForIndexing(store, name, waitForIndexingTimeout);
                //  */
                .then(() => this.documentStores.add(store))
                .then(() => store);

        });
    }

    protected _setupDatabase(documentStore: IDocumentStore): Promise<void> {
        return Promise.resolve();
    }

    private runServer(secured: boolean): IDocumentStore {
        const process = RavenServerRunner.run(secured ? this.securedLocator : this.locator);
        this._setGlobalServerProcess(secured, process);

        log.info("Starting global server");

        process.once("exit", (code, signal) => {
            this.killGlobalServerProcess(secured);
        });


        let url: string = null;
        InputStream stdout = this.getGlobalProcess(secured).stdout;

        StringBuilder sb = new StringBuilder();

        Stopwatch startupDuration = Stopwatch.createStarted();
        BufferedReader reader = new BufferedReader(new InputStreamReader(stdout));

        List<String> readLines = new ArrayList<>();

        while (true) {

            //TODO: handle timeout!
            String line = reader.readLine();
            readLines.add(line);

            if (line == null) {
                throw new RuntimeException(readLines.stream().collect(Collectors.joining(System.lineSeparator())) +  IOUtils.toString(getGlobalProcess(secured).getInputStream(), "UTF-8"));
            }

            if (startupDuration.elapsed(TimeUnit.MINUTES) >= 1) {
                break;
            }

            String prefix = "Server available on: ";
            if (line.startsWith(prefix)) {
                url = line.substring(prefix.length());
                break;
            }

            /*TODO
             Task<string> readLineTask = null;
            while (true)
            {
                if (readLineTask == null)
                    readLineTask = output.ReadLineAsync();

                var task = Task.WhenAny(readLineTask, Task.Delay(TimeSpan.FromSeconds(5))).Result;

                if (startupDuration.Elapsed > TimeSpan.FromMinutes(1))
                    break;

                if (task != readLineTask)
                    continue;

                var line = readLineTask.Result;

                readLineTask = null;

                sb.AppendLine(line);

                if (line == null)
                {
                    try
                    {
                        process.Kill();
                    }
                    catch (Exception e)
                    {
                        ReportError(e);
                    }

                    throw new InvalidOperationException("Unable to start server, log is: " + Environment.NewLine + sb);
                }

            }
             */
        }

        if (url == null) {
            String log = sb.toString();
            log.info(log);

            try {
                process.destroyForcibly();
            } catch (e) {
                log.error(e);
            }

            throw new IllegalStateException("Unable to start server, log is: " + log);
        }

        DocumentStore store = new DocumentStore();
        store.setUrls(new String[]{url});
        store.setDatabase("test.manager");
        store.getConventions().setDisableTopologyUpdates(true);

        if (secured) {
            globalSecuredServer = store;
            KeyStore clientCert = getTestClientCertificate();
            store.setCertificate(clientCert);
        } else {
            globalServer = store;
        }
        return store.initialize();
    }

    private static _killGlobalServerProcess(secured: boolean): void {
        let p: ChildProcess;
        if (secured) {
            p = RavenTestDriver.globalSecuredServerProcess;
            RavenTestDriver.globalSecuredServerProcess = null;
        } else {
            p = RavenTestDriver.globalServerProcess;
            RavenTestDriver.globalServerProcess = null;
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
        return secured ? RavenTestDriver.globalSecuredServer : RavenTestDriver.globalServer;
    }

    private _getGlobalProcess(secured: boolean): ChildProcess {
        return secured ? RavenTestDriver.globalSecuredServerProcess : RavenTestDriver.globalServerProcess;
    }

    private _setGlobalServerProcess(secured: boolean, p: ChildProcess): void {
        if (secured) {
            RavenTestDriver.globalSecuredServerProcess = p;
        } else {
            RavenTestDriver.globalServerProcess = p;
        }
    }

    public waitForIndexing(store: IDocumentStore): Promise<void>;
    public waitForIndexing(store: IDocumentStore, database?: string): Promise<void>
    public waitForIndexing(store: IDocumentStore, database?: string, timeout?: number): Promise<void>;
    public waitForIndexing(store: IDocumentStore, database?: string, timeout?: number): Promise<void> {
        MaintenanceOperationExecutor admin = store.maintenance().forDatabase(database);

        if (timeout == null) {
            timeout = Duration.ofMinutes(1);
        }

        Stopwatch sp = Stopwatch.createStarted();

        while (sp.elapsed(TimeUnit.MILLISECONDS) < timeout.toMillis()) {
            DatabaseStatistics databaseStatistics = admin.send(new GetStatisticsOperation());

            List<IndexInformation> indexes = Arrays.stream(databaseStatistics.getIndexes())
                    .filter(x -> !IndexState.DISABLED.equals(x.getState()))
                    .collect(Collectors.toList());

            if (indexes.stream().allMatch(x -> !x.isStale() &&
                    !x.getName().startsWith(Constants.Documents.Indexing.SIDE_BY_SIDE_INDEX_NAME_PREFIX))) {
                return;
            }

            if (Arrays.stream(databaseStatistics.getIndexes()).anyMatch(x -> IndexState.ERROR.equals(x.getState()))) {
                break;
            }

            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }

        throw new TimeoutException(); //TODO:
        /* TODO
            var errors = admin.Send(new GetIndexErrorsOperation());

            string allIndexErrorsText = string.Empty;
            if (errors != null && errors.Length > 0)
            {
                var allIndexErrorsListText = string.Join("\r\n",
                    errors.Select(FormatIndexErrors));
                allIndexErrorsText = $"Indexing errors:\r\n{ allIndexErrorsListText }";

                string FormatIndexErrors(IndexErrors indexErrors)
                {
                    var errorsListText = string.Join("\r\n",
                        indexErrors.Errors.Select(x => $"- {x}"));
                    return $"Index '{indexErrors.Name}' ({indexErrors.Errors.Length} errors):\r\n{errorsListText}";
                }
            }

            throw new TimeoutException($"The indexes stayed stale for more than {timeout.Value}.{ allIndexErrorsText }");
        }
         */
    }


    public void waitForUserToContinueTheTest(IDocumentStore store) {
        String databaseNameEncoded = UrlUtils.escapeDataString(store.getDatabase());
        String documentsPage = store.getUrls()[0] + "/studio/index.html#databases/documents?&database=" + databaseNameEncoded + "&withStop=true";

        openBrowser(documentsPage);

        do {
            try {
                Thread.sleep(500);
            } catch (InterruptedException ignored) {
            }

            try (IDocumentSession session = store.openSession()) {
                if (session.load(ObjectNode.class, "Debug/Done") != null) {
                    break;
                }
            }

        } while (true);
    }

    protected void openBrowser(String url) {
        System.out.println(url);

        if (Desktop.isDesktopSupported()) {
            Desktop desktop = Desktop.getDesktop();
            try {
                desktop.browse(new URI(url));
            } catch (IOException | URISyntaxException e) {
                throw new RuntimeException(e);
            }
        } else {
            Runtime runtime = Runtime.getRuntime();
            try {
                runtime.exec("xdg-open " + url);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public dispose(): void {
        if (disposed) {
            return;
        }

        ArrayList<Exception> exceptions = new ArrayList<>();

        for (DocumentStore documentStore : documentStores) {
            try {
                documentStore.close();
            } catch (Exception e) {
                exceptions.add(e);
            }
        }

        disposed = true;

        if (exceptions.size() > 0) {
            throw new RuntimeException(exceptions.stream().map(x -> x.toString()).collect(Collectors.joining(", ")));
        }
    }
}
