
export abstract class SetupDocumentBase {
    // this is dummy class which serves as marker for documents like MoreLikeThisStopWords, or FacetSetup
    // those documents are read by server, so it need PascalCase convention regardless of local casing configuration.

    public abstract toRemoteFieldNames(): any;
}
