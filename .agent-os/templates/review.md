---
task: {{TASK}}
reviewer: {{AGENT}}
verdict: changes   # approve | changes
date: {{DATE}}
---
# Recenzja {{TASK}}

## Wynik bramek
<!-- wynik: node .agent-os/scripts/gate.mjs --finish (skrót) -->

## Kryteria akceptacji
<!-- każde kryterium z kontraktu: spełnione / niespełnione + dowód (plik:linia, test) -->

## Uwagi blokujące
<!-- błędy, które muszą być poprawione przed approve. Każda: plik:linia, problem, oczekiwana zmiana -->

## Uwagi nieblokujące

## Zgodność z dokumentacją
<!-- ADR, 02-architektura (warstwy, model danych, przepływy), 06-zasady-pracy -->
