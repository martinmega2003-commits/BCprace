# Prepne te do lokalni databaze (psql v Docker kontejneru rebulid01-db).
# Spusteni (PowerShell, ve slozce Rebulid01):
#   .\DB\psql.ps1
#
# -x            = kazdy sloupec na vlastni radek (jako \x)
# -P pager=off  = vysledek se vypise rovnou, bez strankovace (END)
# Konec: \q

# kdyz databaze nebezi, nejdriv ji spust
$bezi = docker ps --filter "name=rebulid01-db" --format "{{.Names}}"
if (-not $bezi) {
    Write-Host "Databaze nebezi, spoustim ji..."
    docker compose -f "$PSScriptRoot\..\docker-compose.yml" up -d db
    Start-Sleep -Seconds 3
}

docker exec -it rebulid01-db psql -U bcprace -d bcprace -x -P pager=off
