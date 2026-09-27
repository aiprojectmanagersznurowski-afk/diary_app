/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export class LlmValidationError extends Error {
  readonly rawInput: unknown;
  readonly issues: string[];
  readonly repairAttempted: boolean;

  constructor(message: string, rawInput: unknown, issues: string[] = [], repairAttempted: boolean = false) {
    super(message);
    this.name = 'LlmValidationError';
    this.rawInput = rawInput;
    this.issues = issues;
    this.repairAttempted = repairAttempted;
  }
}

/**
 * Czyści surowy tekst zwrócony przez LLM, usuwając znaczniki bloków kodu markdown (```json ... ```)
 * oraz ewentualne białe znaki otaczające.
 */
export function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();

  // Usuwanie znaczników bloków kodu markdown
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    } else {
      cleaned = cleaned.replace(/^```[a-zA-Z]*/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
  }

  // Jeśli LLM dodał tekst przed lub po JSONie, wyciągamy pierwszy poprawny blok { ... } lub [ ... ]
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      const isObject = cleaned[startIdx] === '{';
      const endChar = isObject ? '}' : ']';
      const lastIdx = cleaned.lastIndexOf(endChar);
      if (lastIdx !== -1 && lastIdx > startIdx) {
        cleaned = cleaned.slice(startIdx, lastIdx + 1).trim();
      }
    }
  }

  return cleaned;
}

export type RepairCallback = (errorMessage: string, rawText: string) => Promise<unknown>;

/**
 * Waliduje odpowiedź JSON z LLM według zadanego schematu Zod.
 * Zgodnie z wytycznymi architektonicznymi:
 * - Przy pierwszym błędzie podejmuje dokładnie jedną próbę naprawy (jeśli przekazano repairCallback).
 * - Jeśli naprawa się nie powiedzie lub nie przekazano funkcji naprawczej, rzuca LlmValidationError.
 */
export async function validateAndRepairJson<T>(
  rawInput: unknown,
  schema: z.ZodType<T, any, any>,
  repairCallback?: RepairCallback,
): Promise<T> {
  const tryParseAndValidate = (
    input: unknown,
  ): { success: true; data: T } | { success: false; issues: string[]; error: string } => {
    let parsedObject: unknown = input;

    if (typeof input === 'string') {
      const cleaned = cleanJsonString(input);
      try {
        parsedObject = JSON.parse(cleaned);
      } catch (err) {
        const syntaxMsg = `Błąd składni JSON: ${err instanceof Error ? err.message : String(err)}`;
        return { success: false, issues: [syntaxMsg], error: syntaxMsg };
      }
    }

    const result = schema.safeParse(parsedObject);
    if (result.success) {
      return { success: true, data: result.data };
    }

    const issues = result.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`);
    const errorMsg = `Błędy walidacji schematu:\n${issues.join('\n')}`;
    return { success: false, issues, error: errorMsg };
  };

  // Próba 1: walidacja pierwotnego wejścia
  const initialResult = tryParseAndValidate(rawInput);
  if (initialResult.success) {
    return initialResult.data;
  }

  // Próba 2: jeśli przekazano funkcję naprawczą, wykonaj dokładnie jedną próbę naprawy
  if (repairCallback) {
    const rawText = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);
    try {
      const repairedInput = await repairCallback(initialResult.error, rawText);
      const repairResult = tryParseAndValidate(repairedInput);
      if (repairResult.success) {
        return repairResult.data;
      }

      throw new LlmValidationError(
        `Odpowiedź LLM niepoprawna po próbie naprawy. ${repairResult.error}`,
        rawInput,
        repairResult.issues,
        true,
      );
    } catch (repairErr) {
      if (repairErr instanceof LlmValidationError) {
        throw repairErr;
      }
      throw new LlmValidationError(
        `Próba naprawy odpowiedzi LLM nie powiodła się: ${repairErr instanceof Error ? repairErr.message : String(repairErr)}`,
        rawInput,
        initialResult.issues,
        true,
      );
    }
  }

  throw new LlmValidationError(
    `Odpowiedź LLM nie spełnia schematu (brak naprawy): ${initialResult.error}`,
    rawInput,
    initialResult.issues,
    false,
  );
}
