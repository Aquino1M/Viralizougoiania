@echo off
git add lib/football-sync.ts lib/server-radar-automation.ts lib/storage.ts
git commit -m "fix: radar automation speed, robust queue and deduplication"
git push origin main
echo DONE
