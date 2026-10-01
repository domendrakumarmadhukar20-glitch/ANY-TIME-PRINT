# HP LaserJet Pro MFP M126nw — ATP Windows 10 Print Agent Setup Guide

This document describes how to setup and run the **ATP Print Agent** on a Windows 10 Pro computer connected to an **HP LaserJet Pro MFP M126nw** printer.

---

## 1. Hardware Requirements
1. **Windows 10 Pro** computer with internet connection.
2. **HP LaserJet Pro MFP M126nw** connected via USB or Local Network / Wi-Fi (IP: e.g. `192.168.1.105`).
3. Official HP Driver installed:
   - Go to Windows Settings -> Devices -> Printers & Scanners.
   - Verify the printer appears as: `HP LaserJet Pro MFP M126nw`
   - Print a Windows Test Page to verify hardware readiness.

---

## 2. Software Prerequisites
1. **Python 3.10+** (ensure "Add Python to PATH" is checked during install).
2. (Optional but recommended for silent duplex printing): **SumatraPDF** installed to `C:\Program Files\SumatraPDF\SumatraPDF.exe`.

---

## 3. Quick Start Configuration
1. Open `config.json`:
   ```json
   {
     "server_url": "https://<YOUR_ATP_APP_DOMAIN>",
     "machine_id": "ATP-XAV-001",
     "machine_token": "atp_sec_xav_lib_01_98f4a",
     "printer_name": "HP LaserJet Pro MFP M126nw",
     "poll_interval_seconds": 3,
     "heartbeat_interval_seconds": 10,
     "auto_delete_temp_files": true
   }
   ```
2. Double-click `run_agent.bat`.
3. The agent will:
   - Verify Python and dependencies
   - Connect to the ATP cloud server with the machine token
   - Send regular heartbeats with printer paper/toner status
   - Automatically receive verified print jobs and spool them immediately to the HP printer
   - Clean up downloaded PDF files immediately after printing

---

## 4. Run on Windows Startup (Automatic Recovery)
To ensure the agent starts automatically after power failure or reboot:
1. Press `Win + R`, type `shell:startup` and press Enter.
2. Create a shortcut to `run_agent.bat` in this folder.
3. Windows will now auto-launch the ATP Agent upon boot.
