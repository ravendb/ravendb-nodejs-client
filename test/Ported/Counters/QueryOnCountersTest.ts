// public class QueryOnCountersTest extends RemoteTestBase {
//     @Test
//    public void rawQuerySelectSingleCounter() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Jerry");
//                 User user2 = new User();
//                user2.setName("Bob");
//                 User user3 = new User();
//                user3.setName("Pigpen");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                session.store(user3, "users/3-A");
//                 session.countersFor("users/1-A").increment("Downloads", 100);
//                session.countersFor("users/2-A").increment("Downloads", 200);
//                session.countersFor("users/3-A").increment("Likes", 300);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                List<CounterResult> query = session
//                        .advanced()
//                        .rawQuery(CounterResult.class, "from users select counter(\"Downloads\") as downloads")
//                        .toList();
//                 assertThat(query)
//                        .hasSize(3);
//                 assertThat(query.get(0).getDownloads())
//                        .isEqualTo(100);
//                assertThat(query.get(1).getDownloads())
//                        .isEqualTo(200);
//                assertThat(query.get(2).getDownloads())
//                        .isNull();
//            }
//        }
//    }
//     @Test
//    public void rawQuerySelectSingleCounterWithDocAlias() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Jerry");
//                 User user2 = new User();
//                user2.setName("Bob");
//                 User user3 = new User();
//                user3.setName("Pigpen");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                session.store(user3, "users/3-A");
//                 session.countersFor("users/1-A").increment("Downloads", 100);
//                session.countersFor("users/2-A").increment("Downloads", 200);
//                session.countersFor("users/3-A").increment("Likes", 300);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                List<CounterResult> query = session
//                        .advanced()
//                        .rawQuery(CounterResult.class, "from users as u select counter(u, \"Downloads\") as downloads")
//                        .toList();
//                 assertThat(query)
//                        .hasSize(3);
//                 assertThat(query.get(0).getDownloads())
//                        .isEqualTo(100);
//                assertThat(query.get(1).getDownloads())
//                        .isEqualTo(200);
//                assertThat(query.get(2).getDownloads())
//                        .isNull();
//            }
//        }
//    }
//     @Test
//    public void rawQuerySelectMultipleCounters() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Jerry");
//                 User user2 = new User();
//                user2.setName("Bob");
//                 User user3 = new User();
//                user3.setName("Pigpen");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                session.store(user3, "users/3-A");
//                 session.countersFor("users/1-A").increment("downloads", 100);
//                session.countersFor("users/1-A").increment("likes", 200);
//                 session.countersFor("users/2-A").increment("downloads", 400);
//                session.countersFor("users/2-A").increment("likes", 800);
//                 session.countersFor("users/3-A").increment("likes", 1600);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                List<CounterResult> query = session.advanced().rawQuery(CounterResult.class, "from users select counter(\"downloads\"), counter(\"likes\")")
//                        .toList();
//                 assertThat(query)
//                        .hasSize(3);
//                 assertThat(query.get(0).downloads)
//                        .isEqualTo(100);
//                assertThat(query.get(0).likes)
//                        .isEqualTo(200);
//                 assertThat(query.get(1).downloads)
//                        .isEqualTo(400);
//                assertThat(query.get(1).likes)
//                        .isEqualTo(800);
//                 assertThat(query.get(2).downloads)
//                        .isNull();
//                assertThat(query.get(2).likes)
//                        .isEqualTo(1600);
//            }
//        }
//    }
//     @Test
//    public void rawQuerySimpleProjectionWithCounter() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Jerry");
//                 User user2 = new User();
//                user2.setName("Bob");
//                 User user3 = new User();
//                user3.setName("Pigpen");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                session.store(user3, "users/3-A");
//                 session.countersFor("users/1-A").increment("downloads", 100);
//                session.countersFor("users/2-A").increment("downloads", 200);
//                session.countersFor("users/3-A").increment("likes", 400);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                List<CounterResult> query = session.advanced().rawQuery(CounterResult.class, "from users select name, counter('downloads')")
//                        .toList();
//                 assertThat(query)
//                        .hasSize(3);
//                 assertThat(query.get(0).getName())
//                        .isEqualTo("Jerry");
//                assertThat(query.get(0).getDownloads())
//                        .isEqualTo(100);
//                 assertThat(query.get(1).getName())
//                        .isEqualTo("Bob");
//                assertThat(query.get(1).getDownloads())
//                        .isEqualTo(200);
//                 assertThat(query.get(2).getName())
//                        .isEqualTo("Pigpen");
//                assertThat(query.get(2).getDownloads())
//                        .isNull();
//            }
//        }
//    }
//     @Test
//    public void rawQueryJsProjectionWithCounterRawValues() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                User user1 = new User();
//                user1.setName("Jerry");
//                 User user2 = new User();
//                user2.setName("Bob");
//                 User user3 = new User();
//                user3.setName("Pigpen");
//                 session.store(user1, "users/1-A");
//                session.store(user2, "users/2-A");
//                session.store(user3, "users/3-A");
//                 session.countersFor("users/1-A").increment("downloads", 100);
//                session.countersFor("users/1-A").increment("likes", 200);
//                 session.countersFor("users/2-A").increment("downloads", 300);
//                session.countersFor("users/2-A").increment("likes", 400);
//                 session.countersFor("users/3-A").increment("likes", 500);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                List<CounterResult4> query = session
//                        .advanced()
//                        .rawQuery(CounterResult4.class, "from Users as u select { name: u.name, downloads: counter(u, 'downloads'), likes: counterRaw(u, 'likes') }")
//                        .toList();
//                 assertThat(query)
//                        .hasSize(3);
//                 assertThat(query.get(0).getName())
//                        .isEqualTo("Jerry");
//                assertThat(query.get(0).getDownloads())
//                        .isEqualTo(100);
//                assertThat(query.get(0).getLikes().values().iterator().next())
//                        .isEqualTo(200);
//                 assertThat(query.get(1).getName())
//                        .isEqualTo("Bob");
//                assertThat(query.get(1).getDownloads())
//                        .isEqualTo(300);
//                assertThat(query.get(1).getLikes().values().iterator().next())
//                        .isEqualTo(400);
//                 assertThat(query.get(2).getName())
//                        .isEqualTo("Pigpen");
//                assertThat(query.get(2).getLikes().values().iterator().next())
//                        .isEqualTo(500);
//                assertThat(query.get(2).getDownloads())
//                        .isNull();
//            }
//        }
//    }
//     @Test
//    public void sessionQueryIncludeSingleCounter() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                Order order1 = new Order();
//                order1.setCompany("companies/1-A");
//                session.store(order1, "orders/1-A");
//                 Order order2 = new Order();
//                order2.setCompany("companies/2-A");
//                session.store(order2, "orders/2-A");
//                 Order order3 = new Order();
//                order3.setCompany("companies/3-A");
//                session.store(order3, "orders/3-A");
//                 session.countersFor("orders/1-A").increment("downloads", 100);
//                session.countersFor("orders/2-A").increment("downloads", 200);
//                session.countersFor("orders/3-A").increment("downloads", 300);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                IDocumentQuery<Order> query = session.query(Order.class)
//                        .include(i -> i.includeCounter("downloads"));
//                 assertThat(query.toString())
//                        .isEqualTo("from Orders include counters($p0)");
//                 List<Order> queryResult = query.toList();
//                assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//                 Order order = queryResult.get(0);
//                assertThat(order.getId())
//                        .isEqualTo("orders/1-A");
//                 Long val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(100);
//                 order = queryResult.get(1);
//                assertThat(order.getId())
//                        .isEqualTo("orders/2-A");
//                val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(200);
//                 order = queryResult.get(2);
//                assertThat(order.getId())
//                        .isEqualTo("orders/3-A");
//                val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(300);
//                 assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//            }
//        }
//    }
//     @Test
//    public void sessionQueryIncludeMultipleCounters() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                Order order1 = new Order();
//                order1.setCompany("companies/1-A");
//                session.store(order1, "orders/1-A");
//                 Order order2 = new Order();
//                order2.setCompany("companies/2-A");
//                session.store(order2, "orders/2-A");
//                 Order order3 = new Order();
//                order3.setCompany("companies/3-A");
//                session.store(order3, "orders/3-A");
//                 session.countersFor("orders/1-A").increment("downloads", 100);
//                session.countersFor("orders/2-A").increment("downloads", 200);
//                session.countersFor("orders/3-A").increment("downloads", 300);
//                 session.countersFor("orders/1-A").increment("likes", 1000);
//                session.countersFor("orders/2-A").increment("likes", 2000);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                IDocumentQuery<Order> query = session.query(Order.class)
//                        .include(i -> i.includeCounters(new String[]{"downloads", "likes"}));
//                 assertThat(query.toString())
//                        .isEqualTo("from Orders include counters($p0)");
//                 List<Order> queryResult = query.toList();
//                assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//                 // included counters should be in cache
//                Order order = queryResult.get(0);
//                assertThat(order.getId())
//                        .isEqualTo("orders/1-A");
//                 Long val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(100);
//                val = session.countersFor(order).get("likes");
//                assertThat(val)
//                        .isEqualTo(1000);
//                 order = queryResult.get(1);
//                assertThat(order.getId())
//                        .isEqualTo("orders/2-A");
//                val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(200);
//                val = session.countersFor(order).get("likes");
//                assertThat(val)
//                        .isEqualTo(2000);
//                 order = queryResult.get(2);
//                assertThat(order.getId())
//                        .isEqualTo("orders/3-A");
//                val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(300);
//                 //should register missing counters
//                val = session.countersFor(order).get("likes");
//                assertThat(val)
//                        .isNull();
//                 assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//            }
//        }
//    }
//     @Test
//    public void sessionQueryIncludeAllCounters() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                Order order1 = new Order();
//                order1.setCompany("companies/1-A");
//                session.store(order1, "orders/1-A");
//                 Order order2 = new Order();
//                order2.setCompany("companies/2-A");
//                session.store(order2, "orders/2-A");
//                 Order order3 = new Order();
//                order3.setCompany("companies/3-A");
//                session.store(order3, "orders/3-A");
//                 session.countersFor("orders/1-A").increment("Downloads", 100);
//                session.countersFor("orders/2-A").increment("Downloads", 200);
//                session.countersFor("orders/3-A").increment("Downloads", 300);
//                 session.countersFor("orders/1-A").increment("Likes", 1000);
//                session.countersFor("orders/2-A").increment("Likes", 2000);
//                 session.countersFor("orders/1-A").increment("Votes", 10000);
//                session.countersFor("orders/3-A").increment("Cats", 5);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                IDocumentQuery<Order> query = session.query(Order.class)
//                        .include(i -> i.includeAllCounters());
//                 assertThat(query.toString())
//                        .isEqualTo("from Orders include counters()");
//                 List<Order> queryResult = query.toList();
//                assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//                 // included counters should be in cache
//                Order order = queryResult.get(0);
//                assertThat(order.getId())
//                        .isEqualTo("orders/1-A");
//                 Map<String, Long> dic = session.countersFor(order).getAll();
//                assertThat(dic)
//                        .hasSize(3)
//                        .containsEntry("Downloads", 100L)
//                        .containsEntry("Likes", 1000L)
//                        .containsEntry("Votes", 10000L);
//                 order = queryResult.get(1);
//                assertThat(order.getId())
//                        .isEqualTo("orders/2-A");
//                dic = session.countersFor(order).getAll();
//                 assertThat(dic)
//                        .hasSize(2)
//                        .containsEntry("Downloads", 200L)
//                        .containsEntry("Likes", 2000L);
//                 order = queryResult.get(2);
//                assertThat(order.getId())
//                        .isEqualTo("orders/3-A");
//                dic = session.countersFor(order).getAll();
//                assertThat(dic)
//                        .hasSize(2)
//                        .containsEntry("Downloads", 300L)
//                        .containsEntry("Cats", 5L);
//                 assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//            }
//        }
//    }
//     @Test
//    public void sessionQueryIncludeCounterAndDocument() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                Order order1 = new Order();
//                order1.setCompany("companies/1-A");
//                session.store(order1, "orders/1-A");
//                 Order order2 = new Order();
//                order2.setCompany("companies/2-A");
//                session.store(order2, "orders/2-A");
//                 Order order3 = new Order();
//                order3.setCompany("companies/3-A");
//                session.store(order3, "orders/3-A");
//                 Company company1 = new Company();
//                company1.setName("HR");
//                session.store(company1, "companies/1-A");
//                 Company company2 = new Company();
//                company2.setName("HP");
//                session.store(company2, "companies/2-A");
//                 Company company3 = new Company();
//                company3.setName("Google");
//                session.store(company3, "companies/3-A");
//                 session.countersFor("orders/1-A").increment("downloads", 100);
//                session.countersFor("orders/2-A").increment("downloads", 200);
//                session.countersFor("orders/3-A").increment("downloads", 300);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                IDocumentQuery<Order> query = session.query(Order.class)
//                        .include(i -> i
//                                .includeCounter("downloads")
//                                .includeDocuments("company"));
//                 assertThat(query.toString())
//                        .isEqualTo("from Orders include company,counters($p0)");
//                 List<Order> queryResult = query.toList();
//                assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//                 // included documents should be in cache
//                session.load(User.class, new String[] { "companies/1-A", "companies/2-A", "companies/3-A"});
//                assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//                 // included counters should be in cache
//                Order order = queryResult.get(0);
//                assertThat(order.getId())
//                        .isEqualTo("orders/1-A");
//                Long val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(100);
//                 order = queryResult.get(1);
//                assertThat(order.getId())
//                        .isEqualTo("orders/2-A");
//                val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(200);
//                 order = queryResult.get(2);
//                assertThat(order.getId())
//                        .isEqualTo("orders/3-A");
//                val = session.countersFor(order).get("downloads");
//                assertThat(val)
//                        .isEqualTo(300);
//                 assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//            }
//        }
//    }
//     @Test
//    @Disabled("Wait for RavenDB-11701")
//    public void sessionQueryIncludeCounterOfRelatedDocument() throws Exception {
//        try (IDocumentStore store = getDocumentStore()) {
//            try (IDocumentSession session = store.openSession()) {
//                Order order1 = new Order();
//                order1.setEmployee("employees/1-A");
//                session.store(order1, "orders/1-A");
//                 Order order2 = new Order();
//                order2.setEmployee("employees/2-A");
//                session.store(order2, "orders/2-A");
//                 Order order3 = new Order();
//                order3.setEmployee("employees/3-A");
//                session.store(order3, "orders/3-A");
//                 Employee employee1 = new Employee();
//                employee1.setFirstName("Aviv");
//                session.store(employee1, "employees/1-A");
//                 Employee employee2 = new Employee();
//                employee2.setFirstName("Jerry");
//                session.store(employee2, "employees/2-A");
//                 Employee employee3 = new Employee();
//                employee3.setFirstName("Bob");
//                session.store(employee3, "employees/3-A");
//                 session.countersFor("employees/1-A").increment("downloads", 100);
//                session.countersFor("employees/2-A").increment("downloads", 200);
//                session.countersFor("employees/3-A").increment("downloads", 300);
//                 session.saveChanges();
//            }
//             try (IDocumentSession session = store.openSession()) {
//                IDocumentQuery<Order> query = session.query(Order.class)
//                        .include(i -> i.includeCounter("employee", "downloads"));
//                 assertThat(query.toString())
//                        .isEqualTo("from Orders include counters(employee, $p0)");
//                 List<Order> results = query.toList();
//                assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//                 // included counters should be in cache
//                Long val = session.countersFor("employees/1-A").get("downloads");
//                assertThat(val)
//                        .isEqualTo(100);
//                 val = session.countersFor("employees/2-A").get("downloads");
//                assertThat(val)
//                        .isEqualTo(200);
//                 val = session.countersFor("employees/3-A").get("downloads");
//                assertThat(val)
//                        .isEqualTo(300);
//                 assertThat(session.advanced().getNumberOfRequests())
//                        .isEqualTo(1);
//            }
//        }
//    }
//     /*TODO
//        [Fact]
//        public void SessionQueryIncludeCountersOfRelatedDocument()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A"
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A"
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A"
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("employees/1-A").Increment("Downloads", 100);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 200);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 300);
//                     session.CountersFor("employees/1-A").Increment("Likes", 1000);
//                    session.CountersFor("employees/2-A").Increment("Likes", 2000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i.IncludeCounters(o => o.Employee, new[] { "Downloads", "Likes" }));
//                     Assert.Equal("from Orders as o " +
//                                 "include counters(o.Employee, $p0)"
//                        , query.ToString());
//                     var results = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    var dic = session.CountersFor("employees/1-A").Get(new[] { "Downloads", "Likes" });
//                    Assert.Equal(100, dic["Downloads"]);
//                    Assert.Equal(1000, dic["Likes"]);
//                     dic = session.CountersFor("employees/2-A").Get(new[] { "Downloads", "Likes" });
//                    Assert.Equal(200, dic["Downloads"]);
//                    Assert.Equal(2000, dic["Likes"]);
//                     dic = session.CountersFor("employees/3-A").Get(new[] { "Downloads", "Likes" });
//                    Assert.Equal(300, dic["Downloads"]);
//                    Assert.Null(dic["Likes"]);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        public void SessionQueryIncludeCountersOfDocumentAndOfRelatedDocument()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A"
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A"
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A"
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                     session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 3000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i
//                            .IncludeCounter("Likes")
//                            .IncludeCounter(x => x.Employee, "Downloads"));
//                     Assert.Equal("from Orders as x " +
//                                 "include counters(x, $p0),counters(x.Employee, $p1)"
//                        , query.ToString());
//                     var orders = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    var order = orders[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                    var val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(100, val);
//                     order = orders[1];
//                    Assert.Equal("orders/2-A", order.Id);
//                    val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(200, val);
//                     order = orders[2];
//                    Assert.Equal("orders/3-A", order.Id);
//                    val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(300, val);
//                     val = session.CountersFor("employees/1-A").Get("Downloads");
//                    Assert.Equal(1000, val);
//                     val = session.CountersFor("employees/2-A").Get("Downloads");
//                    Assert.Equal(2000, val);
//                     val = session.CountersFor("employees/3-A").Get("Downloads");
//                    Assert.Equal(3000, val);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        public async Task AsyncSessionQueryIncludeCountersOfDocumentAndOfRelatedDocument()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A"
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A"
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A"
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                     session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 3000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenAsyncSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i
//                            .IncludeCounter("Likes")
//                            .IncludeCounter(x => x.Employee, "Downloads"));
//                     Assert.Equal("from Orders as x " +
//                                 "include counters(x, $p0),counters(x.Employee, $p1)"
//                        , query.ToString());
//                     var orders = await query.ToListAsync();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    var order = orders[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                    var val = await session.CountersFor(order).GetAsync("Likes");
//                    Assert.Equal(100, val);
//                     order = orders[1];
//                    Assert.Equal("orders/2-A", order.Id);
//                    val = await session.CountersFor(order).GetAsync("Likes");
//                    Assert.Equal(200, val);
//                     order = orders[2];
//                    Assert.Equal("orders/3-A", order.Id);
//                    val = await session.CountersFor(order).GetAsync("Likes");
//                    Assert.Equal(300, val);
//                     val = await session.CountersFor("employees/1-A").GetAsync("Downloads");
//                    Assert.Equal(1000, val);
//                     val = await session.CountersFor("employees/2-A").GetAsync("Downloads");
//                    Assert.Equal(2000, val);
//                     val = await session.CountersFor("employees/3-A").GetAsync("Downloads");
//                    Assert.Equal(3000, val);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        public void SessionQueryIncludeCountersOfDocumentAndOfRelatedDocumentWhere()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A",
//                        OrderedAt = new DateTime(1999, 1, 21)
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A",
//                        OrderedAt = new DateTime(2016, 6, 6)
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A",
//                        OrderedAt = new DateTime(1942, 8, 1)
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                     session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 3000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i
//                            .IncludeCounter("Likes")
//                            .IncludeCounter(x => x.Employee, "Downloads"))
//                        .Where(o => o.OrderedAt.Year < 2000);
//                     Assert.Equal("from Orders as x where x.OrderedAt.Year < $p2 " +
//                                 "include counters(x, $p0),counters(x.Employee, $p1)"
//                        , query.ToString());
//                     var orders = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    Assert.Equal(2, orders.Count);
//                     var order = orders[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                     var val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(100, val);
//                     val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(1000, val);
//                     order = orders[1];
//                    Assert.Equal("orders/3-A", order.Id);
//                     val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(300, val);
//                     val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(3000, val);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        public void SessionQueryIncludeCountersWithSelect()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A"
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A"
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A"
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                     session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 3000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i
//                            .IncludeCounter("Likes")
//                            .IncludeCounter(x => x.Employee, "Downloads"))
//                        .Select(o => new
//                        {
//                            o.Id,
//                            o.Employee
//                        });
//                     Assert.Equal("from Orders as x " +
//                                 "select id() as Id, Employee " +
//                                 "include counters(x, $p0),counters(x.Employee, $p1)"
//                        , query.ToString());
//                     var results = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    Assert.Equal(3, results.Count);
//                     var order = results[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                     var val = session.CountersFor(order.Id).Get("Likes");
//                    Assert.Equal(100, val);
//                    val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(1000, val);
//                     order = results[1];
//                    Assert.Equal("orders/2-A", order.Id);
//                     val = session.CountersFor(order.Id).Get("Likes");
//                    Assert.Equal(200, val);
//                    val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(2000, val);
//                     order = results[2];
//                    Assert.Equal("orders/3-A", order.Id);
//                     val = session.CountersFor(order.Id).Get("Likes");
//                    Assert.Equal(300, val);
//                    val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(3000, val);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        [Fact]
//        public void SessionQueryIncludeCountersUsingFromAliasWithSelectAndWhere()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A",
//                        OrderedAt = new DateTime(1999, 1, 21)
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A",
//                        OrderedAt = new DateTime(2016, 6, 6)
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A",
//                        OrderedAt = new DateTime(1942, 8, 1)
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                     session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 3000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = from o in session.Query<Order>()
//                                    .Include(i => i
//                                        .IncludeCounter("Likes")
//                                        .IncludeCounter(x => x.Employee, "Downloads")
//                                        .IncludeDocuments("Employee"))
//                                where o.OrderedAt.Year < 2000
//                                select new
//                                {
//                                    o.Id,
//                                    o.OrderedAt,
//                                    o.Employee,
//                                     //this will create js projection with from-alias 'o'
//                                    Foo = o.Employee + o.Company
//                                };
//                     Assert.Equal("from Orders as o " +
//                                 "where o.OrderedAt.Year < $p2 " +
//                                 "select { Id : id(o), OrderedAt : new Date(Date.parse(o.OrderedAt)), " +
//                                    "Employee : o.Employee, Foo : o.Employee+o.Company } " +
//                                 "include Employee,counters(o, $p0),counters(o.Employee, $p1)"
//                        , query.ToString());
//                     var results = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included documents should be in cache
//                    session.Load<Employee>(new[] { "employees/1-A", "employees/3-A" });
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    Assert.Equal(2, results.Count);
//                     var order = results[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                    Assert.Equal(new DateTime(1999, 1, 21), order.OrderedAt);
//                     var val = session.CountersFor(order.Id).Get("Likes");
//                    Assert.Equal(100, val);
//                     val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(1000, val);
//                     order = results[1];
//                    Assert.Equal("orders/3-A", order.Id);
//                    Assert.Equal(new DateTime(1942, 8, 1), order.OrderedAt);
//                     val = session.CountersFor(order.Id).Get("Likes");
//                    Assert.Equal(300, val);
//                     val = session.CountersFor(order.Employee).Get("Downloads");
//                    Assert.Equal(3000, val);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        public void SessionQueryIncludeAllCountersOfDocumentAndOfRelatedDocument()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A"
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A"
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A"
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                    session.CountersFor("orders/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("orders/2-A").Increment("Downloads", 2000);
//                     session.CountersFor("employees/1-A").Increment("Likes", 100);
//                    session.CountersFor("employees/2-A").Increment("Likes", 200);
//                    session.CountersFor("employees/3-A").Increment("Likes", 300);
//                    session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Cats", 5);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i
//                            .IncludeAllCounters()
//                            .IncludeAllCounters(x => x.Employee));
//                     Assert.Equal("from Orders as x " +
//                                 "include counters(x),counters(x.Employee)"
//                        , query.ToString());
//                     var orders = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    var order = orders[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                    var dic = session.CountersFor(order).GetAll();
//                    Assert.Equal(2, dic.Count);
//                    Assert.Equal(100, dic["Likes"]);
//                    Assert.Equal(1000, dic["Downloads"]);
//                     order = orders[1];
//                    Assert.Equal("orders/2-A", order.Id);
//                    dic = session.CountersFor(order).GetAll();
//                    Assert.Equal(2, dic.Count);
//                    Assert.Equal(200, dic["Likes"]);
//                    Assert.Equal(2000, dic["Downloads"]);
//                     order = orders[2];
//                    Assert.Equal("orders/3-A", order.Id);
//                    dic = session.CountersFor(order).GetAll();
//                    Assert.Equal(1, dic.Count);
//                    Assert.Equal(300, dic["Likes"]);
//                     dic = session.CountersFor("employees/1-A").GetAll();
//                    Assert.Equal(2, dic.Count);
//                    Assert.Equal(100, dic["Likes"]);
//                    Assert.Equal(1000, dic["Downloads"]);
//                     dic = session.CountersFor("employees/2-A").GetAll();
//                    Assert.Equal(2, dic.Count);
//                    Assert.Equal(200, dic["Likes"]);
//                    Assert.Equal(2000, dic["Downloads"]);
//                     dic = session.CountersFor("employees/3-A").GetAll();
//                    Assert.Equal(2, dic.Count);
//                    Assert.Equal(300, dic["Likes"]);
//                    Assert.Equal(5, dic["Cats"]);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
//         [Fact]
//        public void SessionQueryIncludeDocumentAndCountersOfDocumentAndOfRelatedDocument()
//        {
//            using (var store = GetDocumentStore())
//            {
//                using (var session = store.OpenSession())
//                {
//                    session.Store(new Order
//                    {
//                        Employee = "employees/1-A"
//                    }, "orders/1-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/2-A"
//                    }, "orders/2-A");
//                    session.Store(new Order
//                    {
//                        Employee = "employees/3-A"
//                    }, "orders/3-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Aviv"
//                    }, "employees/1-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Jerry"
//                    }, "employees/2-A");
//                    session.Store(new Employee
//                    {
//                        FirstName = "Bob"
//                    }, "employees/3-A");
//                     session.CountersFor("orders/1-A").Increment("Likes", 100);
//                    session.CountersFor("orders/2-A").Increment("Likes", 200);
//                    session.CountersFor("orders/3-A").Increment("Likes", 300);
//                     session.CountersFor("employees/1-A").Increment("Downloads", 1000);
//                    session.CountersFor("employees/2-A").Increment("Downloads", 2000);
//                    session.CountersFor("employees/3-A").Increment("Downloads", 3000);
//                     session.SaveChanges();
//                }
//                 using (var session = store.OpenSession())
//                {
//                    var query = session.Query<Order>()
//                        .Include(i => i
//                            .IncludeDocuments(o => o.Employee)
//                            .IncludeCounter("Likes")
//                            .IncludeCounter(x => x.Employee, "Downloads"));
//                     Assert.Equal("from Orders as x " +
//                                 "include Employee,counters(x, $p0),counters(x.Employee, $p1)"
//                        , query.ToString());
//                     var orders = query.ToList();
//                    Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included documents should be in cache
//                    var employees = session.Load<Employee>(
//                        new[] { "employees/1-A", "employees/2-A", "employees/3-A" });
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                     // included counters should be in cache
//                    var order = orders[0];
//                    Assert.Equal("orders/1-A", order.Id);
//                    var val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(100, val);
//                     order = orders[1];
//                    Assert.Equal("orders/2-A", order.Id);
//                    val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(200, val);
//                     order = orders[2];
//                    Assert.Equal("orders/3-A", order.Id);
//                    val = session.CountersFor(order).Get("Likes");
//                    Assert.Equal(300, val);
//                     var employee = employees["employees/1-A"];
//                    val = session.CountersFor(employee).Get("Downloads");
//                    Assert.Equal(1000, val);
//                     employee = employees["employees/2-A"];
//                    val = session.CountersFor(employee).Get("Downloads");
//                    Assert.Equal(2000, val);
//                     employee = employees["employees/3-A"];
//                    val = session.CountersFor(employee).Get("Downloads");
//                    Assert.Equal(3000, val);
//                     Assert.Equal(1, session.Advanced.NumberOfRequests);
//                 }
//            }
//        }
// */
//    public static class User {
//        private String name;
//        private int age;
//        private String friendId;
//         public String getName() {
//            return name;
//        }
//         public void setName(String name) {
//            this.name = name;
//        }
//         public int getAge() {
//            return age;
//        }
//         public void setAge(int age) {
//            this.age = age;
//        }
//         public String getFriendId() {
//            return friendId;
//        }
//         public void setFriendId(String friendId) {
//            this.friendId = friendId;
//        }
//    }
//     public static class CounterResult {
//        private Long downloads;
//        private Long likes;
//        private String name;
//         public Long getDownloads() {
//            return downloads;
//        }
//         public void setDownloads(Long downloads) {
//            this.downloads = downloads;
//        }
//         public Long getLikes() {
//            return likes;
//        }
//         public void setLikes(Long likes) {
//            this.likes = likes;
//        }
//         public String getName() {
//            return name;
//        }
//         public void setName(String name) {
//            this.name = name;
//        }
//    }
//     public static class CounterResult2 {
//        private Long downloadsCount;
//        private Long likesCount;
//         public Long getDownloadsCount() {
//            return downloadsCount;
//        }
//         public void setDownloadsCount(Long downloadsCount) {
//            this.downloadsCount = downloadsCount;
//        }
//         public Long getLikesCount() {
//            return likesCount;
//        }
//         public void setLikesCount(Long likesCount) {
//            this.likesCount = likesCount;
//        }
//    }
//     public static class CounterResult3 {
//        private Map<String, Long> downloads;
//         public Map<String, Long> getDownloads() {
//            return downloads;
//        }
//         public void setDownloads(Map<String, Long> downloads) {
//            this.downloads = downloads;
//        }
//    }
//     public static class CounterResult4 {
//        private Long downloads;
//        private String name;
//        private Map<String, Long> likes;
//         public Long getDownloads() {
//            return downloads;
//        }
//         public void setDownloads(Long downloads) {
//            this.downloads = downloads;
//        }
//         public String getName() {
//            return name;
//        }
//         public void setName(String name) {
//            this.name = name;
//        }
//         public Map<String, Long> getLikes() {
//            return likes;
//        }
//         public void setLikes(Map<String, Long> likes) {
//            this.likes = likes;
//        }
//    }
//     public static class CounterResult5 {
//        private Map<String, Long> counters;
//         public Map<String, Long> getCounters() {
//            return counters;
//        }
//         public void setCounters(Map<String, Long> counters) {
//            this.counters = counters;
//        }
//    }
//     public static class CounterResult6 {
//        private Long counter;
//         public Long getCounter() {
//            return counter;
//        }
//         public void setCounter(Long counter) {
//            this.counter = counter;
//        }
//    }
//     public static class CounterResult7 {
//        private Long downloads;
//        private Long friendsDownloads;
//        private String name;
//         public Long getDownloads() {
//            return downloads;
//        }
//         public void setDownloads(Long downloads) {
//            this.downloads = downloads;
//        }
//         public Long getFriendsDownloads() {
//            return friendsDownloads;
//        }
//         public void setFriendsDownloads(Long friendsDownloads) {
//            this.friendsDownloads = friendsDownloads;
//        }
//         public String getName() {
//            return name;
//        }
//         public void setName(String name) {
//            this.name = name;
//        }
//    }
// }
