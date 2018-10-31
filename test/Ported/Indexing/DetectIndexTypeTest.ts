// package net.ravendb.client.test.client.indexing;
//  import com.google.common.collect.Sets;
// import net.ravendb.client.documents.indexes.IndexDefinition;
// import net.ravendb.client.documents.indexes.IndexType;
// import org.junit.jupiter.api.Test;
//  import static org.assertj.core.api.Assertions.assertThat;
//  public class DetectIndexTypeTest {
//      @Test
//     public void testValidMap() {
//         String map = "from task in docs.Tasks select new { task.assigneeId }";
//          assertThat(findIndexType(map))
//                 .isEqualTo(IndexType.MAP);
//     }
//      @Test
//     public void testMapSpaces() {
//         String map = "   from task in docs.Tasks select new { task.assigneeId }";
//          assertThat(findIndexType(map))
//                 .isEqualTo(IndexType.MAP);
//     }
//      @Test
//     public void testMapTabsBreaks() {
//         String map = " \r\r  \r\n  from task in docs.Tasks select new { task.assigneeId }";
//          assertThat(findIndexType(map))
//                 .isEqualTo(IndexType.MAP);
//     }
//      @Test
//     public void testMapComments() {
//         String map = "// this is comment \r\n from task in docs.Tasks select new { task.assigneeId }";
//          assertThat(findIndexType(map))
//                 .isEqualTo(IndexType.MAP);
//     }
//      @Test
//     public void testJsMap() {
//         String map = "map('Users', x => x)";
//          assertThat(findIndexType(map))
//                 .isEqualTo(IndexType.JAVA_SCRIPT_MAP);
//     }
//      @Test
//     public void testJsMapComment() {
//         String map = "//this is test\r\n  map('Users', x => x)";
//          assertThat(findIndexType(map))
//                 .isEqualTo(IndexType.JAVA_SCRIPT_MAP);
//     }
//      private static IndexType findIndexType(String map) {
//         IndexDefinition indexDefinition = new IndexDefinition();
//         indexDefinition.setMaps(Sets.newHashSet(map));
//          return indexDefinition.getType();
//      }
// }