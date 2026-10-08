export interface UserContextFile {
  id?: string;
  userId: string;
  filename: string;
  content: string;
  version: number;
  updatedAt?: string;
}

export const KNOWN_CONTEXT_FILES: { filename: string; title: string; desc: string }[] = [
  {
    filename: 'IDENTITY.md',
    title: 'Tożsamość i Kim jesteś',
    desc: 'Kim jesteś, Twoja rola, otoczenie i styl życia.',
  },
  {
    filename: 'VALUES.md',
    title: 'Wartości i Zasady decyzyjne',
    desc: 'Twoje kluczowe wartości, filtry decyzyjne i oczekiwania wobec AI.',
  },
  {
    filename: 'GOALS.md',
    title: 'Cele i Projekty',
    desc: 'Twoje krótko- i długoterminowe cele oraz aktywne projekty.',
  },
  {
    filename: 'RELATIONS.md',
    title: 'Relacje i Rytm dnia',
    desc: 'Bliskie osoby, relacje oraz naturalny rytm dobowy i nawyki.',
  },
  {
    filename: 'DILEMMAS.md',
    title: 'Historia dylematów i decyzji',
    desc: 'Podjęte wybory i wnioski z wcześniejszych dylematów.',
  },
  {
    filename: 'MEMORY.md',
    title: 'Pamięć długoterminowa',
    desc: 'Skondensowana wiedza o Tobie syntetyzowana z minionych tygodni.',
  },
];
