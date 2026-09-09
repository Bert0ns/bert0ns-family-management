/**
 * AI JSON Payload Extractor & Sanitizer
 *
 * Safely extracts and parses JSON payloads returned by AI assistants,
 * stripping markdown code fences, backticks, and conversational prefixes/suffixes.
 */

export interface JsonExtractionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class JsonExtractor {
  /**
   * Sanitizes input text and parses the contained JSON object.
   */
  extract(rawInput: string): JsonExtractionResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return { success: false, error: 'Input is empty or not a string' };
    }

    const trimmed = rawInput.trim();
    if (trimmed.length === 0) {
      return { success: false, error: 'Input cannot be empty' };
    }

    // 1. Check for markdown code fences (e.g. ```json ... ``` or ``` ... ```)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

    // 2. If conversational text exists around JSON, extract substring from first '{' to last '}'
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidate = candidate.substring(firstBrace, lastBrace + 1);
    }

    // 3. Attempt JSON parse
    try {
      const parsed = JSON.parse(candidate);
      return { success: true, data: parsed };
    } catch (err: any) {
      return {
        success: false,
        error: `JSON syntax error: ${err?.message || 'Could not parse payload'}`,
      };
    }
  }
}

export const jsonExtractor = new JsonExtractor();
