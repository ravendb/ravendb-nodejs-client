// package net.ravendb.client.test.issues;

// import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.operations.DatabaseStatistics;
// import net.ravendb.client.documents.operations.GetStatisticsOperation;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.exceptions.ConcurrencyException;
// import net.ravendb.client.infrastructure.entities.Company;
// import org.assertj.core.api.Assertions;
// import org.junit.jupiter.api.Test;

// import java.io.ByteArrayInputStream;

// import static org.assertj.core.api.Assertions.assertThat;
// import static org.assertj.core.api.Assertions.assertThatThrownBy;

// public class RavenDB_11058Test extends RemoteTestBase {

//     @Test
//     public void canCopyAttachment() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");

//                 session.store(company, "companies/1");

//                 ByteArrayInputStream bais1 = new ByteArrayInputStream(new byte[]{ 1, 2, 3});
//                 session.advanced().attachments().store(company, "file1", bais1);

//                 ByteArrayInputStream bais2 = new ByteArrayInputStream(new byte[]{ 3, 2, 1 });
//                 session.advanced().attachments().store(company, "file10", bais2);

//                 session.saveChanges();
//             }


//             DatabaseStatistics stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);

//             try (IDocumentSession session = store.openSession()) {
//                 Company newCompany = new Company();
//                 newCompany.setName("CF");

//                 session.store(newCompany, "companies/2");

//                 Company oldCompany = session.load(Company.class, "companies/1");
//                 session.advanced().attachments().copy(oldCompany, "file1", newCompany, "file2");
//                 session.saveChanges();
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(3);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);

//             try (IDocumentSession session = store.openSession()) {
//                 assertThat(session.advanced().attachments().exists("companies/1", "file1"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file2"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file10"))
//                         .isTrue();

//                 assertThat(session.advanced().attachments().exists("companies/2", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file2"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file10"))
//                         .isFalse();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 session.advanced().attachments().copy("companies/1", "file1", "companies/2", "file3");
//                 session.saveChanges();
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(4);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);

//             try (IDocumentSession session = store.openSession()) {
//                 assertThat(session.advanced().attachments().exists("companies/1", "file1"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file2"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file3"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file10"))
//                         .isTrue();

//                 assertThat(session.advanced().attachments().exists("companies/2", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file2"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file3"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file10"))
//                         .isFalse();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 session.advanced().attachments().copy("companies/1", "file1", "companies/2", "file3"); //should throw

//                 assertThatThrownBy(() -> {
//                     session.saveChanges();
//                 }).isExactlyInstanceOf(ConcurrencyException.class);
//             }

//         }
//     }

//     @Test
//     public void canMoveAttachment() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");

//                 session.store(company, "companies/1");

//                 ByteArrayInputStream bais1 = new ByteArrayInputStream(new byte[]{ 1, 2, 3});
//                 session.advanced().attachments().store(company, "file1", bais1);

//                 ByteArrayInputStream bais2 = new ByteArrayInputStream(new byte[]{ 3, 2, 1 });
//                 session.advanced().attachments().store(company, "file10", bais2);

//                 ByteArrayInputStream bais3 = new ByteArrayInputStream(new byte[]{ 4, 5, 6 });
//                 session.advanced().attachments().store(company, "file20", bais3);

//                 session.saveChanges();
//             }

//             DatabaseStatistics stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(3);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(3);

//             try (IDocumentSession session = store.openSession()) {
//                 Company newCompany = new Company();
//                 newCompany.
//                         setName("CF");

//                 session.store(newCompany, "companies/2");

//                 Company oldCompany = session.load(Company.class, "companies/1");

//                 session.advanced().attachments().move(oldCompany, "file1", newCompany, "file2");
//                 session.saveChanges();
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(3);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(3);

//             try (IDocumentSession session = store.openSession()) {
//                 assertThat(session.advanced().attachments().exists("companies/1", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file2"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file10"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file20"))
//                         .isTrue();


//                 assertThat(session.advanced().attachments().exists("companies/2", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file2"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file10"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file20"))
//                         .isFalse();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 session.advanced().attachments().move("companies/1", "file10", "companies/2", "file3");
//                 session.saveChanges();
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(3);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(3);

//             try (IDocumentSession session = store.openSession()) {
//                 assertThat(session.advanced().attachments().exists("companies/1", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file2"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file3"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file10"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1", "file20"))
//                         .isTrue();


//                 assertThat(session.advanced().attachments().exists("companies/2", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file2"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file3"))
//                         .isTrue();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file10"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/2", "file20"))
//                         .isFalse();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 session.advanced().attachments().move("companies/1", "file20", "companies/2", "file3"); //should throw

//                 assertThatThrownBy(() -> {
//                     session.saveChanges();
//                 }).isExactlyInstanceOf(ConcurrencyException.class);
//             }
//         }
//     }

//     @Test
//     public void canRenameAttachment() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");

//                 session.store(company, "companies/1-A");

//                 ByteArrayInputStream bais1 = new ByteArrayInputStream(new byte[]{ 1, 2, 3});
//                 session.advanced().attachments().store(company, "file1", bais1);

//                 ByteArrayInputStream bais2 = new ByteArrayInputStream(new byte[]{ 3, 2, 1 });
//                 session.advanced().attachments().store(company, "file10", bais2);

//                 session.saveChanges();
//             }

//             DatabaseStatistics stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);

//             try (IDocumentSession session = store.openSession()) {
//                 Company company = session.load(Company.class, "companies/1-A");
//                 session.advanced().attachments().rename(company, "file1", "file2");
//                 session.saveChanges();
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);

//             try (IDocumentSession session = store.openSession()) {
//                 assertThat(session.advanced().attachments().exists("companies/1-A", "file1"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1-A", "file2"))
//                         .isTrue();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Company company = session.load(Company.class, "companies/1-A");
//                 session.advanced().attachments().rename(company, "file2", "file3");
//                 session.saveChanges();
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);

//             try (IDocumentSession session = store.openSession()) {
//                 assertThat(session.advanced().attachments().exists("companies/1-A", "file2"))
//                         .isFalse();
//                 assertThat(session.advanced().attachments().exists("companies/1-A", "file3"))
//                         .isTrue();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Company company = session.load(Company.class, "companies/1-A");
//                 session.advanced().attachments().rename(company, "file3", "file10"); // should throw
//                 assertThatThrownBy(() -> session.saveChanges())
//                         .isExactlyInstanceOf(ConcurrencyException.class);
//             }

//             stats = store.maintenance().send(new GetStatisticsOperation());
//             assertThat(stats.getCountOfAttachments())
//                     .isEqualTo(2);
//             assertThat(stats.getCountOfUniqueAttachments())
//                     .isEqualTo(2);
//         }
//     }
// }