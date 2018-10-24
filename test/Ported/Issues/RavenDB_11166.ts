// package net.ravendb.client.test.issues;

// import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.documents.subscriptions.SubscriptionBatch;
// import net.ravendb.client.documents.subscriptions.SubscriptionCreationOptions;
// import net.ravendb.client.documents.subscriptions.SubscriptionWorker;
// import org.junit.jupiter.api.Test;

// import java.util.concurrent.CompletableFuture;
// import java.util.concurrent.Semaphore;
// import java.util.concurrent.TimeUnit;

// import static org.assertj.core.api.Assertions.assertThat;

// public class RavenDB_11166Test extends RemoteTestBase {

//     public static class Dog {
//         private String name;
//         private String owner;

//         public String getName() {
//             return name;
//         }

//         public void setName(String name) {
//             this.name = name;
//         }

//         public String getOwner() {
//             return owner;
//         }

//         public void setOwner(String owner) {
//             this.owner = owner;
//         }
//     }

//     public static class Person {
//         private String name;

//         public String getName() {
//             return name;
//         }

//         public void setName(String name) {
//             this.name = name;
//         }
//     }

//     @Test
//     public void canUseSubscriptionWithIncludes() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Person person = new Person();
//                 person.setName("Arava");
//                 session.store(person, "people/1");

//                 Dog dog = new Dog();
//                 dog.setName("Oscar");
//                 dog.setOwner("people/1");
//                 session.store(dog);

//                 session.saveChanges();
//             }

//             SubscriptionCreationOptions options = new SubscriptionCreationOptions();
//             options.setQuery("from Dogs include Owner");
//             String id = store.subscriptions().create(options);

//             try (SubscriptionWorker<Dog> sub = store.subscriptions().getSubscriptionWorker(Dog.class, id)) {

//                 Semaphore semaphore = new Semaphore(0);
//                 CompletableFuture<Void> run = sub.run(batch -> {
//                     assertThat(batch.getItems())
//                             .isNotEmpty();

//                     try (IDocumentSession s = batch.openSession()) {
//                         for (SubscriptionBatch.Item<Dog> item : batch.getItems()) {
//                             s.load(Person.class, item.getResult().getOwner());
//                             Dog dog = s.load(Dog.class, item.getId());
//                             assertThat(dog)
//                                     .isSameAs(item.getResult());
//                         }

//                         assertThat(s.advanced().getNumberOfRequests())
//                                 .isZero();

//                         semaphore.release();
//                     }
//                 });

//                 assertThat(semaphore.tryAcquire(15, TimeUnit.SECONDS))
//                         .isTrue();
//             }
//         }
//     }
// }