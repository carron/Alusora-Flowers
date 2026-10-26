@echo off
setlocal
cd /d "%~dp0"
title ALUSORA Flowers - Iniciar tienda

REM Prefer Python 3.11, which is compatible with the ALUSORA demo.
set "RUNNER="
where py >nul 2>&1
if not errorlevel 1 (
  py -3.11 -c "import sys" >nul 2>&1
  if not errorlevel 1 set "RUNNER=py -3.11"
)
if not defined RUNNER (
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1
    if not errorlevel 1 set "RUNNER=py -3"
  )
)
if not defined RUNNER (
  where python >nul 2>&1
  if not errorlevel 1 (
    python -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1
    if not errorlevel 1 set "RUNNER=python"
  )
)
if not defined RUNNER (
  echo.
  echo ERROR: No se encuentra un interprete Python 3.11 o posterior.
  echo.
  echo Si aparece "NoInstallsError: No runtimes are installed", tienes
  echo Python Install Manager, pero no la version de Python instalada.
  echo.
  echo SOLUCION: abre PowerShell y ejecuta:
  echo   py install 3.11
  echo   py -3.11 --version
  echo.
  echo Si Windows no reconoce "py", ve a:
  echo   https://www.python.org/downloads/windows/
  echo.
  echo Despues vuelve a ejecutar START_HERE_Windows.bat.
  echo.
  pause
  exit /b 1
)

echo Iniciando ALUSORA Flowers con %RUNNER%...
%RUNNER% launch.py
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" echo Servidor cerrado con codigo %CODE%. Copia el error que aparece arriba.
pause
exit /b %CODE%
