// package net.ravendb.client.test.issues;

// import com.fasterxml.jackson.databind.JsonNode;
// import com.google.common.base.Stopwatch;
// import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.ReplicationTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.commands.QueryCommand;
// import net.ravendb.client.documents.conventions.DocumentConventions;
// import net.ravendb.client.documents.indexes.AbstractIndexCreationTask;
// import net.ravendb.client.documents.indexes.FieldStorage;
// import net.ravendb.client.documents.queries.IndexQuery;
// import net.ravendb.client.documents.queries.QueryResult;
// import net.ravendb.client.documents.queries.explanation.ExplanationOptions;
// import net.ravendb.client.documents.queries.explanation.Explanations;
// import net.ravendb.client.documents.session.IDocumentQuery;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.exceptions.ConflictException;
// import net.ravendb.client.exceptions.documents.DocumentConflictException;
// import net.ravendb.client.extensions.JsonExtensions;
// import net.ravendb.client.infrastructure.entities.Address;
// import net.ravendb.client.infrastructure.entities.Company;
// import net.ravendb.client.infrastructure.entities.User;
// import net.ravendb.client.primitives.Reference;
// import net.ravendb.client.serverwide.ConflictSolver;
// import net.ravendb.client.serverwide.DatabaseRecord;
// import org.junit.jupiter.api.Test;

// import java.util.Collections;
// import java.util.List;
// import java.util.concurrent.TimeUnit;
// import java.util.function.Consumer;

// import static org.assertj.core.api.Assertions.assertThat;
// import static org.assertj.core.api.Assertions.assertThatThrownBy;

// public class RavenDB_9745Test extends RemoteTestBase {


//     @Test
//     public void explain() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             new Companies_ByName().execute(store);

//             try (IDocumentSession session = store.openSession()) {
//                 Company company1 = new Company();
//                 company1.setName("Micro");

//                 Company company2 = new Company();
//                 company2.setName("Microsoft");

//                 Company company3 = new Company();
//                 company3.setName("Google");

//                 session.store(company1);
//                 session.store(company2);
//                 session.store(company3);

//                 session.saveChanges();
//             }

//             waitForIndexing(store);

//             try (IDocumentSession session = store.openSession()) {
//                 Reference<Explanations> explanationsReference = new Reference<>();
//                 List<Company> companies = session
//                         .advanced()
//                         .documentQuery(Company.class)
//                         .includeExplanations(explanationsReference)
//                         .search("name", "Micro*")
//                         .toList();

//                 assertThat(companies)
//                         .hasSize(2);

//                 String[] exp = explanationsReference.value.getExplanations(companies.get(0).getId());
//                 assertThat(exp)
//                         .isNotNull();

//                 exp = explanationsReference.value.getExplanations(companies.get(1).getId());
//                 assertThat(exp)
//                         .isNotNull();
//             }

//             try (IDocumentSession session = store.openSession()) {

//                 ExplanationOptions options = new ExplanationOptions();
//                 options.setGroupKey("key");

//                 Reference<Explanations> explanationsReference = new Reference<>();

//                 List<Companies_ByName.Result> results = session
//                         .advanced()
//                         .documentQuery(Companies_ByName.Result.class, Companies_ByName.class)
//                         .includeExplanations(options, explanationsReference)
//                         .toList();

//                 assertThat(results)
//                         .hasSize(3);

//                 String[] exp = explanationsReference.value.getExplanations(results.get(0).getKey());
//                 assertThat(exp)
//                         .isNotNull();

//                 exp = explanationsReference.value.getExplanations(results.get(1).getKey());
//                 assertThat(exp)
//                         .isNotNull();

//                 exp = explanationsReference.value.getExplanations(results.get(2).getKey());
//                 assertThat(exp)
//                         .isNotNull();
//             }
//         }
//     }

//     public static class Companies_ByName extends AbstractIndexCreationTask {
//         public static class Result {
//             private String key;
//             private long count;

//             public String getKey() {
//                 return key;
//             }

//             public void setKey(String key) {
//                 this.key = key;
//             }

//             public long getCount() {
//                 return count;
//             }

//             public void setCount(long count) {
//                 this.count = count;
//             }
//         }

//         public Companies_ByName() {
//             map = "from c in docs.Companies select new { key = c.name, count = 1 }";

//             reduce = "from result in results " +
//                     "group result by result.key " +
//                     "into g " +
//                     "select new " +
//                     "{ " +
//                     "  key = g.Key, " +
//                     "  count = g.Sum(x => x.count) " +
//                     "}";

//             store("key", FieldStorage.YES);
//         }
//     }
// }