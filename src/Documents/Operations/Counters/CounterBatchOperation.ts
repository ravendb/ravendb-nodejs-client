// package net.ravendb.client.documents.operations.counters;
//  import com.fasterxml.jackson.core.JsonGenerator;
// import com.fasterxml.jackson.databind.JsonNode;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.conventions.DocumentConventions;
// import net.ravendb.client.documents.operations.IOperation;
// import net.ravendb.client.documents.session.EntityToJson;
// import net.ravendb.client.http.HttpCache;
// import net.ravendb.client.http.RavenCommand;
// import net.ravendb.client.http.ServerNode;
// import net.ravendb.client.json.ContentProviderHttpEntity;
// import net.ravendb.client.primitives.Reference;
// import org.apache.http.client.methods.HttpPost;
// import org.apache.http.client.methods.HttpRequestBase;
// import org.apache.http.entity.ContentType;
//  import java.io.IOException;
//  public class CounterBatchOperation implements IOperation<CountersDetail> {
//      private final CounterBatch _counterBatch;
//      public CounterBatchOperation(CounterBatch counterBatch) {
//         _counterBatch = counterBatch;
//     }
//      @Override
//     public RavenCommand<CountersDetail> getCommand(IDocumentStore store, DocumentConventions conventions, HttpCache cache) {
//         return new CounterBatchCommand(_counterBatch, conventions);
//     }
//      public static class CounterBatchCommand extends RavenCommand<CountersDetail> {
//         private final DocumentConventions _conventions;
//         private final CounterBatch _counterBatch;
//          public CounterBatchCommand(CounterBatch counterBatch, DocumentConventions conventions) {
//             super(CountersDetail.class);
//              if (counterBatch == null) {
//                 throw new IllegalArgumentException("CounterBatch cannot be null");
//             }
//             _counterBatch = counterBatch;
//             _conventions = conventions;
//         }
//          @Override
//         public HttpRequestBase createRequest(ServerNode node, Reference<String> url) {
//             url.value = node.getUrl() + "/databases/" + node.getDatabase() + "/counters";
//              HttpPost request = new HttpPost();
//              request.setEntity(new ContentProviderHttpEntity(outputStream -> {
//                 try (JsonGenerator generator = mapper.getFactory().createGenerator(outputStream)) {
//                     _counterBatch.serialize(generator, _conventions);
//                 } catch (IOException e) {
//                     throw new RuntimeException(e);
//                 }
//             }, ContentType.APPLICATION_JSON));
//              return request;
//         }
//          @Override
//         public void setResponse(String response, boolean fromCache) throws IOException {
//             if (response == null) {
//                 return;
//             }
//              result = mapper.readValue(response, CountersDetail.class);
//         }
//          @Override
//         public boolean isReadRequest() {
//             return false;
//         }
//     }
// }