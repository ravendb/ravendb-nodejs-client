// package net.ravendb.client.test.querying;

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
// import org.junit.jupiter.api.Test;

// import java.util.ArrayList;
// import java.util.Arrays;
// import java.util.List;

// public class HighlightesTest extends RemoteTestBase {

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

//     @Test
//     public void searchWithHighlights() throws Exception {
//         String q = "session";

//         try (IDocumentStore store = getDocumentStore()) {

//             try (IDocumentSession session = store.openSession()) {
//                 EventsItem eventsItem = new EventsItem();
//                 eventsItem.setSlug("ravendb-indexes-explained");
//                 eventsItem.setTitle("RavenDB indexes explained");
//                 eventsItem.setContent("Itamar Syn-Hershko: Afraid of Map/Reduce? In this session, core RavenDB developer Itamar Syn-Hershko will walk through the RavenDB indexing process, grok it and much more.");
//                 session.store(eventsItem);
//                 session.saveChanges();
//             }

//             new ContentSearchIndex().execute(store);

//             try (IDocumentSession session = store.openSession()) {
//                 HighlightingOptions options = new HighlightingOptions();
//                 options.setPreTags(new String[] { "<span style='background: yellow'>" });
//                 options.setPostTags(new String[] { "</span>" });

//                 Reference<Highlightings> titleHighlighting = new Reference<>();
//                 Reference<Highlightings> slugHighlighting = new Reference<>();
//                 Reference<Highlightings> contentHighlighting = new Reference<>();


//                 List<ISearchable> results = session.query(ISearchable.class, Query.index("ContentSearchIndex"))
//                         .waitForNonStaleResults()
//                         .highlight("title", 128, 2, options, titleHighlighting)
//                         .highlight("slug", 128, 2, options, slugHighlighting)
//                         .highlight("content", 128, 2, options, contentHighlighting)
//                         .search("slug", q).boost(15)
//                         .search("title", q).boost(12)
//                         .search("content", q)
//                         .toList();

//                 List<SearchResults> orderedResults = new ArrayList<>();
//                 for (ISearchable searchable : results) {
//                     String docId = session.advanced().getDocumentId(searchable);

//                     List<String> highlights = new ArrayList<>();

//                     String title = null;
//                     String[] titles = titleHighlighting.value.getFragments(docId);
//                     if (titles.length == 1) {
//                         title = titles[0];
//                     } else {
//                         highlights.addAll(Arrays.asList(titleHighlighting.value.getFragments(docId)));
//                     }

//                     highlights.addAll(Arrays.asList(slugHighlighting.value.getFragments(docId)));
//                     highlights.addAll(Arrays.asList(contentHighlighting.value.getFragments(docId)));

//                     SearchResults searchResults = new SearchResults();
//                     searchResults.setResult(searchable);
//                     searchResults.setHighlights(highlights);
//                     searchResults.setTitle(title);
//                     orderedResults.add(searchResults);
//                 }
//             }
//         }
//     }
// }