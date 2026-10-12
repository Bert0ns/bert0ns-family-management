/**
 * AI JSON Payload Extractor & Sanitizer
 *
 * Safely extracts and parses JSON payloads returned by AI assistants,
 * stripping markdown code fences, backticks, conversational prefixes/suffixes,
 * and forgiving trailing commas without corrupting string literals.
 */

export interface JsonExtractionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB maximum payload size limit

/**
 * Strips trailing commas from JSON objects and arrays without corrupting commas inside string literals.
 */
function stripTrailingCommas(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      result += char;
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
        result += char;
      } else if (char === ',') {
        // Look ahead for closing brace or bracket, ignoring whitespace
        let j = i + 1;
        while (j < jsonStr.length && /\s/.test(jsonStr[j])) {
          j++;
        }
        if (j < jsonStr.length && (jsonStr[j] === '}' || jsonStr[j] === ']')) {
          // Skip the trailing comma
          continue;
        }
        result += char;
      } else {
        result += char;
      }
    }
  }

  return result;
}

export class JsonExtractor {
  /**
   * Sanitizes input text and parses the contained JSON object or array.
   */
  extract(rawInput: string): JsonExtractionResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return { success: false, error: 'Input is empty or not a string' };
    }

    if (rawInput.length > MAX_PAYLOAD_SIZE) {
      return { success: false, error: 'Payload exceeds maximum allowed size of 2MB' };
    }

    const trimmed = rawInput.trim();
    if (trimmed.length === 0) {
      return { success: false, error: 'Input cannot be empty' };
    }

    // 1. Check for markdown code fences (e.g. ```json ... ``` or ``` ... ```)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

    // 2. Detect whether root structure is an Object ({) or Array ([) and slice to matching closing brace/bracket
    const firstBrace = candidate.indexOf('{');
    const firstBracket = candidate.indexOf('[');

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      // Root structure is an Object
      const lastBrace = candidate.lastIndexOf('}');
      if (lastBrace > firstBrace) {
        candidate = candidate.substring(firstBrace, lastBrace + 1);
      }
    } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      // Root structure is an Array
      const lastBracket = candidate.lastIndexOf(']');
      if (lastBracket > firstBracket) {
        candidate = candidate.substring(firstBracket, lastBracket + 1);
      }
    }

    // 3. Attempt JSON parse (with fallback sanitization for trailing commas common in LLM outputs)
    try {
      const parsed = JSON.parse(candidate);
      return { success: true, data: parsed };
    } catch (initialErr: any) {
      try {
        const withoutTrailingCommas = stripTrailingCommas(candidate);
        const parsed = JSON.parse(withoutTrailingCommas);
        return { success: true, data: parsed };
      } catch {
        return {
          success: false,
          error: `JSON syntax error: ${initialErr?.message || 'Could not parse payload'}`,
        };
      }
    }
  }
}

export const jsonExtractor = new JsonExtractor();
