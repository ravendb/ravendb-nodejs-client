// package net.ravendb.client.test.mailingList;
//  import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.session.IDocumentSession;
// import org.assertj.core.api.Assertions;
// import org.junit.jupiter.api.Test;
//  import java.util.HashSet;
// import java.util.List;
// import java.util.Set;
//  import static org.assertj.core.api.Assertions.assertThat;
//  public class NoTrackingTest extends RemoteTestBase {
//      @Test
//     public void canLoadEntitiesWithNoTracking() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             createData(store);
//              try (IDocumentSession session = store.openSession()) {
//                 session.advanced().addBeforeQueryListener((sender, handler) -> {
//                     handler.getQueryCustomization().noTracking();
//                 });
//                 List<AA> result = session.query(AA.class)
//                         .include("bs")
//                         .toList();
//                  assertThat(result)
//                         .hasSize(1);
//                  result.get(0).getBs().clear();
//                  assertThat(session.advanced().hasChanged(result.get(0)))
//                         .isFalse(); //since no tracking is turned on
//             }
//         }
//     }
//      private static void createData(IDocumentStore store) {
//         try (IDocumentSession session = store.openSession()) {
//             AA a = new AA();
//             a.setId("a/1");
//              B b = new B();
//             b.setId("b/1");
//              a.getBs().add("b/1");
//              session.store(a);
//             session.store(b);
//             session.saveChanges();
//         }
//     }
//      public static class AA {
//         private String id;
//         private Set<String> bs;
//          public AA() {
//             bs = new HashSet<>();
//         }
//          public String getId() {
//             return id;
//         }
//          public void setId(String id) {
//             this.id = id;
//         }
//          public Set<String> getBs() {
//             return bs;
//         }
//          public void setBs(Set<String> bs) {
//             this.bs = bs;
//         }
//     }
//      public static class B {
//         private String id;
//          public String getId() {
//             return id;
//         }
//          public void setId(String id) {
//             this.id = id;
//         }
//     }
// }