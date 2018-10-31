// package net.ravendb.client.test.client.indexing;
//  import net.ravendb.client.Constants;
// import net.ravendb.client.RemoteTestBase;
// import net.ravendb.client.documents.IDocumentStore;
// import net.ravendb.client.documents.indexes.AbstractJavaScriptIndexCreationTask;
// import net.ravendb.client.documents.indexes.FieldIndexing;
// import net.ravendb.client.documents.indexes.IndexFieldOptions;
// import net.ravendb.client.documents.session.IDocumentSession;
// import net.ravendb.client.infrastructure.entities.User;
// import org.junit.jupiter.api.Test;
// import org.mockito.internal.util.collections.Sets;
//  import java.util.HashMap;
// import java.util.List;
//  import static net.ravendb.client.documents.queries.Query.index;
// import static org.assertj.core.api.Assertions.assertThat;
//  public class JavaScriptIndexTest extends RemoteTestBase {
//      @Test
//     public void canUseJavaScriptIndex() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersByName());
//              try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                  session.store(user);
//                 session.saveChanges();
//             }
//              waitForIndexing(store);
//              try (IDocumentSession session = store.openSession()) {
//                 User single = session.query(User.class, index("UsersByName"))
//                         .whereEquals("name", "Brendan Eich")
//                         .single();
//                  assertThat(single)
//                         .isNotNull();
//             }
//         }
//     }
//      public static class UsersByName extends AbstractJavaScriptIndexCreationTask {
//         public UsersByName() {
//             setMaps(Sets.newSet("map('Users', function (u) { return { name: u.name, count: 1 } })"));
//         }
//     }
//      @Test
//     public void canUseJavaScriptIndexWithAdditionalSources() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersByNameWithAdditionalSources());
//              try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);
//                 session.saveChanges();
//                  waitForIndexing(store);
//                  session.query(User.class, index("UsersByNameWithAdditionalSources"))
//                         .whereEquals("name", "Mr. Brendan Eich")
//                         .single();
//              }
//         }
//     }
//      @Test
//     public void canIndexMapReduceWithFanout() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new FanoutByNumbersWithReduce());
//              try (IDocumentSession session = store.openSession()) {
//                 Fanout fanout1 = new Fanout();
//                 fanout1.setFoo("Foo");
//                 fanout1.setNumbers(new int[] { 4, 6, 11, 9 });
//                  Fanout fanout2 = new Fanout();
//                 fanout2.setFoo("Bar");
//                 fanout2.setNumbers(new int[] { 3, 8, 5, 17 });
//                  session.store(fanout1);
//                 session.store(fanout2);
//                 session.saveChanges();
//                  waitForIndexing(store);
//                  session.query(FanoutByNumbersWithReduce.Result.class, index("FanoutByNumbersWithReduce"))
//                         .whereEquals("sum", 33)
//                         .single();
//              }
//         }
//     }
//      @Test
//     public void canUseJavaScriptIndexWithDynamicFields() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersByNameAndAnalyzedName());
//              try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);
//                 session.saveChanges();
//                  waitForIndexing(store);
//                  session.query(User.class, index("UsersByNameAndAnalyzedName"))
//                         .ofType(UsersByNameAndAnalyzedName.Result.class)
//                         .search("analyzedName", "Brendan")
//                         .single();
//             }
//         }
//     }
//      @Test
//     public void canUseJavaScriptMultiMapIndex() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersAndProductsByName());
//              try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);
//                  Product product = new Product();
//                 product.setName("Shampoo");
//                 product.setAvailable(true);
//                 session.store(product);
//                  session.saveChanges();
//                  waitForIndexing(store);
//                  session.query(User.class, index("UsersAndProductsByName"))
//                         .whereEquals("name", "Brendan Eich")
//                         .single();
//             }
//         }
//     }
//      @Test
//     public void canUseJavaScriptMapReduceIndex() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersAndProductsByNameAndCount());
//              try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);
//                  Product product = new Product();
//                 product.setName("Shampoo");
//                 product.setAvailable(true);
//                 session.store(product);
//                  session.saveChanges();
//                  waitForIndexing(store);
//                  session.query(User.class, index("UsersAndProductsByNameAndCount"))
//                         .whereEquals("name", "Brendan Eich")
//                         .single();
//             }
//         }
//     }
//      @Test
//     public void outputReduceToCollection() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new Products_ByCategory());
//              try (IDocumentSession session = store.openSession()) {
//                 Category category1 = new Category();
//                 category1.setName("Beverages");
//                 session.store(category1, "categories/1-A");
//                  Category category2 = new Category();
//                 category2.setName("Seafood");
//                 session.store(category2, "categories/2-A");
//                  session.store(Product2.create("categories/1-A", "Lakkalikööri", 13));
//                 session.store(Product2.create("categories/1-A", "Original Frankfurter", 16));
//                 session.store(Product2.create("categories/2-A", "Röd Kaviar", 18));
//                  session.saveChanges();
//                  waitForIndexing(store);
//                  List<Products_ByCategory.Result> res = session.query(Products_ByCategory.Result.class, index("Products/ByCategory"))
//                         .toList();
//                  List<CategoryCount> res2 = session.query(CategoryCount.class)
//                         .toList();
//                  assertThat(res2.size())
//                         .isEqualTo(res.size());
//             }
//         }
//     }
//      public static class Category {
//         private String description;
//         private String name;
//          public String getDescription() {
//             return description;
//         }
//          public void setDescription(String description) {
//             this.description = description;
//         }
//          public String getName() {
//             return name;
//         }
//          public void setName(String name) {
//             this.name = name;
//         }
//     }
//      public static class Product2 {
//         private String category;
//         private String name;
//         private int pricePerUnit;
//          public String getCategory() {
//             return category;
//         }
//          public void setCategory(String category) {
//             this.category = category;
//         }
//          public String getName() {
//             return name;
//         }
//          public void setName(String name) {
//             this.name = name;
//         }
//          public int getPricePerUnit() {
//             return pricePerUnit;
//         }
//          public void setPricePerUnit(int pricePerUnit) {
//             this.pricePerUnit = pricePerUnit;
//         }
//          public static Product2 create(String category, String name, int pricePerUnit) {
//             Product2 product = new Product2();
//             product.setCategory(category);
//             product.setName(name);
//             product.setPricePerUnit(pricePerUnit);
//             return product;
//         }
//     }
//      public static class CategoryCount {
//         private String category;
//         private int count;
//          public String getCategory() {
//             return category;
//         }
//          public void setCategory(String category) {
//             this.category = category;
//         }
//          public int getCount() {
//             return count;
//         }
//          public void setCount(int count) {
//             this.count = count;
//         }
//     }
//      public static class Product {
//         private String name;
//         private boolean available;
//          public String getName() {
//             return name;
//         }
//          public void setName(String name) {
//             this.name = name;
//         }
//          public boolean isAvailable() {
//             return available;
//         }
//          public void setAvailable(boolean available) {
//             this.available = available;
//         }
//     }
//      public static class UsersByNameWithAdditionalSources extends AbstractJavaScriptIndexCreationTask {
//         public UsersByNameWithAdditionalSources() {
//             setMaps(Sets.newSet("map('Users', function(u) { return { name: mr(u.name)}; })"));
//              HashMap<String, String> additionalSources = new HashMap<>();
//             additionalSources.put("The Script", "function mr(x) { return 'Mr. ' + x; }");
//             setAdditionalSources(additionalSources);
//         }
//     }
//      public static class FanoutByNumbersWithReduce extends AbstractJavaScriptIndexCreationTask {
//         public FanoutByNumbersWithReduce() {
//             setMaps(Sets.newSet("map('Fanouts', function (f){\n" +
//                     "                                var result = [];\n" +
//                     "                                for(var i = 0; i < f.numbers.length; i++)\n" +
//                     "                                {\n" +
//                     "                                    result.push({\n" +
//                     "                                        foo: f.foo,\n" +
//                     "                                        sum: f.numbers[i]\n" +
//                     "                                    });\n" +
//                     "                                }\n" +
//                     "                                return result;\n" +
//                     "                                })"));
//              setReduce("groupBy(f => f.foo).aggregate(g => ({  foo: g.key, sum: g.values.reduce((total, val) => val.sum + total,0) }))");
//         }
//          public static class Result {
//             private String foo;
//             private int sum;
//              public String getFoo() {
//                 return foo;
//             }
//              public void setFoo(String foo) {
//                 this.foo = foo;
//             }
//              public int getSum() {
//                 return sum;
//             }
//              public void setSum(int sum) {
//                 this.sum = sum;
//             }
//         }
//     }
//      public static class UsersByNameAndAnalyzedName extends AbstractJavaScriptIndexCreationTask {
//         public UsersByNameAndAnalyzedName() {
//             setMaps(Sets.newSet("map('Users', function (u){\n" +
//                     "                                    return {\n" +
//                     "                                        Name: u.Name,\n" +
//                     "                                        _: {$value: u.Name, $name:'AnalyzedName', $options:{index: true, store: true}}\n" +
//                     "                                    };\n" +
//                     "                                })"));
//              HashMap<String, IndexFieldOptions> fieldOptions = new HashMap<>();
//             setFields(fieldOptions);
//              IndexFieldOptions indexFieldOptions = new IndexFieldOptions();
//             indexFieldOptions.setIndexing(FieldIndexing.SEARCH);
//             indexFieldOptions.setAnalyzer("StandardAnalyzer");
//             fieldOptions.put(Constants.Documents.Indexing.Fields.ALL_FIELDS, indexFieldOptions);
//          }
//          public static class Result {
//             private String analyzedName;
//              public String getAnalyzedName() {
//                 return analyzedName;
//             }
//              public void setAnalyzedName(String analyzedName) {
//                 this.analyzedName = analyzedName;
//             }
//         }
//     }
//      public static class UsersAndProductsByName extends AbstractJavaScriptIndexCreationTask {
//         public UsersAndProductsByName() {
//             setMaps(Sets.newSet("map('Users', function (u){ return { name: u.name, count: 1};})", "map('Products', function (p){ return { name: p.name, count: 1};})"));
//         }
//     }
//      public static class UsersAndProductsByNameAndCount extends AbstractJavaScriptIndexCreationTask {
//         public UsersAndProductsByNameAndCount() {
//             setMaps(Sets.newSet("map('Users', function (u){ return { name: u.name, count: 1};})", "map('Products', function (p){ return { name: p.name, count: 1};})"));
//             setReduce("groupBy( x =>  x.name )\n" +
//                     "                                .aggregate(g => {return {\n" +
//                     "                                    name: g.key,\n" +
//                     "                                    count: g.values.reduce((total, val) => val.count + total,0)\n" +
//                     "                               };})");
//         }
//     }
//      public static class Products_ByCategory extends AbstractJavaScriptIndexCreationTask {
//         public static class Result {
//             private String category;
//             private int count;
//              public String getCategory() {
//                 return category;
//             }
//              public void setCategory(String category) {
//                 this.category = category;
//             }
//              public int getCount() {
//                 return count;
//             }
//              public void setCount(int count) {
//                 this.count = count;
//             }
//         }
//          public Products_ByCategory() {
//             setMaps(Sets.newSet("map('products', function(p){\n" +
//                     "                        return {\n" +
//                     "                            category:\n" +
//                     "                            load(p.category, 'Categories').name,\n" +
//                     "                            count:\n" +
//                     "                            1\n" +
//                     "                        }\n" +
//                     "                    })"));
//              setReduce("groupBy( x => x.category )\n" +
//                     "                            .aggregate(g => {\n" +
//                     "                                return {\n" +
//                     "                                    category: g.key,\n" +
//                     "                                    count: g.values.reduce((count, val) => val.count + count, 0)\n" +
//                     "                               };})");
//              setOutputReduceToCollection("CategoryCounts");
//         }
//     }
//      public static class Fanout {
//         private String foo;
//         private int[] numbers;
//          public String getFoo() {
//             return foo;
//         }
//          public void setFoo(String foo) {
//             this.foo = foo;
//         }
//          public int[] getNumbers() {
//             return numbers;
//         }
//          public void setNumbers(int[] numbers) {
//             this.numbers = numbers;
//         }
//     }
//  }