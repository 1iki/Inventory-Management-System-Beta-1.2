@echo off
echo  Starting Backend with TLS bypass (DEVELOPMENT ONLY)
echo.
set NODE_TLS_REJECT_UNAUTHORIZED=0
set NODE_ENV=development
echo  Environment:
echo    NODE_TLS_REJECT_UNAUTHORIZED=0
echo    NODE_ENV=development
echo.
npm run dev
