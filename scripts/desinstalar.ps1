# Remove a extensão e desliga os hooks do My Code Office (o settings.json ganha um backup antes).
# Uso: powershell -ExecutionPolicy Bypass -File scripts\desinstalar.ps1
$raiz = Split-Path -Parent $PSScriptRoot
code --uninstall-extension gleise.my-code-office
node (Join-Path $raiz "scripts\configurar-hooks.js") remover
Write-Host "Extensão removida e hooks desligados. O estado gravado fica em ~/.claude/my-code-office (pode apagar se quiser)."
