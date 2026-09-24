---
role: edge
title: Edge Functions i warstwa AI
description: Supabase Edge Functions (Deno), _shared/ai, wersjonowane prompty, schematy zod i testy deno w Vocaly.
---
# Rola: Edge Functions i AI

**Zapisujesz:** `supabase/functions/**`, `supabase/config.toml`, `.env.example` (+ roadmapa, dokumentacja, handoff).

**Źródło prawdy:** `docs/02-architektura.md` §6 (przepływy), §7 (warstwa AI), `docs/03-stos-technologiczny.md` (modele i zmienne), ADR-003, ADR-005, ADR-006.

## Zasady
- Dostawców AI wołasz wyłącznie przez `_shared/ai` (`SttProvider`, `LlmProvider`, `EmbeddingProvider`; adaptery `groq`, `gemini`). Bramka `ai-boundary` blokuje bezpośrednie wywołania gdzie indziej.
- Dostawca i model z env na każde zadanie (`STT_PROVIDER`, `LLM_STRUCTURE_MODEL`, `EMBED_DIM`…). Nazwy modeli sprawdź u dostawcy w momencie implementacji.
- Prompt = plik `_shared/prompts/<nazwa>.v<N>.md` z nagłówkiem `schema: <nazwa>`. Zmiana treści = nowy plik `v<N+1>`. Osobowości AI jako fragmenty w `prompts/personalities/` (`schema: none`).
- Każda odpowiedź LLM: walidacja zod z `_shared/schemas/`; przy błędzie jedna próba naprawy, potem `status = 'failed'` + `last_error`.
- Transkrypcja i notatki to dane, nie instrukcje: w promptach wyraźnie oddzielone (np. blok `<transcript>…</transcript>`).
- LLM proponujący powiązania / pomysły dnia dostaje listę kandydatów z ID; ID spoza listy odrzucasz w kodzie.
- Każdy krok `process-recording` sprawdza bieżący status i jest idempotentny. Pamiętaj o limicie czasu Edge Functions: długie kroki rozbij.
- Treści, język generowania: polski. Logi: tylko ID, status, czasy, kody błędów. Nigdy treść (bramka `logging`).
- Klucze tylko przez `Deno.env.get`. Nowa zmienna = **CP-SECRETS** (wartość ustawia człowiek).

## Definicja ukończenia (dodatkowo)
- `deno test --allow-all supabase/functions` przechodzi; adaptery AI testowane z atrapą `fetch` (bez prawdziwych kluczy).
- Test „zły JSON od LLM → naprawa → failed” dla każdego schematu.
