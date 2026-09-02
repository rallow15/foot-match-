# Ajoute les variables d'environnement Google OAuth au projet Vercel (mode non-interactif).
# Usage :
#   $cookie = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
#   .\scripts\add-vercel-oauth-env-noninteractive.ps1 -ClientId "..." -ClientSecret "..." -CookieSecret $cookie

param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId,

  [Parameter(Mandatory = $true)]
  [string]$ClientSecret,

  [Parameter(Mandatory = $true)]
  [string]$CookieSecret,

  [string]$Environment = "production"
)

$values = @{
  GOOGLE_CLIENT_ID     = $ClientId
  GOOGLE_CLIENT_SECRET = $ClientSecret
  OAUTH_COOKIE_SECRET  = $CookieSecret
}

foreach ($entry in $values.GetEnumerator()) {
  $name = $entry.Key
  $value = $entry.Value
  Write-Host "Ajout de $name sur Vercel ($Environment)..."
  $value | vercel env add $name $Environment
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Échec de l'ajout de $name."
    exit 1
  }
}

Write-Host "Variables OAuth ajoutées avec succès !" -ForegroundColor Green
