﻿param(
    [string] $BuildNumber,
    [switch] $Debug = $false,
    [switch] $CopyCore = $false,
    [switch] $SkipCdn = $false
)

$ErrorActionPreference = "Stop"

try
{
    Push-Location $PSScriptRoot

    gci target -Exclude fonts,carbon-core*,carbon-api*,*.d.ts | ri -recurse

    if ($CopyCore)
    {
        ri target\carbon-core-*
        ri target\carbon-api-*
        copy ..\carbon-core\target\* target
    }

    if (-not $Debug)
    {
        npm install --loglevel=error
    }

    $params = @("run", "pack", "--", "--noColors", "--verbose", "--vendors")
    if ($Debug)
    {
        $params += "--noUglify"
    }

    if (-not $SkipCdn)
    {
        $params += "--host"
        $params += "//carbonstatic.azureedge.net"
    }

    & npm $params

    if (-not $Debug)
    {
        npm test
    }

    if ($BuildNumber)
    {
        $BuildNumber > .\target\version
        Copy-Item .\node_modules\@carbonium\carbon-core\lib\* .\target\
        Copy-Item .\node_modules\@carbonium\carbon-api\lib\* .\target\
    }
}
finally
{
    Pop-Location
}