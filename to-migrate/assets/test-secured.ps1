write-host TODO
exit 1

$ErrorActionPreference = 'Stop'
function Get-ScriptDirectory
{
  $Invocation = (Get-Variable MyInvocation -Scope 1).Value
  Split-Path $Invocation.MyCommand.Path
}

$scriptDir = Get-ScriptDirectory

#TODO fix docker command + add pfx
$containerId = Invoke-Expression "docker run --rm -e RAVEN_Setup_Mode='None' -e RAVEN_Security_UnsecuredAccessAllowed='PrivateNetwork' -d -p 8080:8080 -p 38888:38888 ravendb/ravendb-nightly"
write-host "Started secured RavenDB container $containerId"

Start-Sleep -Seconds 3

npm install
npm run build
npm test -- -h localhost

docker stop $containerId
write-host "Stopped RavenDB container $containerId"