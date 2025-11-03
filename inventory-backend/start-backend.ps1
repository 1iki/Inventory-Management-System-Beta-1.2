Write-Host ' Starting Inventory Backend Server' -ForegroundColor Cyan
Write-Host '=================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Environment Configuration:' -ForegroundColor Yellow
Write-Host '   NODE_TLS_REJECT_UNAUTHORIZED = 0 (Development Only)' -ForegroundColor Gray
Write-Host '   PORT = 3001' -ForegroundColor Gray
Write-Host '   NODE_ENV = development' -ForegroundColor Gray
Write-Host ''
Write-Host '  WARNING: TLS validation is disabled!' -ForegroundColor Red
Write-Host '   This is ONLY for development with MongoDB Atlas' -ForegroundColor Red
Write-Host '   Do NOT use in production!' -ForegroundColor Red
Write-Host ''
Write-Host ' Backend will be available at: http://localhost:3001' -ForegroundColor Green
Write-Host ''
Write-Host 'Starting server...' -ForegroundColor White
Write-Host ''

$env:NODE_TLS_REJECT_UNAUTHORIZED='0'
$env:NODE_ENV='development'

npm run dev:safe
