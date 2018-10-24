// package net.ravendb.client.test.issues;

// import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.indexes.AbstractMultiMapIndexCreationTask;
// import net.ravendb.client.documents.indexes.FieldIndexing;
// import net.ravendb.client.documents.indexes.FieldStorage;
// import net.ravendb.client.documents.indexes.FieldTermVector;
// import net.ravendb.client.documents.queries.Query;
// import net.ravendb.client.documents.queries.highlighting.HighlightingOptions;
// import net.ravendb.client.documents.queries.highlighting.Highlightings;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.primitives.Reference;
// import net.ravendb.client.test.querying.HighlightesTest;
// import org.assertj.core.api.Assertions;
// import org.junit.jupiter.api.Test;

// import java.util.List;

// import static org.assertj.core.api.Assertions.assertThat;

// public class RavenDB_6558Test extends RemoteTestBase {

//     @Test
//     public void canUseDifferentPreAndPostTagsPerField() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 EventsItem eventsItem = new EventsItem();
//                 eventsItem.setSlug("ravendb-indexes-explained");
//                 eventsItem.setTitle("RavenDB indexes explained");
//                 eventsItem.setContent("Itamar Syn-Hershko: Afraid of Map/Reduce? In this session, core RavenDB developer Itamar Syn-Hershko will walk through the RavenDB indexing process, grok it and much more.");
//                 session.store(eventsItem, "items/1");
//                 session.saveChanges();
//             }

//             new ContentSearchIndex().execute(store);

//             HighlightingOptions options1 = new HighlightingOptions();
//             options1.setPreTags(new String[] { "***"});
//             options1.setPostTags(new String[] { "***" });

//             HighlightingOptions options2 = new HighlightingOptions();
//             options2.setPreTags(new String[] { "^^^" });
//             options2.setPostTags(new String[] { "^^^" });

//             try (IDocumentSession session = store.openSession()) {
//                 Reference<Highlightings> titleHighlighting = new Reference<>();
//                 Reference<Highlightings> contentHighlighting = new Reference<>();
//                 List<ISearchable> results = session.query(ISearchable.class, Query.index("ContentSearchIndex"))
//                         .waitForNonStaleResults()
//                         .highlight("title", 128, 2, options1, titleHighlighting)
//                         .highlight("content", 128, 2, options2, contentHighlighting)
//                         .search("title", "RavenDB").boost(12)
//                         .search("content", "RavenDB")
//                         .toList();

//                 assertThat(titleHighlighting.value.getFragments("items/1")[0])
//                         .contains("***");
//                 assertThat(contentHighlighting.value.getFragments("items/1")[0])
//                         .contains("^^^");
//             }
//         }
//     }

//     private interface ISearchable {
//         String getSlug();
//         void setSlug(String slug);

//         String getTitle();
//         void setTitle(String title);

//         String getContent();
//         void setContent(String content);
//     }

//     public static class EventsItem implements ISearchable {
//         private String id;
//         private String title;
//         private String slug;
//         private String content;

//         public String getId() {
//             return id;
//         }

//         public void setId(String id) {
//             this.id = id;
//         }

//         @Override
//         public String getTitle() {
//             return title;
//         }

//         @Override
//         public void setTitle(String title) {
//             this.title = title;
//         }

//         @Override
//         public String getSlug() {
//             return slug;
//         }

//         @Override
//         public void setSlug(String slug) {
//             this.slug = slug;
//         }

//         @Override
//         public String getContent() {
//             return content;
//         }

//         @Override
//         public void setContent(String content) {
//             this.content = content;
//         }
//     }

//     public static class SearchResults {
//         private ISearchable result;
//         private List<String> highlights;
//         private String title;

//         public ISearchable getResult() {
//             return result;
//         }

//         public void setResult(ISearchable result) {
//             this.result = result;
//         }

//         public List<String> getHighlights() {
//             return highlights;
//         }

//         public void setHighlights(List<String> highlights) {
//             this.highlights = highlights;
//         }

//         public String getTitle() {
//             return title;
//         }

//         public void setTitle(String title) {
//             this.title = title;
//         }
//     }

//     public static class ContentSearchIndex extends AbstractMultiMapIndexCreationTask {
//         public ContentSearchIndex() {

//             addMap("docs.EventsItems.Select(doc => new {\n" +
//                     "    doc = doc,\n" +
//                     "    slug = Id(doc).ToString().Substring(Id(doc).ToString().IndexOf('/') + 1)\n" +
//                     "}).Select(this0 => new {\n" +
//                     "    slug = this0.slug,\n" +
//                     "    title = this0.doc.title,\n" +
//                     "    content = this0.doc.content\n" +
//                     "})");

//             index("slug", FieldIndexing.SEARCH);
//             store("slug", FieldStorage.YES);
//             termVector("slug", FieldTermVector.WITH_POSITIONS_AND_OFFSETS);

//             index("title", FieldIndexing.SEARCH);
//             store("title", FieldStorage.YES);
//             termVector("title", FieldTermVector.WITH_POSITIONS_AND_OFFSETS);

//             index("content", FieldIndexing.SEARCH);
//             store("content", FieldStorage.YES);
//             termVector("content", FieldTermVector.WITH_POSITIONS_AND_OFFSETS);
//         }
//     }
// }