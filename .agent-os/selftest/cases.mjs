// Przypadki testowe Agent OS. Każda bramka musi mieć co najmniej jeden przypadek, który ją „zabija”.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse as parseYaml } from '../scripts/lib/yaml.mjs';
import { matchAny } from '../scripts/lib/glob.mjs';
import { analyzeSql } from '../scripts/gates/migrations.mjs';

// Fałszywe sekrety składane w locie, żeby ten plik nie zawierał niczego, co wygląda jak klucz.
const FAKE_GROQ = 'gsk' + '_' + 'Ab1'.repeat(15);

export function FIXTURE(repo) {
  const tasksDir = path.join(repo, '.agent-os/tasks');
  const roadmapLines = fs.readdirSync(tasksDir).filter(f => f.endsWith('.yaml')).sort()
    .map(f => parseYaml(fs.readFileSync(path.join(tasksDir, f), 'utf8')))
    .map(t => `- [ ] ${t.roadmap}`);
  return {
    'docs/README.md': '# Dokumentacja projektu Vocaly\n',
    'docs/04-roadmapa.md': `# Roadmapa\n\n## Zadania\n\n${roadmapLines.join('\n')}\n\n- [ ] Pozycja spoza kontraktów\n`,
    'docs/05-decyzje.md': [
      '# Decyzje architektoniczne (ADR)', '', '---', '',
      '### ADR-001: Supabase zamiast Firebase', '**Status:** przyjęta, 2026-09-23', '', 'Backend przechodzi na Supabase.', '',
      '### ADR-002: Klient Expo zamiast Next.js PWA', '**Status:** przyjęta, 2026-09-23', '', 'Aplikacja zostaje w Expo.', '',
      '---', '', '## Otwarte kwestie', '', '| # | Pytanie | Założenie robocze |', '|---|---|---|', '| Q1 | Dopiski? | Nie |', '',
    ].join('\n'),
    'package.json': JSON.stringify({ name: 'vocaly', private: true, dependencies: { expo: '~54.0.0' }, devDependencies: {} }, null, 2) + '\n',
    'tsconfig.json': '{ "compilerOptions": { "strict": true } }\n',
    'App.tsx': 'export default function App() { return null; }\n',
    'src/domain/models/DiaryEntry.ts': 'export interface DiaryEntry { id: string }\n',
    'src/application/useCases/recordAndProcess.ts': "import type { DiaryEntry } from '../../domain/models/DiaryEntry';\nexport const x = (e: DiaryEntry) => e.id;\n",
    'src/infrastructure/ai/groqService.ts': 'export const groq = {};\n',
    'src/presentation/screens/HomeScreen.tsx': "import { x } from '../../application/useCases/recordAndProcess';\nexport const Home = () => x;\n",
    'supabase/config.toml': 'project_id = "vocaly"\n',
    'supabase/migrations/20260101000000_init.sql': 'create extension if not exists vector;\n',
    'supabase/functions/_shared/prompts/structure.v1.md': '---\nschema: structure\n---\nPodziel transkrypcję na notatki.\n',
    'supabase/functions/_shared/schemas/structure.ts': "import { z } from 'npm:zod';\nexport const structure = z.object({});\n",
  };
}

const HANDOFF = (id, { implementer = 'claude', status = 'review', checkpoints = 'brak' } = {}) => `---
task: ${id}
implementer: ${implementer}
status: ${status}
branch: x
updated: 2026-09-24 10:00
---
# Handoff ${id}

## Stan
Zrobione.

## Następny krok
Recenzja.

## Sprawdzone ręcznie
nie dotyczy: zmiana bez UI

## Zmienione dokumenty
brak

## Checkpointy
${checkpoints}

## Czeka na człowieka
-
`;

const REVIEW = (id, reviewer, verdict = 'approve') => `---\ntask: ${id}\nreviewer: ${reviewer}\nverdict: ${verdict}\n---\n# Recenzja\n`;

const check = (text) => (s) => s.replace(`- [ ] ${text}`, `- [x] ${text}`);

const RM = {
  F108: 'ESLint zainstalowany, `design_exports/` wykluczony z `tsconfig.json`, `tsc --noEmit` bez błędów',
  F109: 'Composition root: ekrany nie tworzą serwisów z `infrastructure`',
  F203: '`_shared/ai`: interfejsy i adaptery Groq i Gemini, konfiguracja przez zmienne środowiskowe',
};

const GOOD_MIG = `create table public.profiles (user_id uuid primary key, theme text);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (user_id = (select auth.uid()));
`;

const B = {
  db: 'feat/F1-02-schema-rls',
  lint: 'build/F1-08-lint-typecheck',
  root: 'refactor/F1-09-composition-root',
  auth: 'feat/F1-03-supabase-auth',
  ai: 'feat/F2-03-shared-ai',
  proc: 'feat/F2-04-process-recording',
  prompts: 'feat/F2-05-schemas-prompts',
};

export const CASES = [
  // --- migracje ---
  { name: 'migracja z RLS i polityką przechodzi', branch: B.db, files: { 'supabase/migrations/20260201000000_profiles.sql': GOOD_MIG, 'supabase/tests/profiles.sql': 'select 1;\n' }, expect: 'pass', expectCheckpoint: 'CP-MIGRATION' },
  { name: 'migracja: tabela bez RLS', branch: B.db, files: { 'supabase/migrations/20260201000000_t.sql': 'create table public.links (id uuid);\ncreate policy p on public.links using (true);\n' }, expect: 'migrations' },
  { name: 'migracja: tabela bez polityk', branch: B.db, files: { 'supabase/migrations/20260201000000_t.sql': 'create table if not exists links (id uuid);\nalter table links enable row level security;\n' }, expect: 'migrations' },
  { name: 'migracja: edycja istniejącej', branch: B.db, files: { 'supabase/migrations/20260101000000_init.sql': (s) => s + 'create extension pg_cron;\n' }, expect: 'migrations' },
  { name: 'migracja: zła nazwa pliku', branch: B.db, files: { 'supabase/migrations/profiles.sql': GOOD_MIG }, expect: 'migrations' },
  { name: 'migracja: kod w tym samym PR', branch: B.db, mode: 'worktree', files: { 'supabase/migrations/20260201000000_profiles.sql': GOOD_MIG, 'src/domain/models/Profile.ts': 'export {};\n' }, expect: 'migrations' },

  // --- zakres ---
  { name: 'scope: plik poza zakresem zadania', branch: B.db, files: { 'supabase/functions/chat/index.ts': 'export {};\n' }, expect: 'scope' },
  { name: 'scope: plik poza uprawnieniami roli', branch: B.ai, files: { 'src/domain/models/X.ts': 'export {};\n' }, expect: 'scope' },
  { name: 'scope: ścieżka chroniona (kontrakty)', branch: B.root, files: { '.agent-os/contracts/gates.yaml': (s) => s + '\n# zmiana\n' }, expect: 'scope' },
  { name: 'scope: człowiek może zmienić ścieżkę chronioną', branch: B.root, env: { AGENT_OS_HUMAN: '1' }, files: { '.agent-os/contracts/gates.yaml': (s) => s + '\n# zmiana\n' }, expect: 'pass' },
  { name: 'scope: usunięcie dozwolone przez scope.delete', branch: 'build/F1-06-remove-firebase', commits: [], files: {}, setupDelete: true, expect: 'pass' },

  // --- gałąź ---
  { name: 'branch: praca na main', branch: 'main', files: { 'src/domain/models/X.ts': 'export {};\n' }, expect: 'branch' },
  { name: 'branch: zła nazwa', branch: 'feature/foo', files: { 'docs/notes.md': 'x\n' }, expect: 'branch' },
  { name: 'branch: zadanie bez kontraktu', branch: 'feat/F9-99-ghost', files: { 'docs/notes.md': 'x\n' }, expect: 'branch' },

  // --- sekrety ---
  { name: 'secrets: klucz Groq w kodzie', branch: B.root, files: { 'src/infrastructure/ai/key.ts': `export const k = '${FAKE_GROQ}';\n` }, expect: 'secrets' },
  { name: 'secrets: EXPO_PUBLIC_ dla sekretu', branch: B.root, files: { 'src/infrastructure/ai/key.ts': 'export const k = process.env.EXPO_PUBLIC_GROQ_API_KEY;\n' }, expect: 'secrets' },
  { name: 'secrets: EXPO_PUBLIC_SUPABASE_ANON_KEY dozwolony', branch: B.root, files: { 'src/infrastructure/supabase/client.ts': 'export const k = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;\n' }, expect: 'pass' },
  { name: 'secrets: plik .env', branch: B.root, files: { '.env': 'A=1\n' }, expect: 'secrets' },
  { name: 'secrets: service_role w kliencie', branch: B.root, files: { 'src/infrastructure/supabase/admin.ts': 'const k = process.env.SUPABASE_SERVICE_ROLE_KEY;\n' }, expect: 'secrets' },

  // --- warstwy ---
  { name: 'layers: presentation importuje infrastructure', branch: B.root, files: { 'src/presentation/screens/HomeScreen.tsx': (s) => "import { groq } from '../../infrastructure/ai/groqService';\n" + s }, expect: 'layers' },
  { name: 'layers: alias @/ do infrastructure', branch: B.root, files: { 'src/presentation/screens/Other.tsx': "import { groq } from '@/infrastructure/ai/groqService';\n" }, expect: 'layers' },
  { name: 'layers: domain zależy od biblioteki', branch: B.root, files: { 'src/domain/models/Clock.ts': "import { Platform } from 'react-native';\nexport const p = Platform;\n" }, expect: 'layers' },
  { name: 'layers: composition root może łączyć warstwy', branch: B.root, files: { 'src/composition/root.ts': "import { groq } from '../infrastructure/ai/groqService';\nexport const root = { groq };\n" }, expect: 'pass' },
  { name: 'layers: istniejący import nie jest winą zadania', branch: B.root, files: { 'src/presentation/screens/HomeScreen.tsx': (s) => s + '// komentarz\n' }, expect: 'pass' },

  // --- granica AI ---
  { name: 'ai-boundary: groq-sdk w kliencie', branch: B.root, files: { 'src/infrastructure/ai/client.ts': "import Groq from 'groq-sdk';\nexport const g = Groq;\n" }, expect: 'ai-boundary' },
  { name: 'ai-boundary: fetch do Groq poza _shared/ai', branch: B.proc, files: { 'supabase/functions/process-recording/index.ts': "await fetch('https://api.groq.com/openai/v1/chat');\n", 'supabase/functions/process-recording/index_test.ts': 'Deno.test("x", () => {});\n' }, expect: 'ai-boundary' },
  { name: 'ai-boundary: npm:@google/genai poza _shared/ai', branch: B.proc, files: { 'supabase/functions/process-recording/llm.ts': "import { GoogleGenAI } from 'npm:@google/genai@1.2.0';\n" }, expect: 'ai-boundary' },
  { name: 'ai-boundary: adapter w _shared/ai dozwolony', branch: B.ai, files: { 'supabase/functions/_shared/ai/groq.ts': "export const url = 'https://api.groq.com/openai/v1';\n" }, expect: 'pass' },

  // --- prompty ---
  { name: 'prompts: edycja opublikowanego promptu', branch: B.prompts, files: { 'supabase/functions/_shared/prompts/structure.v1.md': (s) => s + 'Nowa reguła.\n' }, expect: 'prompts' },
  { name: 'prompts: brak nagłówka schema', branch: B.prompts, files: { 'supabase/functions/_shared/prompts/digest.v1.md': 'Napisz wpis dnia.\n' }, expect: 'prompts' },
  { name: 'prompts: brak pliku schematu zod', branch: B.prompts, files: { 'supabase/functions/_shared/prompts/digest.v1.md': '---\nschema: digest\n---\nNapisz wpis dnia.\n' }, expect: 'prompts' },
  { name: 'prompts: zła nazwa pliku', branch: B.prompts, files: { 'supabase/functions/_shared/prompts/digest.md': '---\nschema: structure\n---\nx\n' }, expect: 'prompts' },
  { name: 'prompts: schema none poza fragmentami', branch: B.prompts, files: { 'supabase/functions/_shared/prompts/link.v1.md': '---\nschema: none\n---\nx\n' }, expect: 'prompts' },
  { name: 'prompts: nowa wersja ze schematem przechodzi', branch: B.prompts, files: {
    'supabase/functions/_shared/prompts/structure.v2.md': '---\nschema: structure\n---\nPodziel transkrypcję (v2).\n',
    'supabase/functions/_shared/prompts/personalities/banach.v1.md': '---\nschema: none\n---\nTon Stefana Banacha.\n',
  }, expect: 'pass' },

  // --- logi ---
  { name: 'logging: log treści transkrypcji', branch: B.proc, files: { 'supabase/functions/process-recording/index.ts': 'console.log(`got ${rawTranscript}`);\n' }, expect: 'logging' },
  { name: 'logging: log treści LLM w kliencie', branch: B.root, files: { 'src/infrastructure/ai/x.ts': 'console.info("resp", llmResponse);\n' }, expect: 'logging' },
  { name: 'logging: log identyfikatora dozwolony', branch: B.proc, files: { 'supabase/functions/process-recording/index.ts': "console.log('transcription done', recordingId, status);\n" }, expect: 'pass' },

  // --- natywne ---
  { name: 'native: katalog android/', branch: B.root, files: { 'android/app/build.gradle': 'x\n' }, expect: 'native' },

  // --- ADR ---
  { name: 'adr: edycja przyjętej decyzji', branch: 'docs/adr-change', files: { 'docs/05-decyzje.md': (s) => s.replace('Backend przechodzi na Supabase.', 'Backend zostaje na Firebase.') }, expect: 'adr' },
  { name: 'adr: agent przyjmuje własną decyzję', branch: 'docs/adr-new', files: { 'docs/05-decyzje.md': (s) => s.replace('---\n\n## Otwarte', '### ADR-003: Expo Router\n**Status:** przyjęta, 2026-09-24\n\nPrzechodzimy.\n\n---\n\n## Otwarte') }, expect: 'adr' },
  { name: 'adr: nieciągła numeracja', branch: 'docs/adr-new', files: { 'docs/05-decyzje.md': (s) => s.replace('---\n\n## Otwarte', '### ADR-005: Expo Router\n**Status:** proponowana, 2026-09-24\n\nPrzechodzimy.\n\n---\n\n## Otwarte') }, expect: 'adr' },
  { name: 'adr: propozycja przechodzi (CP-ADR)', branch: 'docs/adr-new', files: { 'docs/05-decyzje.md': (s) => s.replace('---\n\n## Otwarte', '### ADR-003: Expo Router\n**Status:** proponowana, 2026-09-24\n\nPrzechodzimy.\n\n---\n\n## Otwarte') }, expect: 'pass', expectCheckpoint: 'CP-ADR' },

  // --- kontrakty ---
  { name: 'contracts: kontrakt bez kryteriów', branch: 'docs/plan-phase-3', files: { '.agent-os/tasks/F3-01.yaml': `id: F3-01\ntitle: X\nphase: 3\nrole: edge\nbranch: feat/F3-01-x\nroadmap: "Pozycja spoza kontraktów"\nscope:\n  write: [supabase/functions/build-daily/**]\n` }, expect: 'contracts' },
  { name: 'contracts: roadmap nie istnieje', branch: 'docs/plan-phase-3', files: { '.agent-os/tasks/F3-01.yaml': `id: F3-01\ntitle: X\nphase: 3\nrole: edge\nbranch: feat/F3-01-x\nroadmap: "Nie ma takiej pozycji"\nscope:\n  write: [supabase/functions/build-daily/**]\nacceptance: [x]\n` }, expect: 'contracts' },
  { name: 'contracts: poprawny kontrakt (CP-TASK)', branch: 'docs/plan-phase-3', files: { '.agent-os/tasks/F3-01.yaml': `id: F3-01\ntitle: X\nphase: 3\nrole: edge\nbranch: feat/F3-01-x\nroadmap: "Pozycja spoza kontraktów"\nscope:\n  write: [supabase/functions/build-daily/**]\nacceptance: [x]\n` }, expect: 'pass', expectCheckpoint: 'CP-TASK' },

  // --- checkpointy ---
  { name: 'checkpoints: nowa zależność zgłasza CP-DEP', branch: B.auth, files: { 'package.json': (s) => s.replace('"expo": "~54.0.0"', '"expo": "~54.0.0",\n    "@supabase/supabase-js": "^2.50.0"') }, expect: 'pass', expectCheckpoint: 'CP-DEP' },
  { name: 'checkpoints: nowy sekret zgłasza CP-SECRETS', branch: B.ai, files: { 'supabase/functions/_shared/ai/config.ts': "export const k = Deno.env.get('GROQ_API_KEY');\n" }, expect: 'pass', expectCheckpoint: 'CP-SECRETS' },

  // --- ukończenie ---
  { name: 'finish: zadanie nieodhaczone w roadmapie', branch: B.lint, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'tsconfig.json': '{ "exclude": ["design_exports"] }\n', '.agent-os/handoff/F1-08.md': HANDOFF('F1-08', { checkpoints: 'CP-GATE: ustaw budżet tsc na 0' }) }, expect: 'roadmap' },
  { name: 'finish: odhaczona pozycja cudzego zadania', branch: B.lint, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'tsconfig.json': '{ "exclude": ["design_exports"] }\n', 'docs/04-roadmapa.md': (s) => check(RM.F109)(check(RM.F108)(s)), '.agent-os/handoff/F1-08.md': HANDOFF('F1-08', { checkpoints: 'CP-GATE: ustaw budżet tsc na 0' }) }, expect: 'roadmap' },
  { name: 'finish: brak handoff', branch: B.lint, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'tsconfig.json': '{}\n', 'docs/04-roadmapa.md': check(RM.F108) }, expect: 'handoff' },
  { name: 'finish: handoff w toku / pusta sekcja', branch: B.lint, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'tsconfig.json': '{}\n', 'docs/04-roadmapa.md': check(RM.F108), '.agent-os/handoff/F1-08.md': HANDOFF('F1-08', { status: 'in_progress', checkpoints: 'CP-GATE' }).replace('brak\n\n## Checkpointy', '\n## Checkpointy') }, expect: 'handoff' },
  { name: 'finish: niezgłoszony checkpoint', branch: B.auth, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'package.json': (s) => s.replace('"expo": "~54.0.0"', '"expo": "~54.0.0",\n    "expo-apple-authentication": "~8.0.0"'), 'docs/04-roadmapa.md': check('Logowanie Google przez `signInWithIdToken`; Sign in with Apple na iOS'), '.agent-os/handoff/F1-03.md': HANDOFF('F1-03') }, expect: 'handoff' },
  { name: 'finish: logika bez testów', branch: B.ai, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'supabase/functions/_shared/ai/gemini.ts': 'export const g = 1;\n', 'docs/04-roadmapa.md': check(RM.F203), '.agent-os/handoff/F2-03.md': HANDOFF('F2-03') }, expect: 'tests-present' },
  { name: 'finish: komplet przechodzi', branch: B.ai, mode: 'worktree', args: ['--finish', '--no-dod'], files: { 'supabase/functions/_shared/ai/gemini.ts': 'export const g = 1;\n', 'supabase/functions/_shared/ai/gemini_test.ts': 'Deno.test("g", () => {});\n', 'docs/04-roadmapa.md': check(RM.F203), '.agent-os/handoff/F2-03.md': HANDOFF('F2-03') }, expect: 'pass' },

  // --- PR (CI) ---
  { name: 'pr: recenzja od implementującego agenta', branch: B.ai, mode: 'base', args: ['--pr', '--no-dod'], msg: 'feat: add gemini adapter', files: { 'supabase/functions/_shared/ai/gemini.ts': 'export const g = 1;\n', 'supabase/functions/_shared/ai/gemini_test.ts': 'Deno.test("g", () => {});\n', 'docs/04-roadmapa.md': check(RM.F203), '.agent-os/handoff/F2-03.md': HANDOFF('F2-03', { implementer: 'claude' }), '.agent-os/reviews/F2-03.md': REVIEW('F2-03', 'claude') }, expect: 'review' },
  { name: 'pr: recenzja krzyżowa approve przechodzi', branch: B.ai, mode: 'base', args: ['--pr', '--no-dod'], msg: 'feat: add gemini adapter', files: { 'supabase/functions/_shared/ai/gemini.ts': 'export const g = 1;\n', 'supabase/functions/_shared/ai/gemini_test.ts': 'Deno.test("g", () => {});\n', 'docs/04-roadmapa.md': check(RM.F203), '.agent-os/handoff/F2-03.md': HANDOFF('F2-03', { implementer: 'claude' }), '.agent-os/reviews/F2-03.md': REVIEW('F2-03', 'gemini') }, expect: 'pass' },
  { name: 'pr: commit po polsku', branch: B.ai, mode: 'base', args: ['--pr', '--no-dod'], msg: 'Dodałem adapter', files: { 'supabase/functions/_shared/ai/gemini.ts': 'export const g = 1;\n', 'supabase/functions/_shared/ai/gemini_test.ts': 'Deno.test("g", () => {});\n', 'docs/04-roadmapa.md': check(RM.F203), '.agent-os/handoff/F2-03.md': HANDOFF('F2-03', { implementer: 'gemini' }), '.agent-os/reviews/F2-03.md': REVIEW('F2-03', 'claude') }, expect: 'commits' },

  // --- commit-msg ---
  { kind: 'msg', name: 'commit-msg: poprawny', message: 'feat: add profiles table', expect: 'pass' },
  { kind: 'msg', name: 'commit-msg: bez typu', message: 'Dodano migracje', expect: 'fail' },
  { kind: 'msg', name: 'commit-msg: polskie znaki', message: 'feat: dodaj migrację', expect: 'fail' },
  { kind: 'msg', name: 'commit-msg: scope i breaking', message: 'feat(auth)!: switch to supabase auth', expect: 'pass' },

  // --- hooki agentów (Claude PreToolUse / Gemini BeforeTool) ---
  { kind: 'hook', name: 'hook claude: edycja w zakresie', branch: B.root, agent: 'claude', tool: 'Edit', input: { file_path: 'src/composition/root.ts' }, expectExit: 0 },
  { kind: 'hook', name: 'hook claude: edycja kontraktu', branch: B.root, agent: 'claude', tool: 'Write', input: { file_path: '.agent-os/contracts/gates.yaml' }, expectExit: 2 },
  { kind: 'hook', name: 'hook claude: zapis na main', branch: 'main', agent: 'claude', tool: 'Write', input: { file_path: 'src/domain/models/X.ts' }, expectExit: 2 },
  { kind: 'hook', name: 'hook claude: --no-verify', branch: B.root, agent: 'claude', tool: 'Bash', input: { command: 'git commit --no-verify -m "feat: x"' }, expectExit: 2 },
  { kind: 'hook', name: 'hook claude: cat .env', branch: B.root, agent: 'claude', tool: 'Bash', input: { command: 'cat .env' }, expectExit: 2 },
  { kind: 'hook', name: 'hook claude: cat .env.example dozwolony', branch: B.root, agent: 'claude', tool: 'Bash', input: { command: 'cat .env.example' }, expectExit: 0 },
  { kind: 'hook', name: 'hook claude: zapis AGENTS.md przez shell', branch: B.root, agent: 'claude', tool: 'Bash', input: { command: 'echo x > AGENTS.md' }, expectExit: 2 },
  { kind: 'hook', name: 'hook claude: przełącznik człowieka', branch: B.root, agent: 'claude', tool: 'Bash', input: { command: 'AGENT_OS_HUMAN=1 git commit -m "chore: x"' }, expectExit: 2 },
  { kind: 'hook', name: 'hook gemini: write_file poza zakresem', branch: B.db, agent: 'gemini', tool: 'write_file', input: { file_path: 'src/App.tsx', content: 'x' }, expectExit: 2 },
  { kind: 'hook', name: 'hook gemini: replace w zakresie', branch: B.db, agent: 'gemini', tool: 'replace', input: { file_path: 'supabase/migrations/20260201000000_x.sql' }, expectExit: 0 },
  { kind: 'hook', name: 'hook gemini: supabase db push', branch: B.db, agent: 'gemini', tool: 'run_shell_command', input: { command: 'supabase db push' }, expectExit: 2 },
  { kind: 'hook', name: 'hook gemini: push na main', branch: B.db, agent: 'gemini', tool: 'run_shell_command', input: { command: 'git push origin main' }, expectExit: 2 },
  { kind: 'hook', name: 'hook gemini: zwykły git push gałęzi', branch: B.db, agent: 'gemini', tool: 'run_shell_command', input: { command: 'git push -u origin feat/F1-02-schema-rls' }, expectExit: 0 },
];

// Przypadek z usuwaniem: pliki Firebase istnieją na main tylko dla tego testu, więc dodajemy je w commitach
const del = CASES.find(c => c.setupDelete);
del.commits = [{ files: { 'google-services.json': '{}\n' }, msg: 'chore: seed' }];
del.files = { 'google-services.json': null };
del.mode = 'staged';
// uwaga: seed commit jest na gałęzi, więc zmiana względem main to brak pliku; w trybie staged widać usunięcie

export const UNIT = [
  { name: 'yaml: mapy, listy, flow, skalary blokowe', run() {
    const y = parseYaml(`a: 1\nb: 'x: y'\nc: [p, 'q r', {k: v}]\nd:\n  - e\n  - f: 2\n    g: [1, 2]\nh: |\n  linia 1\n  linia 2\ni: "cudzysłów # nie komentarz" # komentarz\nj:\nk: true\n`);
    assert.deepEqual(y, { a: 1, b: 'x: y', c: ['p', 'q r', { k: 'v' }], d: ['e', { f: 2, g: [1, 2] }], h: 'linia 1\nlinia 2\n', i: 'cudzysłów # nie komentarz', j: null, k: true });
  } },
  { name: 'glob: **, *, {a,b}, negacja', run() {
    assert.ok(matchAny('src/a/b/c.ts', ['src/**']));
    assert.ok(matchAny('index.ts', ['index.{ts,js}']));
    assert.ok(!matchAny('src/a.ts', ['src/*/x.ts']));
    assert.ok(matchAny('.env.local', ['.env.*', '!.env.example']));
    assert.ok(!matchAny('.env.example', ['.env.*', '!.env.example']));
    assert.ok(matchAny('a/b/.env', ['**/.env']));
    assert.ok(matchAny('supabase/functions/_shared/ai/x_test.ts', ['supabase/functions/**/*{_test,.test}.ts']));
  } },
  { name: 'sql: tabele, RLS, polityki (z cudzysłowami i komentarzami)', run() {
    const r = analyzeSql(`-- create table fake (x int);\ncreate table "public"."Links" (id int);\nalter table only public."Links" enable row level security;\ncreate policy "a b" on "public"."Links" for select using (true);`);
    assert.deepEqual(r.tables, ['public.links']);
    assert.ok(r.rls.has('public.links') && r.policies.has('public.links'));
  } },
];
