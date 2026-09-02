# Ajoute les variables d'environnement Google OAuth au projet Vercel.
# Ce script est conçu pour être exécuté localement dans PowerShell.
# Il ne stocke aucun secret dans un fichier.

param(
  [string]$Environment = "production"
)

function Read-SecureValue {
  param([string]$Prompt)
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

Write-Host "Configuration des variables OAuth pour l'environnement : $Environment" -ForegroundColor Cyan

$clientId = Read-Host -Prompt "Colle ton GOOGLE_CLIENT_ID"
$clientSecret = Read-SecureValue -Prompt "Colle ton GOOGLE_CLIENT_SECRET"
$cookieSecret = Read-SecureValue -Prompt "Colle ta OAUTH_COOKIE_SECRET (openssl rand -base64 32)"

if (-not $clientId -or -not $clientSecret -or -not $cookieSecret) {
  Write-Error "Toutes les valeurs sont obligatoires."
  exit 1
}

$values = @{
  GOOGLE_CLIENT_ID      = $clientId
  GOOGLE_CLIENT_SECRET  = $clientSecret
  OAUTH_COOKIE_SECRET   = $cookieSecret
}

foreach ($entry in $values.GetEnumerator()) {
  $name = $entry.Key
  $value = $entry.Value
  Write-Host "Ajout de $name ..."
  $value | vercel env add $name $Environment
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Échec de l'ajout de $name. Vérifie que tu es connecté à Vercel (vercel login)."
    exit 1
  }
}

Write-Host "Variables OAuth ajoutées avec succès !" -ForegroundColor Green
Write-Host "Pense a redemarrer les deployments pour qu'elles soient prises en compte."
