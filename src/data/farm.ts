// Content of the Farm Project home page, kept as data (not hard-coded HTML)
// so it can be unit-tested and reused by other pages.

export interface Kpi {
  value: string;
  label: string;
}

export interface Module {
  title: string;
  text: string;
}

export interface Report {
  type: string;
  purpose: string;
  resultSet: string;
}

export const kpis: Kpi[] = [
  { value: '28', label: 'Active animals (sample)' },
  { value: '€ 12,540', label: 'Total cost by lot (sample)' },
  { value: '+0.86 kg', label: 'Average daily gain (sample)' },
  { value: '2', label: 'Lots in operation (sample)' },
];

export const modules: Module[] = [
  {
    title: 'Animals',
    text: 'Registration and management by tag, breed/type, sex, country of origin and lifecycle status. Designed for traceability, health records and audit-ready reporting.',
  },
  {
    title: 'Lots',
    text: 'Group management for the herd, with a many-to-many allocation between lots and animals.',
  },
  {
    title: 'Performance & Costs',
    text: 'Weighings, daily feeding and operational costs, with reports by lot and by animal: AVG(daily_gain) and SUM(cost_value).',
  },
  {
    title: 'Health & Vet AI',
    text: 'Health records, treatment catalogue and an AI veterinary assistant that flags animals needing attention.',
  },
  {
    title: 'Finance',
    text: 'Clients, suppliers and a financial dashboard to follow margins and profitability per lot.',
  },
  {
    title: 'Reports',
    text: 'Animal, feeding, health, weight and financial reports generated from the same database.',
  },
];

export const reports: Report[] = [
  {
    type: 'Active animals',
    purpose: 'Lists animals with an active operational status.',
    resultSet: 'Animal identifier, tag number, sex, country of origin, operational status.',
  },
  {
    type: 'By country of origin',
    purpose: 'Supports regulatory compliance and origin-based traceability.',
    resultSet: 'Records grouped and filtered by country identifier.',
  },
  {
    type: 'Weighing history',
    purpose: 'Tracks weight evolution and performance per animal.',
    resultSet: 'Weighing date, recorded weight (kg), calculated daily gain.',
  },
  {
    type: 'Lot costs',
    purpose: 'Aggregates cost data for profitability analysis.',
    resultSet: 'Total cost value aggregated by lot identifier.',
  },
];
