
// package net.ravendb.client.documents.operations;
//  import net.ravendb.client.documents.conventions.DocumentConventions;
// import net.ravendb.client.http.RavenCommand;
// import net.ravendb.client.http.ServerNode;
// import net.ravendb.client.primitives.Reference;
// import org.apache.http.client.methods.HttpGet;
// import org.apache.http.client.methods.HttpRequestBase;
//  import java.io.IOException;
//  public class GetDetailedStatisticsOperation implements IMaintenanceOperation<DetailedDatabaseStatistics> {
//      private final String _debugTag;
//      public GetDetailedStatisticsOperation() {
//         this(null);
//     }
//      public GetDetailedStatisticsOperation(String debugTag) {
//         _debugTag = debugTag;
//     }
//      @Override
//     public RavenCommand<DetailedDatabaseStatistics> getCommand(DocumentConventions conventions) {
//          return new DetailedDatabaseStatisticsCommand(_debugTag);
//     }
//      private static class DetailedDatabaseStatisticsCommand extends RavenCommand<DetailedDatabaseStatistics> {
//         private final String _debugTag;
//          public DetailedDatabaseStatisticsCommand(String debugTag) {
//             super(DetailedDatabaseStatistics.class);
//             _debugTag = debugTag;
//         }
//          @Override
//         public HttpRequestBase createRequest(ServerNode node, Reference<String> url) {
//             url.value = node.getUrl() + "/databases/" + node.getDatabase() + "/stats/detailed";
//              if (_debugTag != null) {
//                 url.value += "?" + _debugTag;
//             }
//              return new HttpGet();
//         }
//          @Override
//         public void setResponse(String response, boolean fromCache) throws IOException {
//             result = mapper.readValue(response, DetailedDatabaseStatistics.class);
//         }
//          @Override
//         public boolean isReadRequest() {
//             return true;
//         }
//     }
// }