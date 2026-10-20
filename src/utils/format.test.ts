import { describe, expect, it } from 'vitest';
import { formatCurrency } from './format';
import { kpis, modules, reports } from '../data/farm';

describe('formatCurrency', () => {
  it('formats thousands with a comma', () => {
    expect(formatCurrency(12540)).toBe('€ 12,540');
  });

  it('keeps the sign for negative values', () => {
    expect(formatCurrency(-50)).toBe('-€ 50');
  });
});

describe('farm home page data', () => {
  it('has exactly 4 KPIs, all with value and label', () => {
    expect(kpis).toHaveLength(4);
    for (const kpi of kpis) {
      expect(kpi.value).not.toBe('');
      expect(kpi.label).not.toBe('');
    }
  });

  it('has modules and reports with no empty fields', () => {
    expect(modules.length).toBeGreaterThan(0);
    expect(reports.length).toBeGreaterThan(0);
    for (const r of reports) {
      expect(r.type && r.purpose && r.resultSet).toBeTruthy();
    }
  });
});
