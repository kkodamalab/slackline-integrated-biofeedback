param([switch]$DryRun)
$ErrorActionPreference='Stop'
$env:GIT_TERMINAL_PROMPT='0'
$src=Split-Path -Parent $MyInvocation.MyCommand.Path
$dst='C:\Users\kkoda\Documents\GitHub\slackline-integrated-biofeedback'
$files=@('index.html','app.js','camera-runtime.js','capture.html','capture.js','styles.css','README.md')
$log=Join-Path $src ('publish-'+(Get-Date -Format yyyyMMdd-HHmmss)+'.log')
Start-Transcript -Path $log -Append|Out-Null
function Fail([string]$m){Write-Host "ERROR: $m" -ForegroundColor Red;throw $m}
function Git([string[]]$a){& git @a;if($LASTEXITCODE -ne 0){Fail "git command failed ($LASTEXITCODE): $($a -join ' ')"}}
function GitText([string[]]$a){$o=& git @a;if($LASTEXITCODE -ne 0){Fail "git command failed ($LASTEXITCODE): $($a -join ' ')"};$o -join "`n"}
$backup=$null;$copied=@();$inRepo=$false
try {
 foreach($f in $files){if(!(Test-Path (Join-Path $src $f))){Fail "missing distribution file: $f"}}
 foreach($f in @('index.html','capture.html')){$txt=Get-Content (Join-Path $src $f) -Raw;$ms=[regex]::Matches($txt,'(?:src|href)="([^"]+)"');foreach($m in $ms){$r=$m.Groups[1].Value;if($r -notmatch '^(https?:|#|data:|mailto:)' -and !(Test-Path (Join-Path $src $r))){Fail "missing local dependency: $r"}}}
 if(!(Test-Path (Join-Path $dst '.git'))){Fail 'destination is not a git repository'}
 Push-Location $dst;$inRepo=$true
 $branch=(GitText @('branch','--show-current')).Trim();if($branch -ne 'main'){Fail "branch is $branch, expected main"}
 if(GitText @('status','--porcelain')){Fail 'working tree is not clean'}
 Git @('fetch','origin','main')
 $c=(GitText @('rev-list','--left-right','--count','HEAD...origin/main')).Trim().Split();$ahead=[int]$c[0];$behind=[int]$c[1]
 if($ahead -gt 0 -and $behind -gt 0){Fail 'history has diverged'}
 if($behind -gt 0){if($DryRun){Write-Host 'DryRun: fast-forward available; no merge executed'}else{Git @('merge','--ff-only','origin/main')}}
 if($DryRun){Write-Host 'DRY RUN PASSED: no copy, backup, commit, or push executed';return}
 $backup=Join-Path ([Environment]::GetFolderPath('MyDocuments')) ('slackline-bf-backup-'+(Get-Date -Format yyyyMMdd-HHmmss));New-Item $backup -ItemType Directory|Out-Null
 foreach($f in $files){$s=Join-Path $src $f;$d=Join-Path $dst $f;if(Test-Path $d){Copy-Item $d (Join-Path $backup $f)};Copy-Item $s $d -Force;$copied+=$f}
 foreach($f in $files){$h1=(Get-FileHash (Join-Path $src $f)).Hash;$h2=(Get-FileHash (Join-Path $dst $f)).Hash;if($h1-ne$h2){Fail "hash mismatch: $f"}}
 Git (@('add','--')+$files);Git @('commit','-m','Update Slackline biofeedback prototype');$local=(GitText @('rev-parse','HEAD')).Trim();Git @('push','origin','main');$remote=(GitText @('ls-remote','origin','refs/heads/main')).Split()[0];if($local-ne$remote){Fail 'remote commit does not match pushed commit'};Write-Host "PUSH SUCCEEDED: $local" -ForegroundColor Green
}catch{if($backup){foreach($f in $copied){$b=Join-Path $backup $f;if(Test-Path $b){Copy-Item $b (Join-Path $dst $f) -Force}}};Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}finally{if($inRepo){Pop-Location};Stop-Transcript|Out-Null}
