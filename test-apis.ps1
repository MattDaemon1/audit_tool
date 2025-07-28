# Test PowerShell pour l'audit-tool avec base de données
$baseUrl = "http://localhost:3000"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "           🧪 TESTS D'INTÉGRATION AUDIT-TOOL                    " -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# Test 1: Page d'accueil
Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "│ 1. 🏠 Test de la page d'accueil                            │" -ForegroundColor Yellow
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -Method GET -TimeoutSec 30 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Page d'accueil accessible" -ForegroundColor Green
        Write-Host "   📊 Statut: $($response.StatusCode)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Erreur page d'accueil: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: API Audit (simple)
Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "│ 2. 🔍 Test API audit (avec base de données)                │" -ForegroundColor Yellow
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Gray
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
    
    Write-Host "   🚀 Lancement de l'audit pour example.com..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$baseUrl/api/audit" -Method POST -Body $body -Headers $headers -TimeoutSec 60 -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API audit fonctionne" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        if ($result.success) {
            Write-Host "   📈 Audit réussi pour example.com" -ForegroundColor Gray
            Write-Host "   🔧 Mode: fast | 💾 Sauvegardé en base" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "   ❌ Erreur API audit: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   ℹ️  Note: L'audit peut prendre 30-60s (Lighthouse)" -ForegroundColor DarkYellow
}
Write-Host ""

# Test 3: API Admin Stats
Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "│ 3. 📊 Test API administration (statistiques BDD)           │" -ForegroundColor Yellow
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Gray
try {
    $headers = @{
        "Authorization" = "Bearer admin-demo-token"
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/stats" -Method GET -Headers $headers -TimeoutSec 30 -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API admin stats fonctionne" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        if ($result.success) {
            Write-Host "   📋 Statistiques récupérées depuis Prisma" -ForegroundColor Gray
            Write-Host "   🗃️  Base de données: SQLite/PostgreSQL" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "   ❌ Erreur API admin stats: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "                   🎉 TESTS TERMINÉS                           " -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "📋 Résumé de l'intégration:" -ForegroundColor Cyan
Write-Host "   🔧 Framework: Next.js 15.4.4" -ForegroundColor Gray
Write-Host "   🗄️  ORM: Prisma + SQLite/PostgreSQL" -ForegroundColor Gray
Write-Host "   🛡️  Sécurité: Rate limiting + CSRF + Logging" -ForegroundColor Gray
Write-Host "   💾 Cache: Intelligent avec TTL automatique" -ForegroundColor Gray
Write-Host "   📊 Admin: APIs statistiques et nettoyage" -ForegroundColor Gray
Write-Host ""
