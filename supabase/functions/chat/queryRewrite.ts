import { LlmProvider } from '../_shared/ai/types.ts';
import { validateAndRepairJson } from '../_shared/ai/validate.ts';
import { chatQueryRewriteSchema, ChatQueryRewrite } from '../_shared/schemas/chatQueryRewrite.ts';

let rewritePromptCache: string | null = null;

export async function loadRewritePromptTemplate(): Promise<string> {
  if (rewritePromptCache) return rewritePromptCache;
  const path = new URL('../_shared/prompts/chat-rewrite.v1.md', import.meta.url);
  const raw = await Deno.readTextFile(path);
  const match = raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
  const content = (match ? match[1] : raw).trim();
  rewritePromptCache = content;
  return content;
}

export function getCurrentDateInTimezone(timezone: string = 'Europe/Warsaw'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function rewriteChatQuery(params: {
  message: string;
  llm: LlmProvider;
  currentDate?: string;
  timezone?: string;
  promptTemplate?: string;
}): Promise<ChatQueryRewrite> {
  const tz = params.timezone || 'Europe/Warsaw';
  const curDate = params.currentDate || getCurrentDateInTimezone(tz);
  const template = params.promptTemplate || (await loadRewritePromptTemplate());

  const prompt = template
    .replaceAll('{{CURRENT_DATE}}', curDate)
    .replaceAll('{{USER_TIMEZONE}}', tz)
    .replace('{{USER_MESSAGE}}', params.message);

  const raw = await params.llm.generateText([{ role: 'user', content: prompt }]);

  const repairCallback = async (errorMsg: string, rawText: string) => {
    const repairPrompt = `Poprzednia odpowiedź zawierała błędy walidacji:\n${errorMsg}\n\nOto surowa odpowiedź:\n${rawText}\n\nZwróć WYŁĄCZNIE poprawny JSON zgodny ze schematem { search_query, date_from, date_to, kinds, categories }.`;
    return await params.llm.generateText([{ role: 'user', content: repairPrompt }]);
  };

  const rewritten = await validateAndRepairJson(raw, chatQueryRewriteSchema, repairCallback);

  return {
    search_query: rewritten.search_query.trim() || params.message.trim(),
    date_from: rewritten.date_from,
    date_to: rewritten.date_to,
    kinds: rewritten.kinds,
    categories: rewritten.categories,
  };
}
