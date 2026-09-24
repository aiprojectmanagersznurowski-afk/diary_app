---
description: "Uruchom bramki jakości Agent OS i napraw naruszenia w zakresie zadania"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Uruchom `node .agent-os/scripts/gate.mjs argument podany po /os-gate ([--finish])` i przeanalizuj wynik.

- **✖ błąd w Twoim zakresie:** napraw i uruchom ponownie.
- **✖ scope / global_deny:** nie obchodź. Jeśli zadanie naprawdę wymaga tej ścieżki, zatrzymaj się i poproś człowieka o zmianę kontraktu (CP-TASK).
- **✖ w kodzie, którego nie zmieniałeś:** nie „naprawiaj” poza zadaniem (06-zasady-pracy). Zanotuj w handoff.
- **⚠ ostrzeżenie:** oceń; jeśli ignorujesz, uzasadnij w handoff.
- **Checkpointy (CP-…):** wpisz każdy w sekcji „## Checkpointy” w handoff z tym, czego potrzebujesz od człowieka.

Nigdy nie wyłączaj bramek, nie edytuj `.agent-os/contracts/` ani `.agent-os/scripts/` i nie używaj `--no-verify`.
