// package net.ravendb.client.test.issues;
//  import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.infrastructure.entities.Company;
// import org.assertj.core.api.Assertions;
// import org.junit.jupiter.api.Test;
//  import java.util.Date;
//  import static org.assertj.core.api.Assertions.assertThat;
//  public class RavenDB_11770Test extends RemoteTestBase {
//      @Test
//     public void canGetRevisionsByDate() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             String id = "users/1";
//              setupRevisions(store, false, 1000);
//              try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("Fitzchak");
//                 session.store(company, id);
//                 session.saveChanges();
//             }
//             Date fst = new Date();
//              Thread.sleep(1100);
//              for (int i = 0; i < 3; i++) {
//                 try (IDocumentSession session = store.openSession()) {
//                     Company user = session.load(Company.class, id);
//                     user.setName("Fitzchak " + i);
//                     session.saveChanges();
//                 }
//             }
//              Date snd = new Date();
//              Thread.sleep(1100);
//              for (int i = 0; i < 3; i++) {
//                 try (IDocumentSession session = store.openSession()) {
//                     Company user = session.load(Company.class, id);
//                     user.setName("Oren " + i);
//                     session.saveChanges();
//                 }
//             }
//              try (IDocumentSession session = store.openSession()) {
//                 Company rev1 = session.advanced().revisions().get(Company.class, id, fst);
//                 assertThat(rev1.getName())
//                         .isEqualTo("Fitzchak");
//                  Company rev2 = session.advanced().revisions().get(Company.class, id, snd);
//                 assertThat(rev2.getName())
//                         .isEqualTo("Fitzchak 2");
//                  Company rev3 = session.advanced().revisions().get(Company.class, id, new Date());
//                 assertThat(rev3.getName())
//                         .isEqualTo("Oren 2");
//             }
//         }
//     }
// }