# Deno mTLS end-to-end smoke test

Minimal [Deno](https://deno.com) project that runs a real store + load against a
**secured** RavenDB server using an X.509 client certificate configured via
`authOptions`. It guards against
[RDBC-1083](https://issues.hibernatingrhinos.com/issue/RDBC-1083) — on Deno the
client used to silently send uncertified requests (the undici agent path is a no-op
there), producing a bare 403 with no hint that the configured certificate was
dropped. The client now presents the certificate through `Deno.createHttpClient`.

It resolves `ravendb` from the repository root (`file:../..`), so it always tests the
locally built client.

## Run it

Needs a secured RavenDB server and a PEM client certificate the server trusts. A
throwaway setup with Docker and OpenSSL:

```bash
# 1. a mini PKI: CA + a leaf certificate (SANs for both hostnames used below);
#    the private key must be PKCS#1 ("BEGIN RSA PRIVATE KEY") for authOptions PEM parsing
openssl req -x509 -newkey rsa:2048 -keyout ca-key.pem -out ca.pem -days 365 -nodes \
  -subj "/CN=smoke-ca" -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"
openssl genrsa -out key-pkcs8.pem 2048
openssl rsa -in key-pkcs8.pem -out key.pem -traditional
openssl req -new -key key.pem -subj "/CN=ravendb" -out leaf.csr
printf "subjectAltName=DNS:localhost,DNS:ravendb,IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth,clientAuth\nbasicConstraints=CA:FALSE\n" > leaf.ext
openssl x509 -req -in leaf.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -days 365 -extfile leaf.ext -out cert.pem
openssl pkcs12 -export -out server.pfx -inkey key.pem -in cert.pem -certfile ca.pem -passout pass:
cat cert.pem key.pem > client.pem

# 2. a secured RavenDB (the server trusts its own certificate as a ClusterAdmin client certificate)
docker run -d --name ravendb-smoke -p 8080:8080 -v "$PWD/server.pfx:/certs/server.pfx:ro" \
  -e RAVEN_Setup_Mode=None -e RAVEN_License_Eula_Accepted=true \
  -e RAVEN_Security_Certificate_Path=/certs/server.pfx \
  -e RAVEN_ServerUrl=https://0.0.0.0:8080 -e RAVEN_PublicServerUrl=https://localhost:8080 \
  -e RAVEN_RunInMemory=true ravendb/ravendb:7.2-latest

# 3. the database
curl -s -X PUT "https://localhost:8080/admin/databases?name=smoke&replicationFactor=1" \
  --cert client.pem --cacert ca.pem -H "Content-Type: application/json" -d '{"DatabaseName":"smoke"}'
```

Then, from the repository root:

```bash
# build the client first
npm ci

# install the example deps and run the smoke test
cd test/deno
npm install
RAVENDB_URL=https://localhost:8080 RAVENDB_DATABASE=smoke \
  RAVENDB_CLIENT_CERT=client.pem RAVENDB_CA=ca.pem npm run smoke
```

`npm run smoke` stores a document and loads it back over mTLS, and exits non-zero on
any failure — including the historical failure mode (a 403 `AuthorizationException`
saying no certificate was provided).
