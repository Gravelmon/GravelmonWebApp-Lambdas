@echo off
REM Deleting the gravelmon-dynamodb directory from node_modules
echo Removing gravelmon-dynamodb from node_modules...
rmdir /s /q node_modules\gravelmon-dynamodb

REM Deleting package-lock.json
if exist package-lock.json (
    echo Deleting package-lock.json...
    del /q package-lock.json
) else (
    echo package-lock.json not found, skipping deletion.
)

REM Running npm install
echo Running npm install...
npm install

echo Done!