# Test PowerShell simple pour les APIs
$baseUrl = "http://localhost:3000"

Write-Host "🧪 Test des APIs" -ForegroundColor Cyan
Write-Host ""

# Test 1: Page d'accueil
Write-Host "1. Test page d'accueil..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -Method GET -TimeoutSec 30 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Page d'accueil accessible" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Erreur page d'accueil: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: API Audit (simple)
Write-Host "2. Test API audit..." -ForegroundColor Yellow
try {
    $body = @{
        domain    = "example.com"
        mode      = "fast"
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type"     = "application/json"
        "x-requested-with" = "XMLHttpRequest"
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/audit" -Method POST -Body $body -Headers $headers -TimeoutSec 60 -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API audit fonctionne" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        if ($result.success) {
            Write-Host "   - Audit réussi pour example.com" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "❌ Erreur API audit: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: API Admin Stats
Write-Host "3. Test API admin stats..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer admin-demo-token"
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/stats" -Method GET -Headers $headers -TimeoutSec 30 -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API admin stats fonctionne" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        if ($result.success) {
            Write-Host "   - Statistiques récupérées" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "❌ Erreur API admin stats: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎉 Tests terminés" -ForegroundColor Cyan
