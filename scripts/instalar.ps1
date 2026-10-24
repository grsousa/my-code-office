# Instala a extensão no VS Code. Com -ComHooks, liga também os hooks do Claude Code (estado ao vivo).
# Uso: powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 [-ComHooks]
param([switch]$ComHooks)
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$vsix = Get-ChildItem -Path $raiz -Filter "my-code-office-*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($null -eq $vsix) {
    Write-Host "Nenhum .vsix encontrado. Gere com: npx @vscode/vsce@2.32.0 package --no-dependencies --allow-missing-repository --skip-license"
    exit 1
}
code --install-extension $vsix.FullName --force
if ($ComHooks) {
    node (Join-Path $raiz "scripts\configurar-hooks.js") instalar
    Write-Host "Hooks ligados. Valem para conversas novas do Claude Code; as abertas continuam no modo estimado."
}
Write-Host "Pronto. Rode 'Developer: Reload Window' e abra a aba Escritório (Office) no painel inferior."
