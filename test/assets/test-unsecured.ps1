$ErrorActionPreference = 'Stop'
$containerId = Invoke-Expression "docker run --rm -e RAVEN_Setup_Mode='None' -e RAVEN_Security_UnsecuredAccessAllowed='PrivateNetwork' -d -p 8080:8080 -p 38888:38888 ravendb/ravendb-nightly"
write-host "Started unsecured RavenDB container $containerId"

Start-Sleep -Seconds 3

npm install
npm run build
npm test -- -h localhost

docker stop $containerId
write-host "Stopped RavenDB container $containerId"