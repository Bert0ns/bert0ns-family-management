import {
  generateBankStatementPrompt,
  normalizeCategories,
  PromptCategoryItem,
} from '@/services/aiPromptGenerator';

describe('aiPromptGenerator', () => {
  it('dynamically injects string category names into the prompt', () => {
    const categories = ['Groceries', 'Utilities', 'Family Fun'];
    const prompt = generateBankStatementPrompt({ categories });

    expect(prompt).toContain('- "Groceries"');
    expect(prompt).toContain('- "Utilities"');
    expect(prompt).toContain('- "Family Fun"');
  });

  it('handles PromptCategoryItem objects with names and descriptions', () => {
    const categories: PromptCategoryItem[] = [
      { name: 'Supermarket', description: 'Groceries and food supplies' },
      { name: 'House Maintenance' },
    ];
    const prompt = generateBankStatementPrompt({ categories });

    expect(prompt).toContain('- "Supermarket" (Groceries and food supplies)');
    expect(prompt).toContain('- "House Maintenance"');
  });

  it('removes duplicate categories and trims whitespace', () => {
    const categories = [' Groceries ', 'Groceries', 'Dining'];
    const prompt = generateBankStatementPrompt({ categories });

    // Should only appear once
    const matches = prompt.match(/- "Groceries"/g);
    expect(matches).toHaveLength(1);
    expect(prompt).toContain('- "Dining"');
  });

  it('falls back to default categories if an empty list is passed', () => {
    const prompt = generateBankStatementPrompt({ categories: [] });

    expect(prompt).toContain('- "Groceries"');
    expect(prompt).toContain('- "Utilities & Bills"');
    expect(prompt).toContain('- "General & Other"');
  });

  it('normalizeCategories returns fallback categories when empty', () => {
    const normalized = normalizeCategories([]);
    expect(normalized.length).toBeGreaterThan(5);
    expect(normalized.map((c) => c.name)).toContain('Groceries');
  });

  it('injects optional household member names for attribution with sequential rule numbering', () => {
    const prompt = generateBankStatementPrompt({
      categories: ['Food'],
      familyMembers: ['Berto', 'Elena', 'Marco'],
    });

    expect(prompt).toContain('7. MEMBER ATTRIBUTION');
    expect(prompt).toContain('"Berto", "Elena", "Marco"');
    expect(prompt).toContain('paid_by');
    expect(prompt).toContain('8. PAYMENT METHOD');
  });

  it('omits member attribution and numbers rules sequentially when no members are passed', () => {
    const prompt = generateBankStatementPrompt({
      categories: ['Food'],
    });

    expect(prompt).not.toContain('MEMBER ATTRIBUTION');
    expect(prompt).toContain('7. PAYMENT METHOD');
    expect(prompt).not.toContain('8. PAYMENT METHOD');
  });

  it('supports EUR currency symbol and code, defaulting non-EUR currencies to EUR', () => {
    const promptEuroSymbol = generateBankStatementPrompt({
      categories: ['Food'],
      currency: '€',
    });
    expect(promptEuroSymbol).toContain('"currency": "€"');

    const promptEuroCode = generateBankStatementPrompt({
      categories: ['Food'],
      currency: 'EUR',
    });
    expect(promptEuroCode).toContain('"currency": "EUR"');

    // App only supports EUR currency; unsupported currencies fall back to EUR
    const promptUnsupported = generateBankStatementPrompt({
      categories: ['Food'],
      currency: 'USD',
    });
    expect(promptUnsupported).toContain('"currency": "EUR"');
  });

  it('contains strict extraction rules for expenses, dates, and merchant cleaning', () => {
    const prompt = generateBankStatementPrompt({ categories: ['Groceries'] });

    expect(prompt).toContain('EXPENSES ONLY');
    expect(prompt).toContain('YYYY-MM-DD');
    expect(prompt).toContain('MERCHANT SANITIZATION');
    expect(prompt).toContain('Esselunga');
  });
});
