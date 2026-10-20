import { describe, expect, it } from 'vitest';
import { parseSqlDump } from './sqlDump';
import { animalsReport, dashboard, financialReport, healthReport, weightReport } from './farmReports';

const SQL = `
INSERT INTO \`animal_types\` (\`type_id\`, \`species\`, \`breed\`) VALUES
(1, 'cattle', 'Angus');
INSERT INTO \`animal\` (\`animal_id\`, \`tag_number\`, \`type_id\`, \`birth_date\`, \`country_id\`, \`sex\`, \`status\`) VALUES
(1, 'IE 1', 1, '2024-01-01', 1, 'male', 'active'),
(2, 'IE 2', 1, NULL, 1, 'female', 'sold');
INSERT INTO \`weighing\` (\`weighing_id\`, \`animal_id\`, \`weighing_date\`, \`weight_kg\`, \`daily_gain\`) VALUES
(1, 1, '2026-01-01', '400.00', '1.00'),
(2, 1, '2026-02-01', '500.00', '1.00'),
(3, 2, '2026-02-01', '600.00', NULL);
INSERT INTO \`health_records\` (\`record_id\`, \`animal_id\`, \`item_id\`, \`treatment_date\`, \`vet_name\`, \`diagnosis\`, \`cost\`) VALUES
(1, 1, 1, '2026-03-01', 'Dr O\\'Brien', 'it''s fine', '20.00');
INSERT INTO \`medical_catalog\` (\`item_id\`, \`item_name\`, \`type\`, \`withdrawal_days\`) VALUES
(1, 'Vaccine A', 'vaccine', 30);
INSERT INTO \`sales\` (\`sale_id\`, \`animal_id\`, \`sale_date\`, \`total_value\`) VALUES
(1, 2, '2026-02-02', '1000.00');
INSERT INTO \`accounts_payable\` (\`payable_id\`, \`category_id\`, \`description\`, \`amount\`, \`due_date\`, \`status\`) VALUES
(1, 1, 'Feed invoice', '300.00', '2026-02-03', 'paid'),
(2, 1, 'Cancelled', '999.00', '2026-02-04', 'cancelled');
`;

const db = parseSqlDump(SQL);

describe('parseSqlDump', () => {
  it('reads every table and row', () => {
    expect(db.animal).toHaveLength(2);
    expect(db.weighing).toHaveLength(3);
  });

  it('converts NULL, numbers and quoted strings', () => {
    expect(db.animal[1].birth_date).toBeNull();
    expect(db.animal[0].type_id).toBe(1);
    expect(db.animal[0].sex).toBe('male');
  });

  it('handles escaped quotes', () => {
    expect(db.health_records[0].vet_name).toBe("Dr O'Brien");
    expect(db.health_records[0].diagnosis).toBe("it's fine");
  });
});

describe('farm reports', () => {
  it('dashboard counts active animals and average gain', () => {
    const d = dashboard(db);
    expect(d.activeAnimals).toBe(1);
    expect(d.avgDailyGain).toBe(1);
  });

  it('animals report uses the latest weighing and market price', () => {
    const a = animalsReport(db).animals.find((x) => x.tag === 'IE 1');
    expect(a?.weight).toBe(500);
    expect(a?.cost).toBe(20);
    expect(a?.profit).toBeCloseTo(500 * 3.2 - 20);
  });

  it('weight report projects days to 550 kg', () => {
    const r = weightReport(db, new Date('2026-03-01T00:00:00Z'));
    const ie1 = r.herd.find((h) => h.tag === 'IE 1');
    expect(ie1?.daysLeft).toBe(50);
    expect(r.stats.readyMarket).toBe(1);
  });

  it('health report blocks animals inside the withdrawal period', () => {
    expect(healthReport(db, new Date('2026-03-10')).records[0].blocked).toBe(true);
    expect(healthReport(db, new Date('2026-05-01')).records[0].blocked).toBe(false);
  });

  it('financial report ignores cancelled bills', () => {
    const f = financialReport(db);
    expect(f.stats.income).toBe(1000);
    expect(f.stats.expenses).toBe(300);
    expect(f.stats.balance).toBe(700);
  });
});
