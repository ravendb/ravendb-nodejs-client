// package net.ravendb.client.test.issues;
//  import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.changes.*;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.infrastructure.entities.User;
// import net.ravendb.client.primitives.CleanCloseable;
// import org.eclipse.jetty.util.BlockingArrayQueue;
// import org.junit.jupiter.api.Test;
//  import java.util.concurrent.BlockingQueue;
// import java.util.concurrent.TimeUnit;
//  import static org.assertj.core.api.Assertions.assertThat;
//  public class RavenDB_11703Test extends RemoteTestBase {
//      @Test
//     public void canGetNotificationAboutCounterIncrement() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             BlockingQueue<CounterChange> changesList = new BlockingArrayQueue<>();
//              IDatabaseChanges changes = store.changes();
//             changes.ensureConnectedNow();
//              IChangesObservable<CounterChange> observable = changes.forCountersOfDocument("users/1");
//             try (CleanCloseable subscription = observable.subscribe(Observers.create(changesList::add))) {
//                  try (IDocumentSession session = store.openSession()) {
//                     User user = new User();
//                     session.store(user, "users/1");
//                     session.saveChanges();
//                 }
//                  try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.saveChanges();
//                 }
//                  CounterChange counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//                  assertThat(counterChange.getDocumentId())
//                         .isEqualTo("users/1");
//                 assertThat(counterChange.getType())
//                         .isEqualTo(CounterChangeTypes.PUT);
//                 assertThat(counterChange.getName())
//                         .isEqualTo("likes");
//                 assertThat(counterChange.getValue())
//                         .isEqualTo(1L);
//                 assertThat(counterChange.getChangeVector())
//                         .isNotNull();
//                  try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.saveChanges();
//                 }
//                  counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//                  assertThat(counterChange.getDocumentId())
//                         .isEqualTo("users/1");
//                 assertThat(counterChange.getType())
//                         .isEqualTo(CounterChangeTypes.INCREMENT);
//                 assertThat(counterChange.getName())
//                         .isEqualTo("likes");
//                 assertThat(counterChange.getValue())
//                         .isEqualTo(2L);
//                 assertThat(counterChange.getChangeVector())
//                         .isNotNull();
//             }
//         }
//     }
//      @Test
//     public void canGetNotificationAboutCounterDelete() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             BlockingQueue<CounterChange> changesList = new BlockingArrayQueue<>();
//              IDatabaseChanges changes = store.changes();
//             changes.ensureConnectedNow();
//              IChangesObservable<CounterChange> observable = changes.forCountersOfDocument("users/1");
//             try (CleanCloseable subscription = observable.subscribe(Observers.create(changesList::add))) {
//                  try (IDocumentSession session = store.openSession()) {
//                     User user = new User();
//                     session.store(user, "users/1");
//                     session.saveChanges();
//                 }
//                  try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.saveChanges();
//                 }
//                  CounterChange counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//                  assertThat(counterChange.getDocumentId())
//                         .isEqualTo("users/1");
//                 assertThat(counterChange.getType())
//                         .isEqualTo(CounterChangeTypes.PUT);
//                 assertThat(counterChange.getName())
//                         .isEqualTo("likes");
//                 assertThat(counterChange.getValue())
//                         .isEqualTo(1L);
//                 assertThat(counterChange.getChangeVector())
//                         .isNotNull();
//                  try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").delete("likes");
//                     session.saveChanges();
//                 }
//                  counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//                  assertThat(counterChange.getDocumentId())
//                         .isEqualTo("users/1");
//                 assertThat(counterChange.getType())
//                         .isEqualTo(CounterChangeTypes.DELETE);
//                 assertThat(counterChange.getName())
//                         .isEqualTo("likes");
//                 assertThat(counterChange.getValue())
//                         .isEqualTo(0);
//                 assertThat(counterChange.getChangeVector())
//                         .isNotNull();
//             }
//         }
//     }
//      @Test
//     public void canSubscribeToCounterChanges() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             BlockingQueue<CounterChange> changesList = new BlockingArrayQueue<>();
//              IDatabaseChanges changes = store.changes();
//             changes.ensureConnectedNow();
//              try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 session.store(user, "users/1");
//                 session.saveChanges();
//             }
//              IChangesObservable<CounterChange> observable = changes.forAllCounters();
//             try (CleanCloseable subscription = observable.subscribe(Observers.create(changesList::add))) {
//                  try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.saveChanges();
//                 }
//                  CounterChange counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//             }
//              observable = changes.forCounter("likes");
//             try (CleanCloseable subscription = observable.subscribe(Observers.create(changesList::add))) {
//                  try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.countersFor("users/1").increment("dislikes");
//                     session.saveChanges();
//                 }
//                  CounterChange counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//                 assertThat(counterChange.getName())
//                         .isEqualTo("likes");
//             }
//              assertThat(changesList.poll(1, TimeUnit.SECONDS))
//                     .isNull();
//              observable = changes.forCounterOfDocument("users/1", "likes");
//             try (CleanCloseable subscription = observable.subscribe(Observers.create(changesList::add))) {
//                 try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.countersFor("users/1").increment("dislikes");
//                     session.saveChanges();
//                 }
//                  CounterChange counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull();
//                 assertThat(counterChange.getName())
//                         .isEqualTo("likes");
//             }
//              assertThat(changesList.poll(1, TimeUnit.SECONDS))
//                     .isNull();
//              observable = changes.forCountersOfDocument("users/1");
//              try (CleanCloseable subscription = observable.subscribe(Observers.create(changesList::add))) {
//                 try (IDocumentSession session = store.openSession()) {
//                     session.countersFor("users/1").increment("likes");
//                     session.countersFor("users/1").increment("dislikes");
//                     session.saveChanges();
//                 }
//                  CounterChange counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull()
//                         .matches(x -> x.getName().equals("likes") || x.getName().equals("dislikes"));
//                  counterChange = changesList.poll(2, TimeUnit.SECONDS);
//                 assertThat(counterChange)
//                         .isNotNull()
//                         .matches(x -> x.getName().equals("likes") || x.getName().equals("dislikes"));
//             }
//         }
//     }
// }