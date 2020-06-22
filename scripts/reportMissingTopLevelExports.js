const glob = require("glob");
const fs = require("fs");
const path = require("path");
const os = require("os");
const promisify = require("util.promisify");

const globAsync = promisify(glob);

const IGNORE_MODULES = [
    "**/*.d.ts",
    "index.ts",
    "Utility/*",
    "Mapping/*",
    "TestDriver/*",
    "Primitives/*",
    "Mapping/**",
    "Documents/Session/Tokens/**",
    "Documents/Session/DocumentQueryCustomization",
    "Documents/Session/DocumentSessionAttachments",
    "Documents/Session/DocumentSessionAttachmentsBase",
    "Documents/Session/DocumentSessionRevisions",
    "Constants.ts",
    "Auth/Certificate",
    "Documents/Commands/CreateSubscriptionCommand*",
    "Documents/Commands/DeleteSubscriptionCommand*",
    "Documents/Commands/DropSubscriptionConnectionCommand*",
    "Documents/Commands/FacetQueryCommand*",
    "Documents/Commands/GetConflictsResult*",
    "Documents/Commands/GetDocumentsCommand",
    "Documents/Commands/GetRevisionsBinEntryCommand*",
    "Documents/Commands/GetRevisionsCommand*",
    "Documents/Commands/GetSubscriptionsCommand*",
    "Documents/Commands/GetSubscriptionStateCommand*",
    "Documents/Commands/HeadAttachmentCommand*",
    "Documents/Commands/HeadDocumentCommand*",
    "Documents/Commands/MultiGet/GetRequest*",
    "Documents/Commands/MultiGet/GetResponse*",
    "Documents/Commands/MultiGet/MultiGetCommand*",
    "Documents/Commands/QueryCommand*",
    "Documents/Commands/QueryStreamCommand*",
    "Documents/Commands/StreamCommand*",
    "Documents/Identity/**",
    "Documents/Indexes/IndexCreation*",
    "Http/RavenCommandResponsePipeline*",
    "Types/IRavenObject*",
    "Auth/Certificate*",
    "Documents/Operations/OperationExecutor*",
    "Documents/Operations/ServerOperationExecutor*",
    "Http/HttpCache*",
    "Documents/Queries/QueryResultBase*",
    "Documents/Queries/QueryFieldUtil*",
    "Documents/Queries/QueryHashCalculator*",
    "Documents/Session/AdvancedSessionExtensionBase*",
    "Documents/Session/JavaScriptArray*",
    "Documents/Queries/GenericQueryResult*",
    "Documents/Queries/IndexQueryBase*",
    "Documents/Queries/IndexQueryWithParameters*",
    "ServerWide/Tcp/TcpConnectionHeaderMessage*",
    "ServerWide/Tcp/TcpConnectionHeaderResponse*",
    "ServerWide/Tcp/TcpConnectionStatus*",
    "ServerWide/Tcp/TcpNegotiateParameters*",
    "ServerWide/Tcp/TcpNegotiation*",
    "Documents/Queries/MoreLikeThis/IMoreLikeThisBuilderBase*",
    "Documents/Queries/MoreLikeThis/MoreLikeThisQueryResult*",
    "Documents/Queries/MoreLikeThis/IMoreLikeThisBuilderForDocumentQuery*",
    "Documents/Queries/MoreLikeThis/MoreLikeThisUsingDocument*",
    "Documents/Queries/MoreLikeThis/MoreLikeThisUsingAnyDocument*",
    "Documents/Queries/MoreLikeThis/MoreLikeThisScope*",
    "Documents/Queries/Suggestions/SuggestionQueryBase*",
    "Documents/Queries/Suggestions/SuggestionWithTerm*",
    "Documents/Queries/Suggestions/SuggestionWithTerms*",
    "Documents/Subscriptions/CreateSubscriptionResult*",
    "Documents/Subscriptions/GetSubscriptionResult*",
    "Documents/Subscriptions/GetSubscriptionsResult*",
    "Documents/Subscriptions/NodeId*",
    "Documents/Subscriptions/SubscriptionConnectionClientMessage*",
    "Documents/Subscriptions/SubscriptionConnectionClientMessage*",
    "Documents/Subscriptions/SubscriptionConnectionServerMessage*",
    "Documents/Subscriptions/SubscriptionOpeningStrategy*",
    "Documents/Subscriptions/SubscriptionStateWithNodeDetails*",
    "Documents/Subscriptions/SubscriptionTryout*",
    "Documents/Commands/**",
    "Documents/Indexes/IndexTypeExtensions*",
    "Documents/Indexes/AbstractIndexCreationTaskBase*",
    "Documents/Session/ClusterTransactionOperationsBase*",
    "Documents/Session/IAttachmentsSessionOperationsBase*",
    "Documents/Session/SessionCountersBase*",
    "Documents/Indexes/AbstractGenericIndexCreationTask*",
    "Documents/Subscriptions/BatchFromServer*"
];

function main() {
    return globAsync("**/*.ts", {
        cwd: path.join(__dirname, "../src"),
        ignore: IGNORE_MODULES
    })
    .then(modules => {
        modules = modules.map(x => x.replace(/\/index\.ts$/, "")
            .replace(/\.ts$/, ""));

        const topLevelExports = fs.readFileSync(path.join(__dirname, "../src/index.ts"));
        const modulesNotExported = modules.filter(m => !topLevelExports.includes(m));

        if (modulesNotExported.length) {
            console.error(`${ modulesNotExported.length } modules not exported at the top level:`)
            console.error(modulesNotExported.join(os.EOL));
            return false;
        }

        console.log("All required modules exported at the top level.");

        return true;
    });
}

main()
.then(result => process.exit(result ? 0 : 1))
.catch(err => {
    console.log(err);
    process.exit(-1);
})
