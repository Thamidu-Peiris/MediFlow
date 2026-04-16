<#
.SYNOPSIS
  MediFlow - Dev Webhook Setup (Stripe + PayHere via ngrok)

.DESCRIPTION
  1. Starts ngrok to expose the API Gateway publicly (needed by PayHere notify_url)
  2. Gets the ngrok HTTPS URL and writes it into the payment-service .env
  3. Starts the Stripe CLI listener in a new terminal window

.USAGE
  cd backend
  .\start-webhooks.ps1

  Optional flags:
    -GatewayPort 8081   # Port your API Gateway is on (default: 8081)
    -SkipStripe         # Skip starting the Stripe CLI listener
    -SkipNgrok          # Skip ngrok (if you already have it running)
#>
param(
    [int]   $GatewayPort = 8081,
    [switch]$SkipStripe,
    [switch]$SkipNgrok
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile   = Join-Path $ScriptDir "services\payment-service\.env"

# Refresh PATH so tools installed this session (winget/choco) are found
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("PATH","User")

# ── Helpers ──────────────────────────────────────────────────────────────────
function Write-Header([string]$msg) {
    $line = "-" * $msg.Length
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "  $line" -ForegroundColor DarkGray
}

function Write-Ok([string]$msg)   { Write-Host "  [OK]  $msg" -ForegroundColor Green  }
function Write-Warn([string]$msg) { Write-Host "  [!!]  $msg" -ForegroundColor Yellow }
function Write-Err([string]$msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red    }
function Write-Info([string]$msg) { Write-Host "  [..]  $msg" -ForegroundColor Gray   }

function Update-EnvKey([string]$file, [string]$key, [string]$value) {
    $content = Get-Content $file -Raw
    if ($content -match "(?m)^$key=.*$") {
        $content = $content -replace "(?m)^$key=.*$", "$key=$value"
    } else {
        $content = $content.TrimEnd() + "`n$key=$value`n"
    }
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
}

function Read-EnvKey([string]$file, [string]$key) {
    $line = Get-Content $file | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if ($line) { return ($line.Substring($key.Length + 1)).Trim() }
    return $null
}

function Test-CommandExists([string]$cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Get-NgrokUrl {
    try {
        $resp   = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
        $tunnel = $resp.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($tunnel) { return $tunnel.public_url }
    } catch {}
    return $null
}

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  +----------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  MediFlow - Webhook Dev Setup                |" -ForegroundColor Cyan
Write-Host "  |  Stripe CLI  +  ngrok (for PayHere)          |" -ForegroundColor Cyan
Write-Host "  +----------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# ── Prerequisites ─────────────────────────────────────────────────────────────
Write-Header "Checking prerequisites"

if (-not (Test-Path $EnvFile)) {
    Write-Err "payment-service .env not found at: $EnvFile"
    Write-Info "Expected: backend\services\payment-service\.env"
    exit 1
}
Write-Ok "payment-service .env found"

$ngrokFound  = Test-CommandExists "ngrok"
$stripeFound = Test-CommandExists "stripe"

if (-not $ngrokFound  -and -not $SkipNgrok)  {
    Write-Warn "ngrok not found in PATH  -> install from https://ngrok.com/download"
}
if (-not $stripeFound -and -not $SkipStripe) {
    Write-Warn "Stripe CLI not found     -> install from https://stripe.com/docs/stripe-cli"
}

# ── Detect API Gateway ────────────────────────────────────────────────────────
Write-Header "Detecting API Gateway"

$gatewayRunning = $false
foreach ($port in @($GatewayPort, 8080, 8081)) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$port/api/health" `
                               -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            $GatewayPort    = $port
            $gatewayRunning = $true
            Write-Ok "API Gateway is running on :$GatewayPort"
            break
        }
    } catch {}
}

if (-not $gatewayRunning) {
    Write-Warn "API Gateway not detected on :$GatewayPort (or :8080 / :8081)"
    Write-Info "Start it first:  cd backend\api-gateway && npm start"
    Write-Info "Continuing anyway - ngrok will still start."
}

# ── Step 1: ngrok ─────────────────────────────────────────────────────────────
$ngrokUrl = $null

if (-not $SkipNgrok) {
    Write-Header "Starting ngrok -> :$GatewayPort"

    $existing = Get-NgrokUrl
    if ($existing) {
        Write-Warn "ngrok already running: $existing"
        Write-Host "  Use existing tunnel? [Y/n]: " -NoNewline -ForegroundColor Yellow
        $ans = Read-Host
        if ($ans -ne "n" -and $ans -ne "N") {
            $ngrokUrl = $existing
            Write-Ok "Using existing tunnel: $ngrokUrl"
        } else {
            Write-Info "Stopping existing ngrok..."
            Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }

    if (-not $ngrokUrl) {
        if (-not $ngrokFound) {
            Write-Err "ngrok is not installed. PayHere webhook won't work without it."
            Write-Info "Install: https://ngrok.com/download"
            Write-Info "After installing, run:  ngrok config add-authtoken <YOUR_TOKEN>"
        } else {
            Write-Info "Launching: ngrok http $GatewayPort"
            Start-Process -FilePath "ngrok" `
                          -ArgumentList "http $GatewayPort" `
                          -WindowStyle Minimized

            Write-Info "Waiting for ngrok to initialise..."
            $retries = 0
            while ($retries -lt 24 -and -not $ngrokUrl) {
                Start-Sleep -Milliseconds 500
                $ngrokUrl = Get-NgrokUrl
                $retries++
            }

            if ($ngrokUrl) {
                Write-Ok "ngrok URL: $ngrokUrl"
            } else {
                Write-Err "ngrok did not respond in time. Check http://localhost:4040"
                Write-Info "If on a free account, set your authtoken first:"
                Write-Info "  ngrok config add-authtoken <YOUR_TOKEN>"
            }
        }
    }
} else {
    Write-Info "Skipping ngrok (-SkipNgrok flag set)"
    $ngrokUrl = Read-EnvKey -file $EnvFile -key "API_PUBLIC_URL"
    Write-Info "Current API_PUBLIC_URL: $ngrokUrl"
}

# ── Step 2: Write ngrok URL to .env ──────────────────────────────────────────
if ($ngrokUrl) {
    Write-Header "Updating payment-service .env"

    Update-EnvKey -file $EnvFile -key "API_PUBLIC_URL" -value $ngrokUrl
    Write-Ok "API_PUBLIC_URL = $ngrokUrl"
    Write-Info "PayHere notify_url will be: $ngrokUrl/api/payments/webhooks/payhere"

    $phId = Read-EnvKey -file $EnvFile -key "PAYHERE_MERCHANT_ID"
    if (-not $phId -or $phId -eq "REPLACE_ME" -or $phId -eq "") {
        Write-Warn "PAYHERE_MERCHANT_ID is not set in .env"
        Write-Info "Get sandbox creds from: https://www.payhere.lk/merchant/#/settings"
    } else {
        Write-Ok "PAYHERE_MERCHANT_ID is set: $phId"
    }
}

# ── Step 3: Stripe CLI ────────────────────────────────────────────────────────
if (-not $SkipStripe) {
    Write-Header "Starting Stripe CLI listener"

    if (-not $stripeFound) {
        Write-Err "Stripe CLI not installed."
        Write-Info "Install: https://stripe.com/docs/stripe-cli"
        Write-Host ""
        Write-Info "Run this manually in a new terminal:"
        Write-Host "    stripe listen --forward-to localhost:$GatewayPort/api/payments/webhooks/stripe" `
                   -ForegroundColor Yellow
    } else {
        $stripeTarget = "localhost:$GatewayPort/api/payments/webhooks/stripe"
        Write-Info "Forwarding Stripe events -> $stripeTarget"

        $launchCmd = "stripe listen --forward-to $stripeTarget"
        $title     = "Stripe CLI - Webhook Listener"
        $banner    = "Copy the whsec_... value below into payment-service\.env as STRIPE_WEBHOOK_SECRET, then restart the service."

        Start-Process powershell -ArgumentList (
            "-NoExit", "-Command",
            "`$host.UI.RawUI.WindowTitle = '$title'; " +
            "Write-Host '$banner' -ForegroundColor Yellow; " +
            "Write-Host ''; " +
            "$launchCmd"
        ) -WindowStyle Normal

        Write-Ok "Stripe CLI window opened"
        Write-Warn "NEXT: Copy the whsec_... from the Stripe window into .env"
        Write-Info "Key:  STRIPE_WEBHOOK_SECRET=whsec_..."
        Write-Info "Then restart the payment service (npm run dev)."

        $whsec = Read-EnvKey -file $EnvFile -key "STRIPE_WEBHOOK_SECRET"
        if (-not $whsec -or $whsec -eq "whsec_REPLACE_ME" -or $whsec -eq "whsec_...") {
            Write-Warn "STRIPE_WEBHOOK_SECRET not set yet - update it once Stripe CLI shows the secret."
        } else {
            $preview = $whsec.Substring(0, [Math]::Min(14, $whsec.Length))
            Write-Ok "STRIPE_WEBHOOK_SECRET already set: ${preview}..."
        }
    }
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  +==================================================+" -ForegroundColor Cyan
Write-Host "  |  WEBHOOK SETUP SUMMARY                          |" -ForegroundColor Cyan
Write-Host "  +==================================================+" -ForegroundColor Cyan
Write-Host ""

Write-Host "  STRIPE WEBHOOKS" -ForegroundColor White
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Method:    Stripe CLI (direct localhost forward)"   -ForegroundColor Gray
Write-Host "  Endpoint:  localhost:$GatewayPort/api/payments/webhooks/stripe" -ForegroundColor Gray
Write-Host "  Env key:   STRIPE_WEBHOOK_SECRET=whsec_..."         -ForegroundColor Yellow
Write-Host "  Action:    Copy whsec_ from Stripe CLI -> .env -> restart service" -ForegroundColor Yellow
Write-Host ""

Write-Host "  PAYHERE / HELAPAY WEBHOOKS" -ForegroundColor White
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
if ($ngrokUrl) {
    Write-Host "  Method:      ngrok tunnel -> API Gateway"          -ForegroundColor Gray
    Write-Host "  notify_url:  $ngrokUrl/api/payments/webhooks/payhere" -ForegroundColor Green
    Write-Host "  Env key:     API_PUBLIC_URL (already updated)"     -ForegroundColor Green
    Write-Host "  ngrok UI:    http://localhost:4040"                 -ForegroundColor Gray
} else {
    Write-Host "  ngrok not running - PayHere notify_url won't work!" -ForegroundColor Red
    Write-Host "  Fix: install ngrok and re-run this script."         -ForegroundColor Yellow
}
Write-Host ""

Write-Host "  REQUEST FLOW" -ForegroundColor White
Write-Host "  --------------------------------------------------"                                         -ForegroundColor DarkGray
Write-Host "  Stripe:  Cloud -> stripe listen -> :$GatewayPort/api/payments/webhooks/stripe -> :8006"    -ForegroundColor Gray
Write-Host "  PayHere: Cloud -> ngrok -> :$GatewayPort/api/payments/webhooks/payhere -> :8006"            -ForegroundColor Gray
Write-Host ""
Write-Host "  .env:  $EnvFile" -ForegroundColor DarkGray
Write-Host "  Guide: $(Join-Path $ScriptDir 'WEBHOOK_DEV.md')" -ForegroundColor DarkGray
Write-Host ""
