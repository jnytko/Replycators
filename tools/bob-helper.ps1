# ReplyCators -- Bob Helper Management Script
# Version  : 1.0.0
# Subject  : Management wrapper for tools/bob-helper-server.js
# Usage    : powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 [verb]
#            pwsh       -ExecutionPolicy Bypass -File tools\bob-helper.ps1 [verb]
# Verbs    : check | start | stop | status | install | uninstall [-Kill] | help
# Default  : start (no arguments = starts the server)

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$Verb = 'start',

    [Parameter()]
    [switch]$Kill
)

$PORT      = 47123
$TASK_NAME = 'ReplyCators Bob Helper'

# ---------------------------------------------------------------------------
# Helper: Find-Node
# Resolves a usable node.exe with 7 fallbacks (AGENTS.md §13-A Runtime-First).
# ---------------------------------------------------------------------------
function Find-Node {
    # Fallback 1: PATH (most machines)
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node -ne $null) { return $node.Source }

    # Fallback 2: RC_NODE_HOME environment variable (portable CI / restricted images)
    if ($env:RC_NODE_HOME) {
        $nodePath = Join-Path $env:RC_NODE_HOME 'node.exe'
        if (Test-Path $nodePath) { return $nodePath }
    }

    # Fallback 3: Repository-relative Runtime directory (AGENTS.md §13-A)
    $repoRuntime = Join-Path $PSScriptRoot '..\Runtime\NodeJS\node.exe'
    if (Test-Path $repoRuntime) { return (Resolve-Path $repoRuntime).Path }

    # Fallback 4: IBM developer machine Runtime path
    $sysRuntime = Join-Path $env:SYSTEMDRIVE 'Work\Bob\Runtime\NodeJS\node.exe'
    if (Test-Path $sysRuntime) { return $sysRuntime }

    # Fallback 5: Standard Windows installer locations
    foreach ($pf in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        if ($pf) {
            $candidate = Join-Path $pf 'nodejs\node.exe'
            if (Test-Path $candidate) { return $candidate }
        }
    }

    # Fallback 6: nvm for Windows - NVM_SYMLINK (set by nvm installer)
    if ($env:NVM_SYMLINK) {
        $candidate = Join-Path $env:NVM_SYMLINK 'node.exe'
        if (Test-Path $candidate) { return $candidate }
    }

    # Fallback 7: nvm for Windows - user-profile path (NVM_SYMLINK not always set)
    $nvmUser = Join-Path $env:APPDATA 'nvm\current\node.exe'
    if (Test-Path $nvmUser) { return $nvmUser }

    return $null
}

# ---------------------------------------------------------------------------
# Verb: check - 8 pre-flight checks
# ---------------------------------------------------------------------------
function Invoke-Check {
    $allPassed = $true

    # CHECK 1: Node.js >= 18
    $node = Find-Node
    if ($node -ne $null) {
        $version = & $node --version 2>$null
        if ($version -match 'v(\d+)\.') {
            $major = [int]$Matches[1]
            if ($major -ge 18) {
                Write-Host "[PASS] Node.js $version at $node" -ForegroundColor Green
            } else {
                Write-Host "[FAIL] Node.js version $major < 18 required. Update Node.js." -ForegroundColor Red
                $allPassed = $false
            }
        }
    } else {
        Write-Host "[FAIL] Node.js not found. Install Node.js 18+ or set RC_NODE_HOME." -ForegroundColor Red
        $allPassed = $false
    }

    # CHECK 2: IBM Bob CLI
    $bobCmd = Get-Command bob.ps1 -ErrorAction SilentlyContinue
    if ($bobCmd -ne $null) {
        Write-Host "[PASS] bob.ps1 at $($bobCmd.Source)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] bob.ps1 not found. Install: npm install -g bobshell" -ForegroundColor Red
        $allPassed = $false
    }

    # CHECK 3: Port availability (health-probe first; Get-NetTCPConnection as fallback)
    $port = $PORT
    if ($env:REPLYCATORS_BOB_HELPER_PORT) { $port = [int]$env:REPLYCATORS_BOB_HELPER_PORT }
    $portInUse = $false
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        $portInUse = $true
    } catch {
        $connCheck = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connCheck -ne $null) { $portInUse = $true }
    }
    if ($portInUse) {
        Write-Host "[WARN] Port $port in use - server may already be running" -ForegroundColor Yellow
    } else {
        Write-Host "[PASS] Port $port available" -ForegroundColor Green
    }

    # CHECK 4: Launcher template exists
    $launcherPath = Join-Path $PSScriptRoot 'bob-launcher-template.ps1'
    if (Test-Path $launcherPath) {
        Write-Host "[PASS] Launcher template found at $launcherPath" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Launcher template missing at $launcherPath" -ForegroundColor Red
        $allPassed = $false
    }

    # CHECK 5: %TEMP% writable
    try {
        $tempPath = [System.IO.Path]::GetTempPath()
        $testFile = Join-Path $tempPath ("replycators-check-" + [Guid]::NewGuid().ToString('N').Substring(0,8) + ".tmp")
        [System.IO.File]::WriteAllText($testFile, "test")
        Remove-Item $testFile -Force
        Write-Host "[PASS] TEMP writable at $tempPath" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] TEMP not writable: $_" -ForegroundColor Red
        $allPassed = $false
    }

    # CHECK 6: PowerShell Execution Policy - GPO detection
    $machinePolicy = Get-ExecutionPolicy -Scope MachinePolicy -ErrorAction SilentlyContinue
    $userPolicy    = Get-ExecutionPolicy -Scope UserPolicy    -ErrorAction SilentlyContinue
    $blocked = @('AllSigned', 'Restricted')
    if ($machinePolicy -in $blocked) {
        Write-Host "[FAIL] MachinePolicy='$machinePolicy' blocks unsigned scripts. Contact IT for exemption." -ForegroundColor Red
        $allPassed = $false
    } elseif ($userPolicy -in $blocked) {
        Write-Host "[FAIL] UserPolicy='$userPolicy' blocks unsigned scripts. Contact IT for exemption." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "[PASS] Execution policy permits unsigned scripts (MachinePolicy=$machinePolicy, UserPolicy=$userPolicy)" -ForegroundColor Green
    }

    # CHECK 6b: REPLYCATORS_PS_EXEC_POLICY environment variable
    if ($env:REPLYCATORS_PS_EXEC_POLICY) {
        if ($env:REPLYCATORS_PS_EXEC_POLICY -in $blocked) {
            Write-Host "[FAIL] REPLYCATORS_PS_EXEC_POLICY='$($env:REPLYCATORS_PS_EXEC_POLICY)' will block Execute requests." -ForegroundColor Red
            Write-Host "       Unset this variable or set it to 'Bypass' to allow unsigned script execution." -ForegroundColor Red
            $allPassed = $false
        } else {
            Write-Host "[PASS] REPLYCATORS_PS_EXEC_POLICY='$($env:REPLYCATORS_PS_EXEC_POLICY)' is permissive" -ForegroundColor Green
        }
    } else {
        Write-Host "[PASS] REPLYCATORS_PS_EXEC_POLICY not set (server defaults to Bypass)" -ForegroundColor Green
    }

    # CHECK 7: Legacy scheduled task detection
    $existingTask = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    if ($existingTask -ne $null) {
        $taskAction = $existingTask.Actions | Select-Object -First 1
        $isLegacy = ($taskAction -ne $null) -and (
            ($taskAction.Execute -like '*cmd.exe*') -or
            ($taskAction.Arguments -like '*bob-helper.cmd*')
        )
        if ($isLegacy) {
            Write-Host "[WARN] Scheduled Task '$TASK_NAME' uses legacy cmd.exe action. Re-register:" -ForegroundColor Yellow
            Write-Host "       powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install" -ForegroundColor Yellow
        } else {
            Write-Host "[PASS] Scheduled Task '$TASK_NAME' registered with PowerShell action" -ForegroundColor Green
        }
    } else {
        Write-Host "[INFO] Scheduled Task '$TASK_NAME' not registered (run 'install' for auto-start)" -ForegroundColor Gray
    }

    Write-Host ""
    if ($allPassed) {
        Write-Host "[OK] All pre-flight checks passed." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "[FAIL] One or more checks failed. Resolve issues above." -ForegroundColor Red
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Verb: start - launch server in foreground
# ---------------------------------------------------------------------------
function Invoke-Start {
    $node = Find-Node
    if ($node -eq $null) {
        Write-Host "[FAIL] Node.js not found. Run 'bob-helper.ps1 check'." -ForegroundColor Red
        exit 1
    }
    $version = & $node --version 2>$null
    if ($version -match 'v(\d+)\.') {
        if ([int]$Matches[1] -lt 18) {
            Write-Host "[FAIL] Node.js $version < 18 required. Update Node.js and retry." -ForegroundColor Red
            exit 1
        }
    }
    $port = $PORT
    if ($env:REPLYCATORS_BOB_HELPER_PORT) { $port = [int]$env:REPLYCATORS_BOB_HELPER_PORT }
    $alreadyRunning = $false
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        $alreadyRunning = $true
    } catch {
        $connCheck = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connCheck -ne $null) { $alreadyRunning = $true }
    }
    if ($alreadyRunning) {
        Write-Host "[WARN] Server already running on port $port" -ForegroundColor Yellow
        exit 0
    }
    $serverScript = Join-Path $PSScriptRoot 'bob-helper-server.js'
    if (-not (Test-Path $serverScript)) {
        Write-Host "[FAIL] Server script not found: $serverScript" -ForegroundColor Red
        exit 1
    }
    Write-Host "[INFO] Starting Bob Helper on port $port... (Ctrl+C to stop)" -ForegroundColor Cyan
    & $node $serverScript
    exit $LASTEXITCODE
}

# ---------------------------------------------------------------------------
# Verb: stop - kill running server
# ---------------------------------------------------------------------------
function Invoke-Stop {
    $port = $PORT
    if ($env:REPLYCATORS_BOB_HELPER_PORT) { $port = [int]$env:REPLYCATORS_BOB_HELPER_PORT }

    # Layer 1: Health-probe to get authoritative PID, then port-based fallback
    $stoppedViaPid = $false
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($r.pid) {
            $proc = Get-Process -Id $r.pid -ErrorAction SilentlyContinue
            if ($proc -ne $null -and $proc.Name -eq 'node') {
                $proc | Stop-Process -Force
                Write-Host "[OK] Server stopped (PID $($proc.Id))" -ForegroundColor Green
                $stoppedViaPid = $true
            }
        }
    } catch { }
    if ($stoppedViaPid) { exit 0 }

    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn -ne $null) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc -ne $null -and $proc.Name -eq 'node') {
            $proc | Stop-Process -Force
            Write-Host "[OK] Server stopped (PID $($proc.Id))" -ForegroundColor Green
            exit 0
        }
    }

    # Layer 2: Command-line match fallback
    $procs = Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
             Where-Object { $_.CommandLine -like '*bob-helper-server*' }
    if ($procs) {
        $procs | ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Server stopped (PID $($_.ProcessId))" -ForegroundColor Green
        }
        exit 0
    }

    Write-Host "[INFO] Server not running" -ForegroundColor Gray
    exit 0
}

# ---------------------------------------------------------------------------
# Verb: status - probe /health and display all fields
# ---------------------------------------------------------------------------
function Invoke-Status {
    $port = $PORT
    if ($env:REPLYCATORS_BOB_HELPER_PORT) { $port = [int]$env:REPLYCATORS_BOB_HELPER_PORT }
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
        Write-Host "[OK] Server running on port $($r.port)" -ForegroundColor Green
        Write-Host "     ok         : $($r.ok)"                              -ForegroundColor Gray
        Write-Host "     ready      : $($r.ready)" `
            -ForegroundColor $(if ($r.ready) { 'Green' } else { 'Yellow' })
        Write-Host "     pid        : $($r.pid)"                             -ForegroundColor Gray
        Write-Host "     bobCommand : $(if ($r.bobCommand) { $r.bobCommand } else { 'NOT FOUND - install bobshell' })" `
            -ForegroundColor $(if ($r.bobCommand) { 'Gray' } else { 'Yellow' })
        Write-Host "     tempRoot   : $($r.tempRoot)"                        -ForegroundColor Gray
        Write-Host "     execPolicy : $($r.execPolicy)"                     -ForegroundColor Gray
        exit 0
    } catch {
        Write-Host "[FAIL] Server not responding on port $port" -ForegroundColor Red
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Verb: install - register Windows Scheduled Task (no admin required)
# ---------------------------------------------------------------------------
function Invoke-Install {
    $scriptPath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.MyCommand.Path }
    if (-not $scriptPath) {
        Write-Host "[FAIL] Cannot determine script path for Scheduled Task" -ForegroundColor Red
        exit 1
    }
    $action   = New-ScheduledTaskAction -Execute 'powershell.exe' `
                    -Argument "-ExecutionPolicy Bypass -NonInteractive -WindowStyle Normal -File `"$scriptPath`" start"
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $trigger  = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
                    -ExecutionTimeLimit ([TimeSpan]::Zero) `
                    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    try {
        Register-ScheduledTask -TaskName $TASK_NAME -Action $action `
            -Trigger $trigger -Settings $settings -RunLevel Limited -Force -ErrorAction Stop | Out-Null
        Write-Host "[OK] Task '$TASK_NAME' registered. Server starts at login." -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "[FAIL] Failed to register task: $_" -ForegroundColor Red
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Verb: uninstall - remove Scheduled Task; -Kill also stops server
# ---------------------------------------------------------------------------
function Invoke-Uninstall {
    param([switch]$Kill)
    if ($Kill) { Invoke-Stop }
    $task = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    if ($task -ne $null) {
        Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false
        Write-Host "[OK] Task '$TASK_NAME' removed" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Task '$TASK_NAME' not registered" -ForegroundColor Gray
    }
    exit 0
}

# ---------------------------------------------------------------------------
# Verb: help - usage reference
# ---------------------------------------------------------------------------
function Show-Help {
    Write-Host ""
    Write-Host "ReplyCators -- Bob Helper Management Script (bob-helper.ps1)" -ForegroundColor Cyan
    Write-Host "============================================================="
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 [verb]"
    Write-Host "  pwsh       -ExecutionPolicy Bypass -File tools\bob-helper.ps1 [verb]"
    Write-Host ""
    Write-Host "Default (no arguments): starts the Bob Helper server (same as 'start')"
    Write-Host ""
    Write-Host "Verbs:"
    Write-Host "  check              Run all 8 pre-flight checks (Node>=18, Bob CLI, port, launcher, TEMP, GPO policy, REPLYCATORS_PS_EXEC_POLICY, legacy task)"
    Write-Host "  start              Start the server in a foreground terminal (Ctrl+C to stop)"
    Write-Host "  stop               Kill any running bob-helper-server.js process"
    Write-Host "  status             Probe /health and show server status"
    Write-Host "  install            Register Windows Scheduled Task (auto-start on login, no admin required)"
    Write-Host "  uninstall [-Kill]  Remove Scheduled Task; -Kill also stops the running server"
    Write-Host "  help               Show this message"
    Write-Host ""
    Write-Host "Configuration (environment variables):"
    Write-Host "  REPLYCATORS_BOB_HELPER_PORT   Override server port (default: 47123)"
    Write-Host "  REPLYCATORS_BOB_HELPER_DEBUG  Set to 1 for verbose server debug logging"
    Write-Host "  RC_NODE_HOME                  Override Node.js directory (e.g. C:\Tools\node)"
    Write-Host "  REPLYCATORS_PS_EXEC_POLICY    Override PowerShell execution policy for spawned scripts (default: Bypass)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 uninstall -Kill"
    Write-Host ""
}

# ---------------------------------------------------------------------------
# Main Dispatch
# ---------------------------------------------------------------------------
switch ($Verb.ToLower()) {
    'check'     { Invoke-Check }
    'start'     { Invoke-Start }
    'stop'      { Invoke-Stop }
    'status'    { Invoke-Status }
    'install'   { Invoke-Install }
    'uninstall' { Invoke-Uninstall -Kill:$Kill }
    'help'      { Show-Help; exit 0 }
    default     { Write-Host "[FAIL] Unknown verb: $Verb. Run 'bob-helper.ps1 help'." -ForegroundColor Red; exit 1 }
}
