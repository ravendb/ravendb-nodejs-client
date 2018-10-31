// package net.ravendb.client.test.issues;
//  import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.session.DocumentsChanges;
// import net.ravendb.client.documents.session.IDocumentSession;
// import org.junit.jupiter.api.Test;
//  import java.util.List;
// import java.util.Map;
// import java.util.stream.Collectors;
//  import static org.assertj.core.api.Assertions.assertThat;
//  public class RavenDB_11649Test extends RemoteTestBase {
//      public static class OuterClass {
//         private InnerClass[][] innerClassMatrix;
//         private InnerClass[] innerClasses;
//         private String a;
//         private InnerClass innerClass;
//         private MiddleClass middleClass;
//          public InnerClass[][] getInnerClassMatrix() {
//             return innerClassMatrix;
//         }
//          public void setInnerClassMatrix(InnerClass[][] innerClassMatrix) {
//             this.innerClassMatrix = innerClassMatrix;
//         }
//          public InnerClass[] getInnerClasses() {
//             return innerClasses;
//         }
//          public void setInnerClasses(InnerClass[] innerClasses) {
//             this.innerClasses = innerClasses;
//         }
//          public String getA() {
//             return a;
//         }
//          public void setA(String a) {
//             this.a = a;
//         }
//          public InnerClass getInnerClass() {
//             return innerClass;
//         }
//          public void setInnerClass(InnerClass innerClass) {
//             this.innerClass = innerClass;
//         }
//          public MiddleClass getMiddleClass() {
//             return middleClass;
//         }
//          public void setMiddleClass(MiddleClass middleClass) {
//             this.middleClass = middleClass;
//         }
//     }
//      public static class InnerClass {
//         private String a;
//          public String getA() {
//             return a;
//         }
//          public void setA(String a) {
//             this.a = a;
//         }
//     }
//      public static class MiddleClass {
//         private InnerClass a;
//          public InnerClass getA() {
//             return a;
//         }
//          public void setA(InnerClass a) {
//             this.a = a;
//         }
//     }
//      @Test
//     public void whatChanged_WhenInnerPropertyChanged_ShouldReturnThePropertyNamePlusPath() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                 doc.setA("outerValue");
//                 InnerClass innerClass = new InnerClass();
//                 doc.setInnerClass(innerClass);
//                  String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.getInnerClass().setA("newInnerValue");
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("innerClass");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenInnerPropertyChangedFromNull_ShouldReturnThePropertyNamePlusPath() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                 doc.setA("outerValue");
//                  InnerClass innerClass = new InnerClass();
//                 doc.setInnerClass(innerClass);
//                 innerClass.setA(null);
//                  String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.getInnerClass().setA("newInnerValue");
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("innerClass");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenPropertyOfInnerPropertyChangedToNull_ShouldReturnThePropertyNamePlusPath() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                 doc.setA("outerValue");
//                 InnerClass innerClass = new InnerClass();
//                 innerClass.setA("innerValue");
//                 doc.setInnerClass(innerClass);
//                  String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.getInnerClass().setA(null);
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("innerClass");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenOuterPropertyChanged_FieldPathShouldBeEmpty() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                  // arrange
//                 OuterClass doc = new OuterClass();
//                 doc.setA("outerValue");
//                 InnerClass innerClass = new InnerClass();
//                 innerClass.setA("innerClass");
//                 doc.setInnerClass(innerClass);
//                  String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.setA("newOuterValue");
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenInnerPropertyInArrayChanged_ShouldReturnWithRelevantPath() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                 doc.setA("outerValue");
//                 InnerClass innerClass = new InnerClass();
//                 innerClass.setA("innerValue");
//                 doc.setInnerClasses(new InnerClass[] { innerClass });
//                  String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.getInnerClasses()[0].setA("newInnerValue");
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("innerClasses[0]");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenArrayPropertyInArrayChangedFromNull_ShouldReturnWithRelevantPath() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                  doc.setInnerClassMatrix(new InnerClass[][]{ new InnerClass[] {  }});
//                 String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.getInnerClassMatrix()[0] = new InnerClass[] { new InnerClass() };
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("innerClassMatrix[0]");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenInMatrixChanged_ShouldReturnWithRelevantPath() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                  InnerClass innerClass = new InnerClass();
//                 innerClass.setA("oldValue");
//                  doc.setInnerClassMatrix(new InnerClass[][]{ new InnerClass[] { innerClass }});
//                 String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.getInnerClassMatrix()[0][0].setA("newValue");
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactly("innerClassMatrix[0][0]");
//             }
//         }
//     }
//      @Test
//     public void whatChanged_WhenAllNamedAPropertiesChanged_ShouldReturnDifferentPaths() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 // arrange
//                 OuterClass doc = new OuterClass();
//                 doc.setA("outerValue");
//                  InnerClass innerClass = new InnerClass();
//                 innerClass.setA("innerValue");
//                 doc.setInnerClass(innerClass);
//                  doc.setMiddleClass(new MiddleClass());
//                  InnerClass innerClass2 = new InnerClass();
//                 innerClass2.setA("oldValue");
//                  doc.setInnerClasses(new InnerClass[]{ innerClass2 });
//                  InnerClass innerClass3 = new InnerClass();
//                 innerClass3.setA("oldValue");
//                 doc.setInnerClassMatrix(new InnerClass[][] { new InnerClass[] { innerClass3 }});
//                  String id = "docs/1";
//                 session.store(doc, id);
//                 session.saveChanges();
//                  doc.setA("newOuterValue");
//                 doc.getInnerClass().setA("newInnerValue");
//                 doc.getMiddleClass().setA(new InnerClass());
//                 doc.getInnerClasses()[0].setA("newValue");
//                 doc.getInnerClassMatrix()[0][0].setA("newValue");
//                  // action
//                 Map<String, List<DocumentsChanges>> changes = session.advanced().whatChanged();
//                  // assert
//                 List<String> changedPaths = changes.get(id)
//                         .stream()
//                         .map(x -> x.getFieldPath())
//                         .collect(Collectors.toList());
//                  assertThat(changedPaths)
//                         .containsExactlyInAnyOrder("", "innerClass", "middleClass", "innerClasses[0]", "innerClassMatrix[0][0]");
//             }
//         }
//     }
// }