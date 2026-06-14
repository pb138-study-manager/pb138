# run_app.ps1
# PowerShell script to orchestrate the Study Manager Docker environment

function check_docker_status {
    Write-Host "Checking if Docker is running..." -ForegroundColor Cyan
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker Desktop is not running or not in your PATH. Please start Docker and try again."
        Exit 1
    }
}

function verify_required_files {
    param (
        [string]$frontend_env_path
    )
    
    Write-Host "Verifying environment prerequisites..." -ForegroundColor Cyan
    
    # Check if frontend .env exists to prevent Docker build failure
    if (-not (Test-Path $frontend_env_path)) {
        Write-Host ""
        Write-Host "--------------------------------------------------------" -ForegroundColor Red
        Write-Host "ERROR: Frontend environment file missing!" -ForegroundColor Red
        Write-Host "Expected at: $frontend_env_path" -ForegroundColor Yellow
        Write-Host "Please create this file with your VITE_SUPABASE_* keys" -ForegroundColor Yellow
        Write-Host "before running this script." -ForegroundColor Yellow
        Write-Host "--------------------------------------------------------" -ForegroundColor Red
        Exit 1
    }
    
    Write-Host "All prerequisite files found." -ForegroundColor Green
}

function wipe_existing_containers {
    Write-Host "Detecting and tearing down any existing instances..." -ForegroundColor Magenta
    
    # down: stops and removes containers/networks created by 'up'
    # -v: deletes anonymous volumes to wipe database states entirely
    # --remove-orphans: cleans up services no longer defined in the compose file
    docker compose down -v --remove-orphans
}

function boot_containers {
    Write-Host "Building and starting Study Manager containers fresh..." -ForegroundColor Cyan
    
    # --build forces Docker to re-evaluate the local Dockerfiles and layers
    docker compose up --build -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host " Study Manager App successfully deployed!    " -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
        Write-Host "Backend:  http://localhost:3001" -ForegroundColor Yellow
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "Run 'docker compose logs -f' to stream application logs." -ForegroundColor Gray
    } else {
        Write-Error "Docker Compose failed to spin up the services."
    }
}

function main {
    # Define paths relative to the root execution context
    $frontend_env_path = ".\apps\frontend\.env"
    
    check_docker_status
    verify_required_files -frontend_env_path $frontend_env_path
    wipe_existing_containers
    boot_containers
}

# Execute script entrypoint
main