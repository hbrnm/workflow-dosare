@echo off
title Service Auto - Sortare Automata Dosar Final
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sorteaza_Dosar_Final.ps1" %*
