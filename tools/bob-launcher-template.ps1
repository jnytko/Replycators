# ReplyCators - Bob Launcher Template (PowerShell)
# All values are injected by bob-helper-server.js as environment variables.
# Environment variables provided by the server:
#   RC_BOB_COMMAND - absolute path to the resolved bob.ps1 executable
#   RC_PROMPT_FILE - absolute path to the prompt .txt file containing assembled prompt
#   RC_WORKING_DIR - Bob Working Directory from Settings (may be empty)
#   RC_INCLUDE_DIR - same as RC_WORKING_DIR but with trailing separators stripped
#   RC_DIAG_MODE   - "1" = diagnostic mode; "0" = normal mode
#   BOB_API_KEY    - BobShell 2.0 API key (present only when configured; absent for Bob 1.0)

$ErrorActionPreference = 'Stop'

try {

    if ([string]::IsNullOrWhiteSpace($env:RC_BOB_COMMAND)) {
        throw "Missing Bob command path (RC_BOB_COMMAND not set)."
    }

    if ([string]::IsNullOrWhiteSpace($env:RC_PROMPT_FILE) -or -not (Test-Path -Path $env:RC_PROMPT_FILE)) {
        throw "Missing or invalid prompt file (RC_PROMPT_FILE: '$env:RC_PROMPT_FILE')."
    }

    if (-not [string]::IsNullOrWhiteSpace($env:RC_WORKING_DIR)) {
        if (-not (Test-Path -Path $env:RC_WORKING_DIR)) {
            throw "Working directory does not exist: '$env:RC_WORKING_DIR'."
        }
        Set-Location -Path $env:RC_WORKING_DIR
    }

    # ── Status file helpers ──────────────────────────────────────────────────
    # RC_STATUS_FILE is the absolute path to the .status.json companion file
    # written by bob-helper-server.js alongside the prompt. The launcher writes
    # execution state transitions so the /status/:requestId endpoint stays current.
    function Write-BobStatus {
        param(
            [string]$State,
            [object]$ExitCode    = $null,
            [object]$StartedAt   = $null,
            [object]$CompletedAt = $null,
            [object]$ErrorMsg    = $null
        )
        if ([string]::IsNullOrWhiteSpace($env:RC_STATUS_FILE)) { return }
        try {
            $obj = [PSCustomObject]@{
                state        = $State
                exitCode     = $ExitCode
                startedAt    = $StartedAt
                completedAt  = $CompletedAt
                errorMessage = $ErrorMsg
            }
            $json = $obj | ConvertTo-Json -Compress
            [System.IO.File]::WriteAllText($env:RC_STATUS_FILE, $json, [System.Text.Encoding]::UTF8)
        } catch {
            # Non-fatal - status write failure must not block Bob execution
        }
    }

    # Delete the .lock file to signal that the prompt has been consumed. The
    # server cleanup code will not delete the .txt while the .lock exists.
    function Remove-LockFile {
        $lockPath = $env:RC_PROMPT_FILE -replace '\.txt$', '.lock'
        if (-not [string]::IsNullOrWhiteSpace($lockPath) -and (Test-Path $lockPath)) {
            try { Remove-Item -Path $lockPath -Force -ErrorAction SilentlyContinue } catch {}
        }
    }

    # ── Bob version detection ────────────────────────────────────────────────
    # Invoke bob.ps1 -v to determine the major version.
    # Bob 1.x: pipe prompt via stdin with --trust -y --include-directories=<dir>
    # Bob 2.x: pass prompt inline via -p flag; no piping, no --trust, no -y
    # Fallback to major version 1 on any detection failure so the safe legacy
    # path is always used when version cannot be confirmed.
    $bobMajorVersion = 1
    try {
        $vResult = & $env:RC_BOB_COMMAND -v 2>&1
        $vLine   = ($vResult | Out-String).Trim().Split("`n")[0].Trim()
        if ($vLine -match '^(\d+)') {
            $bobMajorVersion = [int]$Matches[1]
        }
    } catch {
        # Non-fatal - fall back to version 1 invocation path
        $bobMajorVersion = 1
    }

    $promptBasename = Split-Path -Path $env:RC_PROMPT_FILE -Leaf

    # Read prompt content and release lock before invoking Bob.
    # Lock deletion signals to the server cleanup that the file is safe to remove.
    $promptContent = Get-Content -Path $env:RC_PROMPT_FILE -Raw -Encoding UTF8
    Remove-LockFile

    # v1.45.0: Explicitly set BOB_API_KEY in this PowerShell session's environment
    # so it is visible to any Node.js process that bob.ps1 spawns internally.
    # The value arrives via the inherited process environment from bob-helper-server.js,
    # but re-assigning it here guarantees it survives any intermediate shell hop
    # (cmd.exe -> powershell.exe -> bob.ps1 -> node).
    # Only set when the variable is already populated (Bob 1.0 mode leaves it absent).
    if (-not [string]::IsNullOrWhiteSpace($env:BOB_API_KEY)) {
        [System.Environment]::SetEnvironmentVariable('BOB_API_KEY', $env:BOB_API_KEY, 'Process')
    }

    if ($env:RC_DIAG_MODE -eq '1') {
        $host.UI.RawUI.WindowTitle = "[DIAG] IBM Bob - $promptBasename"
        Write-Host "============================================================"
        Write-Host " DIAGNOSTIC MODE"
        Write-Host "============================================================"
        Write-Host " Timestamp   : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        Write-Host " Bob cmd     : $env:RC_BOB_COMMAND"
        Write-Host " Bob version : $bobMajorVersion.x (detected)"
        Write-Host " Prompt file : $env:RC_PROMPT_FILE"
        Write-Host " Working     : $env:RC_WORKING_DIR"
        Write-Host " Include     : $env:RC_INCLUDE_DIR"
        Write-Host " BOB_API_KEY : $(if ($env:BOB_API_KEY) { '[set]' } else { '[not set]' })"
        Write-Host "------------------------------------------------------------"
        Write-Host " Launching IBM Bob..."
        Write-Host "------------------------------------------------------------"

        Write-BobStatus -State 'running' -StartedAt ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())

        if ($bobMajorVersion -ge 2) {
            & $env:RC_BOB_COMMAND -p $promptContent
        } else {
            $promptContent | & $env:RC_BOB_COMMAND --trust -y --include-directories="$env:RC_INCLUDE_DIR"
        }
        $exitCode = $LASTEXITCODE

        $completedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        if ($exitCode -eq 0) {
            Write-BobStatus -State 'completed' -ExitCode $exitCode -CompletedAt $completedAt
        } else {
            Write-BobStatus -State 'failed' -ExitCode $exitCode -CompletedAt $completedAt -ErrorMsg "Bob exited with code $exitCode"
        }

        Write-Host ""
        Write-Host "------------------------------------------------------------"
        Write-Host " Bob exit code : $exitCode"
        Write-Host " Completed at  : $(Get-Date -Format 'HH:mm:ss')"
        Write-Host "============================================================"
        Read-Host "Review the output above, then press Enter to close"
        exit $exitCode
    } else {
        $host.UI.RawUI.WindowTitle = "IBM Bob - $promptBasename"
        Write-Host "Launching IBM Bob..."

        Write-BobStatus -State 'running' -StartedAt ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())

        if ($bobMajorVersion -ge 2) {
            & $env:RC_BOB_COMMAND -p $promptContent
        } else {
            $promptContent | & $env:RC_BOB_COMMAND --trust -y --include-directories="$env:RC_INCLUDE_DIR"
        }
        $exitCode = $LASTEXITCODE

        $completedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        if ($exitCode -eq 0) {
            Write-BobStatus -State 'completed' -ExitCode $exitCode -CompletedAt $completedAt
        } else {
            Write-BobStatus -State 'failed' -ExitCode $exitCode -CompletedAt $completedAt -ErrorMsg "Bob exited with code $exitCode"
        }

        Write-Host ""
        Write-Host "Bob finished (exit code: $exitCode)."
        exit $exitCode
    }

} catch {
    $errMsg = "ERROR: $_"
    Write-Host ""
    Write-Host $errMsg -ForegroundColor Red
    Write-Host ""

    # Write the error to a persistent log file so it survives window close.
    # stdin is bound to NUL (stdio:'ignore' in Node spawn), so Read-Host returns
    # immediately and the window closes before the user can read the message.
    # The log file is always written so support can retrieve it even when the
    # window closed too fast to read. Path mirrors the launcher's temp directory.
    try {
        $logDir = if ($env:TEMP) { Join-Path $env:TEMP 'replycators-bob-helper' } else { $PSScriptRoot }
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        $logPath = Join-Path $logDir 'last-error.log'
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $logLine = "[$timestamp] $errMsg`n  RC_BOB_COMMAND=$env:RC_BOB_COMMAND`n  RC_PROMPT_FILE=$env:RC_PROMPT_FILE`n  RC_WORKING_DIR=$env:RC_WORKING_DIR`n"
        [System.IO.File]::AppendAllText($logPath, $logLine)
        Write-Host "Error details saved to: $logPath" -ForegroundColor Yellow
        Write-Host ""
    } catch {
        # Non-fatal - log write failure must not mask the original error
    }

    Write-BobStatus -State 'failed' -ExitCode 1 -CompletedAt ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) -ErrorMsg $errMsg
    Remove-LockFile
    Read-Host "Press Enter to close"
    exit 1
}
