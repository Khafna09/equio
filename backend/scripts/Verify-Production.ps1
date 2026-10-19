param(
    [Parameter(Mandatory)] [uri] $FrontendUrl,
    [Parameter(Mandatory)] [uri] $ApiUrl
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
foreach ($uri in @($FrontendUrl, $ApiUrl)) {
    if ($uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/') {
        throw 'Provide HTTPS origins only, without credentials, paths or queries'
    }
}
$front = $FrontendUrl.GetLeftPart([UriPartial]::Authority)
$api = $ApiUrl.GetLeftPart([UriPartial]::Authority)
function Check([bool] $Pass, [string] $Description) {
    if (-not $Pass) { throw "FAIL: $Description" }
    Write-Output "PASS: $Description"
}
function Get-Response([string] $Url, [string] $Method = 'GET', [hashtable] $Headers = @{}) {
    return Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 30 `
        -SkipHttpErrorCheck -MaximumRedirection 0
}
$page = Get-Response ($front + '/')
Check ($page.StatusCode -eq 200) 'Frontend responds successfully'
Check (($page.Headers['Content-Security-Policy'] -join '') -match "frame-ancestors 'none'") 'CSP framing protection is an HTTP header'
Check (($page.Headers['X-Content-Type-Options'] -join '') -eq 'nosniff') 'Frontend nosniff header'
Check (($page.Headers['Content-Security-Policy'] -join '').Contains($api)) 'Frontend CSP allows the configured API'
$health = Get-Response ($api + '/actuator/health/liveness')
Check ($health.StatusCode -eq 200) 'API liveness'
Check (($health.Headers['Strict-Transport-Security'] -join '') -match 'max-age=') 'API HSTS'
Check (($health.Headers['X-Content-Type-Options'] -join '') -eq 'nosniff') 'API nosniff header'
Check ((Get-Response ($api + '/api/v1/movements')).StatusCode -eq 401) 'Private API rejects unauthenticated access'
Check ((Get-Response ($api + '/v3/api-docs')).StatusCode -in @(401, 403, 404)) 'API documentation is not public'
$allowed = Get-Response ($api + '/api/v1/movements') 'OPTIONS' @{
    Origin = $front; 'Access-Control-Request-Method' = 'GET'; 'Access-Control-Request-Headers' = 'authorization'
}
Check ($allowed.StatusCode -eq 200 -and ($allowed.Headers['Access-Control-Allow-Origin'] -join '') -eq $front) 'Exact allowed CORS origin'
$denied = Get-Response ($api + '/api/v1/movements') 'OPTIONS' @{
    Origin = 'https://untrusted.example'; 'Access-Control-Request-Method' = 'GET'
}
Check ($denied.StatusCode -eq 403 -and -not $denied.Headers.ContainsKey('Access-Control-Allow-Origin')) 'Untrusted CORS origin rejected'
$csrf = Get-Response ($api + '/api/v1/auth/csrf')
Check ($csrf.StatusCode -eq 200 -and ($csrf.Headers['Set-Cookie'] -join '') -match '(?i)Secure') 'Secure CSRF cookie'
Check (($csrf.Headers['Set-Cookie'] -join '') -match '(?i)SameSite=Strict') 'Strict CSRF cookie'
Write-Output 'Complete the browser checklist for refresh HttpOnly cookies, account switching and the financial flows. This script never creates production data.'
