// public class CountersSingleNodeTest extends RemoteTestBase {
//     @Test
//    public void incrementCounter() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                session.store(user, "users/1-A");
//                session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation = new DocumentCountersOperation();
//            documentCountersOperation.setDocumentId("users/1-A");
//            documentCountersOperation.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, 0)));
//             CounterBatch counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             CountersDetail details = store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}));
//            long val = details.getCounters().get(0).getTotalValue();
//             assertThat(val)
//                    .isEqualTo(0);
//             documentCountersOperation = new DocumentCountersOperation();
//            documentCountersOperation.setDocumentId("users/1-A");
//            documentCountersOperation.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, 10)));
//             counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             details = store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}));
//            val = details.getCounters().get(0).getTotalValue();
//             assertThat(val)
//                    .isEqualTo(10);
//             documentCountersOperation = new DocumentCountersOperation();
//            documentCountersOperation.setDocumentId("users/1-A");
//            documentCountersOperation.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, -3)));
//             counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             details = store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}));
//            val = details.getCounters().get(0).getTotalValue();
//             assertThat(val)
//                    .isEqualTo(7);
//        }
//    }
//     @Test
//    public void getCounterValue() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                session.store(user, "users/1-A");
//                session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation = new DocumentCountersOperation();
//            documentCountersOperation.setDocumentId("users/1-A");
//            documentCountersOperation.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, 5)));
//             CounterBatch counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation));
//             CountersDetail a = store.operations().send(new CounterBatchOperation(counterBatch));
//             documentCountersOperation = new DocumentCountersOperation();
//            documentCountersOperation.setDocumentId("users/1-A");
//            documentCountersOperation.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, 10)));
//             counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation));
//             CountersDetail b = store.operations().send(new CounterBatchOperation(counterBatch));
//             CountersDetail details = store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}));
//            long val = details.getCounters().get(0).getTotalValue();
//             assertThat(val)
//                    .isEqualTo(15);
//         }
//    }
//     @Test
//    public void deleteCounter() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Aviv1");
//                 User user2 = new User();
//                user2.setName("Aviv2");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                 session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, 10)));
//             DocumentCountersOperation documentCountersOperation2 = new DocumentCountersOperation();
//            documentCountersOperation2.setDocumentId("users/2-A");
//            documentCountersOperation2.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.INCREMENT, 20)));
//             CounterBatch counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation1, documentCountersOperation2));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             DocumentCountersOperation deleteCounter = new DocumentCountersOperation();
//            deleteCounter.setDocumentId("users/1-A");
//            deleteCounter.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.DELETE)));
//             counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(deleteCounter));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             assertThat(store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}))
//                    .getCounters().size())
//                    .isEqualTo(0);
//             deleteCounter = new DocumentCountersOperation();
//            deleteCounter.setDocumentId("users/2-A");
//            deleteCounter.setOperations(Arrays.asList(CounterOperation.create("likes", CounterOperationType.DELETE)));
//             counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(deleteCounter));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             assertThat(store.operations().send(new GetCountersOperation("users/2-A", new String[]{"likes"}))
//                    .getCounters().size())
//                    .isEqualTo(0);
//        }
//    }
//     @Test
//    public void multiGet() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                session.store(user, "users/1-A");
//                session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.INCREMENT, 5),
//                    CounterOperation.create("dislikes", CounterOperationType.INCREMENT, 10)
//            ));
//             CounterBatch counterBatch = new CounterBatch();
//            counterBatch.setDocument(Arrays.asList(documentCountersOperation1));
//             store.operations().send(new CounterBatchOperation(counterBatch));
//             List<CounterDetail> counters = store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes", "dislikes"}))
//                    .getCounters();
//             assertThat(counters)
//                    .hasSize(2);
//             assertThat(counters.stream().filter(x -> x.getCounterName().equals("likes")).findFirst().get().getTotalValue())
//                    .isEqualTo(5);
//             assertThat(counters.stream().filter(x -> x.getCounterName().equals("dislikes")).findFirst().get().getTotalValue())
//                    .isEqualTo(10);
//        }
//    }
//     @Test
//    public void multiSetAndGetViaBatch() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Aviv");
//                 User user2 = new User();
//                user2.setName("Aviv2");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.INCREMENT, 5),
//                    CounterOperation.create("dislikes", CounterOperationType.INCREMENT, 10)
//            ));
//             DocumentCountersOperation documentCountersOperation2 = new DocumentCountersOperation();
//            documentCountersOperation2.setDocumentId("users/2-A");
//            documentCountersOperation2.setOperations(Arrays.asList(
//                    CounterOperation.create("rank", CounterOperationType.INCREMENT, 20)
//            ));
//             CounterBatch setBatch = new CounterBatch();
//            setBatch.setDocument(Arrays.asList(documentCountersOperation1, documentCountersOperation2));
//             store.operations().send(new CounterBatchOperation(setBatch));
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.GET),
//                    CounterOperation.create("dislikes", CounterOperationType.GET)
//            ));
//             documentCountersOperation2 = new DocumentCountersOperation();
//            documentCountersOperation2.setDocumentId("users/2-A");
//            documentCountersOperation2.setOperations(Arrays.asList(
//                    CounterOperation.create("rank", CounterOperationType.GET)
//            ));
//             CounterBatch getBatch = new CounterBatch();
//            getBatch.setDocument(Arrays.asList(documentCountersOperation1, documentCountersOperation2));
//             CountersDetail countersDetail = store.operations().send(new CounterBatchOperation(getBatch));
//             assertThat(countersDetail.getCounters())
//                    .hasSize(3);
//             assertThat(countersDetail.getCounters().get(0).getCounterName())
//                    .isEqualTo("likes");
//            assertThat(countersDetail.getCounters().get(0).getDocumentId())
//                    .isEqualTo("users/1-A");
//            assertThat(countersDetail.getCounters().get(0).getTotalValue())
//                    .isEqualTo(5);
//             assertThat(countersDetail.getCounters().get(1).getCounterName())
//                    .isEqualTo("dislikes");
//            assertThat(countersDetail.getCounters().get(1).getDocumentId())
//                    .isEqualTo("users/1-A");
//            assertThat(countersDetail.getCounters().get(1).getTotalValue())
//                    .isEqualTo(10);
//             assertThat(countersDetail.getCounters().get(2).getCounterName())
//                    .isEqualTo("rank");
//            assertThat(countersDetail.getCounters().get(2).getDocumentId())
//                    .isEqualTo("users/2-A");
//            assertThat(countersDetail.getCounters().get(2).getTotalValue())
//                    .isEqualTo(20);
//         }
//    }
//     @Test
//    public void deleteCreateWithSameNameDeleteAgain() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                session.store(user, "users/1-A");
//                session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.INCREMENT, 10)
//            ));
//             CounterBatch batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             assertThat(store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}))
//                    .getCounters()
//                    .get(0)
//                    .getTotalValue())
//                    .isEqualTo(10);
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.DELETE)
//            ));
//             batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             assertThat(store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}))
//                    .getCounters())
//                    .hasSize(0);
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.INCREMENT, 20)
//            ));
//             batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             assertThat(store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}))
//                    .getCounters()
//                    .get(0)
//                    .getTotalValue())
//                    .isEqualTo(20);
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.DELETE)
//            ));
//             batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             assertThat(store.operations().send(new GetCountersOperation("users/1-A", new String[]{"likes"}))
//                    .getCounters())
//                    .hasSize(0);
//        }
//    }
//     @Test
//    public void incrementAndDeleteShouldChangeDocumentMetadata() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                 session.store(user, "users/1-A");
//                session.saveChanges();
//            }
//             DocumentCountersOperation documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.INCREMENT, 10)
//            ));
//             CounterBatch batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             try (IDocumentSession session = store.openSession()) {
//                User user = session.load(User.class, "users/1-A");
//                IMetadataDictionary metadata = session.advanced().getMetadataFor(user);
//                 Object[] counters = (Object[]) metadata.get(Constants.Documents.Metadata.COUNTERS);
//                assertThat(counters)
//                        .hasSize(1);
//                assertThat(counters)
//                        .contains("likes");
//            }
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("votes", CounterOperationType.INCREMENT, 50)
//            ));
//             batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             try (IDocumentSession session = store.openSession()) {
//                User user = session.load(User.class, "users/1-A");
//                IMetadataDictionary metadata = session.advanced().getMetadataFor(user);
//                 Object[] counters = (Object[]) metadata.get(Constants.Documents.Metadata.COUNTERS);
//                assertThat(counters)
//                        .hasSize(2)
//                        .contains("likes")
//                        .contains("votes");
//            }
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("likes", CounterOperationType.DELETE)
//            ));
//             batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             try (IDocumentSession session = store.openSession()) {
//                User user = session.load(User.class, "users/1-A");
//                IMetadataDictionary metadata = session.advanced().getMetadataFor(user);
//                 Object[] counters = (Object[]) metadata.get(Constants.Documents.Metadata.COUNTERS);
//                assertThat(counters)
//                        .hasSize(1)
//                        .contains("votes");
//            }
//             documentCountersOperation1 = new DocumentCountersOperation();
//            documentCountersOperation1.setDocumentId("users/1-A");
//            documentCountersOperation1.setOperations(Arrays.asList(
//                    CounterOperation.create("votes", CounterOperationType.DELETE)
//            ));
//             batch = new CounterBatch();
//            batch.setDocument(Arrays.asList(documentCountersOperation1));
//            store.operations().send(new CounterBatchOperation(batch));
//             try (IDocumentSession session = store.openSession()) {
//                User user = session.load(User.class, "users/1-A");
//                IMetadataDictionary metadata = session.advanced().getMetadataFor(user);
//                 Object counters = metadata.get(Constants.Documents.Metadata.COUNTERS);
//                assertThat(counters)
//                        .isNull();
//            }
//        }
//    }
//     @Test
//    public void counterNameShouldPreserveCase() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                session.store(user, "users/1-A");
//                 session.countersFor("users/1-A").increment("Likes", 10);
//                session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                User user = session.load(User.class, "users/1-A");
//                Long val = session.countersFor(user).get("Likes");
//                assertThat(val)
//                        .isEqualTo(10);
//                 List<String> counters = session.advanced().getCountersFor(user);
//                assertThat(counters)
//                        .hasSize(1)
//                        .contains("Likes");
//            }
//        }
//    }
// }
