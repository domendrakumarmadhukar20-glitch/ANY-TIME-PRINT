@echo off
TITLE ATP Print Agent - HP LaserJet Pro MFP M126nw
COLOR 0A
echo ======================================================================
echo           COLLEGE ANY TIME PRINT (ATP) WINDOWS 10 AGENT
echo           Connected to HP LaserJet Pro MFP M126nw
echo ======================================================================
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.10+ is required but not found in PATH!
    echo Please install Python from https://python.org and tick 'Add Python to PATH'.
    pause
    exit /b 1
)

echo Installing required Python packages (requests, pypiwin32)...
pip install requests pywin32 --quiet

:MENU
echo.
echo ======================================================================
echo           SELECT ACTION (कार्य चुनें):
echo ======================================================================
echo [1] Start ATP Print Agent (सर्वर से प्रिंट जॉब्स सुनना)
echo [2] Print Test Page to HP LaserJet Pro MFP M126nw (सीधे प्रिंटर टेस्ट करें)
echo [3] Check Connected Printers in Windows (कंप्यूटर में जुड़े प्रिंटर देखें)
echo [4] Exit (बंद करें)
echo ======================================================================
set /p choice="Enter choice (1, 2, 3 or 4) and press ENTER: "

if "%choice%"=="1" (
    echo.
    echo Starting ATP Print Agent Service...
    python atp_agent.py
    echo.
    pause
    goto MENU
)
if "%choice%"=="2" (
    echo.
    echo Sending Hardware Test Page to HP LaserJet Pro MFP M126nw...
    python atp_agent.py --test-print
    echo.
    pause
    goto MENU
)
if "%choice%"=="3" (
    echo.
    echo Scanning Windows Printers...
    python atp_agent.py --check-printer
    echo.
    pause
    goto MENU
)
if "%choice%"=="4" (
    exit /b 0
)

echo.
echo Invalid choice. Please type 1, 2, 3 or 4.
goto MENU
