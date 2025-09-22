Write-Host "🚀 Starting MUJAA Document Generator Server..." -ForegroundColor Green
Write-Host "📝 Running without nodemon to prevent restart loops" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

try {
    node server.js
} catch {
    Write-Host "❌ Server failed to start: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
