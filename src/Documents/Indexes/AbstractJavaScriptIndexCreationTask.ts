// package net.ravendb.client.documents.indexes;
//  import java.util.HashMap;
// import java.util.Map;
// import java.util.Set;
//  public class AbstractJavaScriptIndexCreationTask extends AbstractIndexCreationTask {
//      private final IndexDefinition _definition = new IndexDefinition();
//      protected AbstractJavaScriptIndexCreationTask() {
//         _definition.setLockMode(IndexLockMode.UNLOCK);
//         _definition.setPriority(IndexPriority.NORMAL);
//     }
//      public Set<String> getMaps() {
//         return _definition.getMaps();
//     }
//      public void setMaps(Set<String> maps) {
//         _definition.setMaps(maps);
//     }
//      public Map<String, IndexFieldOptions> getFields() {
//         return _definition.getFields();
//     }
//      public void setFields(Map<String, IndexFieldOptions> fields) {
//         _definition.setFields(fields);
//     }
//      protected String getReduce() {
//         return _definition.getReduce();
//     }
//      protected void setReduce(String reduce) {
//         _definition.setReduce(reduce);
//     }
//      public IndexConfiguration getConfiguration() {
//         return _definition.getConfiguration();
//     }
//      public void setConfiguration(IndexConfiguration configuration) {
//         _definition.setConfiguration(configuration);
//     }
//      @Override
//     public boolean isMapReduce() {
//         return getReduce() != null;
//     }
//      protected String getOutputReduceToCollection() {
//         return _definition.getOutputReduceToCollection();
//     }
//      protected void setOutputReduceToCollection(String outputReduceToCollection) {
//         _definition.setOutputReduceToCollection(outputReduceToCollection);
//     }
//      @Override
//     public IndexDefinition createIndexDefinition() {
//         _definition.setType(isMapReduce() ? IndexType.JAVA_SCRIPT_MAP_REDUCE : IndexType.JAVA_SCRIPT_MAP);
//         if (getAdditionalSources() != null) {
//             _definition.setAdditionalSources(getAdditionalSources());
//         } else {
//             _definition.setAdditionalSources(new HashMap<>());
//         }
//         return _definition;
//     }
// }
