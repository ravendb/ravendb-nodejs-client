// package net.ravendb.client.test.issues;
//  import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.operations.DetailedDatabaseStatistics;
// import net.ravendb.client.documents.operations.GetDetailedStatisticsOperation;
// import net.ravendb.client.documents.operations.compareExchange.CompareExchangeResult;
// import net.ravendb.client.documents.operations.compareExchange.DeleteCompareExchangeValueOperation;
// import net.ravendb.client.documents.operations.compareExchange.PutCompareExchangeValueOperation;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.infrastructure.entities.Person;
// import net.ravendb.client.infrastructure.entities.User;
// import org.assertj.core.api.Assertions;
// import org.junit.jupiter.api.Test;
//  import static org.assertj.core.api.Assertions.assertThat;
//  public class RavenDB_10038Test extends RemoteTestBase {
//      @Test
//     public void compareExchangeAndIdentitiesCount() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             DetailedDatabaseStatistics stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(0);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(0);
//              try (IDocumentSession session = store.openSession()) {
//                 Person person = new Person();
//                 person.setId("people|");
//                 session.store(person);
//                  session.saveChanges();
//             }
//              stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(1);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(0);
//              try (IDocumentSession session = store.openSession()) {
//                 Person person = new Person();
//                 person.setId("people|");
//                 session.store(person);
//                  User user = new User();
//                 user.setId("users|");
//                 session.store(user);
//                  session.saveChanges();
//             }
//              stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(0);
//              store.operations().send(new PutCompareExchangeValueOperation<Person>("key/1", new Person(), 0));
//              stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(1);
//              CompareExchangeResult<Person> result = store.operations().send(new PutCompareExchangeValueOperation<Person>("key/2", new Person(), 0));
//             assertThat(result.isSuccessful())
//                     .isTrue();
//              stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(2);
//              result = store.operations().send(new PutCompareExchangeValueOperation<Person>("key/2", new Person(), result.getIndex()));
//             assertThat(result.isSuccessful())
//                     .isTrue();
//              stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(2);
//              result = store.operations().send(new DeleteCompareExchangeValueOperation<>(Person.class, "key/2", result.getIndex()));
//             assertThat(result.isSuccessful())
//                     .isTrue();
//              stats = store.maintenance().send(new GetDetailedStatisticsOperation());
//             assertThat(stats.getCountOfIdentities())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfCompareExchange())
//                     .isEqualTo(1);
//         }
//     }
// }