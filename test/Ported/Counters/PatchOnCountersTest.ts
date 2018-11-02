// public class PatchOnCountersTest extends RemoteTestBase {
//     @Test
//    public void canIncrementSingleCounter() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user = new User();
//                user.setName("Aviv");
//                 session.store(user, "users/1-A");
//                 session.countersFor("users/1-A")
//                        .increment("Downloads", 100);
//                session.saveChanges();
//            }
//             PatchRequest patch1 = new PatchRequest();
//            patch1.setScript("incrementCounter(this, args.name, args.val)");
//            Map<String, Object> values = new HashMap<>();
//            values.put("name", "Downloads");
//            values.put("val", 100);
//            patch1.setValues(values);
//            store.operations().send(new PatchOperation("users/1-A", null, patch1));
//             assertThat(store.operations().send(new GetCountersOperation("users/1-A", new String[] { "Downloads" }))
//                .getCounters().get(0).getTotalValue())
//                    .isEqualTo(200);
//        }
//    }
// }