// package net.ravendb.client.test.issues;

// import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.indexes.AbstractIndexCreationTask;
// import net.ravendb.client.documents.indexes.FieldStorage;
// import net.ravendb.client.documents.queries.explanation.ExplanationOptions;
// import net.ravendb.client.documents.queries.explanation.Explanations;
// import net.ravendb.client.documents.queries.timings.QueryTimings;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.infrastructure.entities.Company;
// import net.ravendb.client.primitives.Reference;
// import org.junit.jupiter.api.Test;

// import java.util.List;

// import static org.assertj.core.api.Assertions.assertThat;

// public class RavenDB_9587Test extends RemoteTestBase {

//     @Test
//     public void timingsShouldWork() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company c1 = new Company();
//                 c1.setName("CF");

//                 Company c2 = new Company();
//                 c2.setName("HR");

//                 session.store(c1);
//                 session.store(c2);
//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Reference<QueryTimings> timingsReference = new Reference<>();

//                 List<Company> companies = session
//                         .query(Company.class)
//                         .timings(timingsReference)
//                         .whereNotEquals("name", "HR")
//                         .toList();

//                 assertThat(timingsReference.value.getDurationInMs())
//                         .isGreaterThan(0);
//                 assertThat(timingsReference.value.getTimings())
//                         .isNotNull();
//             }
//         }
//     }
// }