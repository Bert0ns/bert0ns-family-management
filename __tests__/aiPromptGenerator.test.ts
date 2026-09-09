import { generateBankStatementPrompt, PromptCategoryItem } from '@/services/aiPromptGenerator';

describe('aiPromptGenerator', () => {
  it('dynamically injects string category names into the prompt', () => {
    const categories = ['Groceries', 'Utilities', 'Family Fun'];
    const prompt = generateBankStatementPrompt({ categories });

    expect(prompt).toContain('- "Groceries"');
    expect(prompt).toContain('- "Utilities"');
    expect(prompt).toContain('- "Family Fun"');
  });

  it('handles PromptCategoryItem objects with names', () => {
    const categories: PromptCategoryItem[] = [
      { name: 'Supermarket' },
      { name: 'House Maintenance' },
    ];
    const prompt = generateBankStatementPrompt({ categories });

    expect(prompt).toContain('- "Supermarket"');
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

  it('injects optional household member names for attribution', () => {
    const prompt = generateBankStatementPrompt({
      categories: ['Food'],
      familyMembers: ['Berto', 'Elena', 'Marco'],
    });

    expect(prompt).toContain('MEMBER ATTRIBUTION');
    expect(prompt).toContain('"Berto", "Elena", "Marco"');
    expect(prompt).toContain('paid_by');
  });

  it('omits member attribution guidance when no members are passed', () => {
    const prompt = generateBankStatementPrompt({
      categories: ['Food'],
    });

    expect(prompt).not.toContain('MEMBER ATTRIBUTION');
  });

  it('injects specified currency', () => {
    const prompt = generateBankStatementPrompt({
      categories: ['Food'],
      currency: 'USD',
    });

    expect(prompt).toContain('"currency": "USD"');
  });

  it('contains strict extraction rules for expenses, dates, and merchant cleaning', () => {
    const prompt = generateBankStatementPrompt({ categories: ['Groceries'] });

    expect(prompt).toContain('EXPENSES ONLY');
    expect(prompt).toContain('YYYY-MM-DD');
    expect(prompt).toContain('MERCHANT SANITIZATION');
    expect(prompt).toContain('Esselunga');
  });
});
