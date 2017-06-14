# ravendb-nodejs-client

RavenDB node.js client

## Running tests
```
npm test -- -h 192.168.5.44 [-p 8080] [-t DocumentSerializing [-f]]
```
or
```
gulp test -h 192.168.5.44 [-p 8080] [-t DocumentSerializing [-f]]
```
| Option | Description |
| ------------- | ------------- |
| -h or --ravendb-host== | Database host |
| -p or --ravendb-port== | Database port |
| -t or --test== | Test name. For run multiple test, specify each test in separate --test= option. By default runs all tests |
| -f or --no-fixtures | Skip executing database fixtures (create test database, put test indexes etc). Can be usable for tests which doesn't executes raven commands (e.g. DocumentSerializing) |
