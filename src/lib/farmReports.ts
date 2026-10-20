// Report calculations ported from the PHP pages in farm-app/.
// Each function mirrors one PHP report so the static pages show the same numbers.

import type { Row, SqlValue, Tables } from './sqlDump';

export const TARGET_MARKET_WEIGHT = 550; // kg, same as reports_weight.php
export const MARKET_PRICE_PER_KG = 3.2; // €/kg, same as reports_animals.php

const num = (v: SqlValue | undefined): number => (v === null || v === undefined ? 0 : Number(v));
const str = (v: SqlValue | undefined): string => (v === null || v === undefined ? '' : String(v));
const rows = (db: Tables, t: string): Row[] => db[t] ?? [];

function indexBy(list: Row[], key: string): Map<number, Row> {
  return new Map(list.map((r) => [num(r[key]), r]));
}

function sumBy(list: Row[], key: string, value: (r: Row) => number): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of list) {
    const k = num(r[key]);
    out.set(k, (out.get(k) ?? 0) + value(r));
  }
  return out;
}

function addDays(isoDate: string, days: number): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function countBy<T>(list: T[], key: (x: T) => string): { label: string; value: number }[] {
  const m = new Map<string, number>();
  for (const x of list) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Latest weighing per animal (by date, then by id). */
function latestWeighings(db: Tables): Map<number, Row> {
  const latest = new Map<number, Row>();
  for (const w of rows(db, 'weighing')) {
    const id = num(w.animal_id);
    const cur = latest.get(id);
    if (
      !cur ||
      str(w.weighing_date) > str(cur.weighing_date) ||
      (str(w.weighing_date) === str(cur.weighing_date) && num(w.weighing_id) > num(cur.weighing_id))
    ) {
      latest.set(id, w);
    }
  }
  return latest;
}

/** Current lot of each animal (lot_animals with exit_date IS NULL). */
function currentLots(db: Tables): Map<number, string> {
  const lots = indexBy(rows(db, 'lot'), 'lot_id');
  const out = new Map<number, string>();
  for (const la of rows(db, 'lot_animals')) {
    if (la.exit_date === null) out.set(num(la.animal_id), str(lots.get(num(la.lot_id))?.name));
  }
  return out;
}

// ---------- dashboard.php ----------
export function dashboard(db: Tables) {
  const animals = rows(db, 'animal');
  const feeds = indexBy(rows(db, 'feed'), 'feed_id');
  const gains = rows(db, 'weighing').filter((w) => w.daily_gain !== null);
  const types = indexBy(rows(db, 'animal_types'), 'type_id');
  return {
    totalAnimals: animals.length,
    activeAnimals: animals.filter((a) => a.status === 'active').length,
    activeLots: new Set(rows(db, 'lot_animals').filter((la) => la.exit_date === null).map((la) => num(la.lot_id))).size,
    operationalCost: rows(db, 'operational_costs').reduce((s, r) => s + num(r.cost_value), 0),
    feedingCost: rows(db, 'daily_feeding').reduce(
      (s, df) => s + num(df.quantity_kg) * num(feeds.get(num(df.feed_id))?.cost_per_kg),
      0,
    ),
    medicalCost: rows(db, 'health_records').reduce((s, r) => s + num(r.cost), 0),
    avgDailyGain: gains.length ? gains.reduce((s, w) => s + num(w.daily_gain), 0) / gains.length : 0,
    weighings: rows(db, 'weighing').length,
    byStatus: countBy(animals, (a) => str(a.status)),
    byBreed: countBy(animals, (a) => str(types.get(num(a.type_id))?.breed) || 'Unknown'),
  };
}

// ---------- reports_animals.php ----------
export function animalsReport(db: Tables) {
  const types = indexBy(rows(db, 'animal_types'), 'type_id');
  const countries = indexBy(rows(db, 'european_countries'), 'country_id');
  const lots = currentLots(db);
  const latest = latestWeighings(db);
  const health = sumBy(rows(db, 'health_records'), 'animal_id', (r) => num(r.cost));
  const ops = sumBy(rows(db, 'operational_costs'), 'animal_id', (r) => num(r.cost_value));

  const list = rows(db, 'animal')
    .map((a) => {
      const id = num(a.animal_id);
      const weight = num(latest.get(id)?.weight_kg);
      const cost = (health.get(id) ?? 0) + (ops.get(id) ?? 0);
      const estValue = weight * MARKET_PRICE_PER_KG;
      return {
        id,
        tag: str(a.tag_number),
        breed: str(types.get(num(a.type_id))?.breed),
        sex: str(a.sex),
        country: str(countries.get(num(a.country_id))?.country_name),
        lot: lots.get(id) ?? '',
        birthDate: str(a.birth_date),
        status: str(a.status),
        weight,
        cost,
        estValue,
        profit: estValue - cost,
      };
    })
    .sort((a, b) => b.id - a.id);

  return {
    animals: list,
    stats: {
      count: list.length,
      active: list.filter((a) => a.status === 'active').length,
      totalWeight: list.reduce((s, a) => s + a.weight, 0),
      totalCost: list.reduce((s, a) => s + a.cost, 0),
      estRevenue: list.reduce((s, a) => s + a.estValue, 0),
    },
    byStatus: countBy(list, (a) => a.status),
    byBreed: countBy(list, (a) => a.breed || 'Unknown'),
  };
}

// ---------- reports_weight.php ----------
export function weightReport(db: Tables, today = new Date()) {
  const types = indexBy(rows(db, 'animal_types'), 'type_id');
  const animals = indexBy(rows(db, 'animal'), 'animal_id');
  const lots = currentLots(db);
  const herd = [...latestWeighings(db).values()]
    .filter((w) => animals.has(num(w.animal_id)))
    .map((w) => {
      const a = animals.get(num(w.animal_id)) as Row;
      const weight = num(w.weight_kg);
      const adg = num(w.daily_gain);
      let finish: string;
      let daysLeft = 0;
      if (weight >= TARGET_MARKET_WEIGHT) finish = 'Ready';
      else if (adg > 0) {
        daysLeft = Math.ceil((TARGET_MARKET_WEIGHT - weight) / adg);
        const d = new Date(today);
        d.setDate(d.getDate() + daysLeft);
        finish = d.toISOString().slice(0, 10);
      } else finish = 'Stalled';
      const performance = adg < 0.8 ? 'Low' : adg < 1.2 ? 'Good' : 'High';
      return {
        tag: str(a.tag_number),
        sex: str(a.sex),
        breed: str(types.get(num(a.type_id))?.breed),
        lot: lots.get(num(a.animal_id)) ?? '',
        lastWeighing: str(w.weighing_date),
        weight,
        adg,
        daysLeft,
        finish,
        performance,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  const bucket = (w: number) =>
    w < 200 ? '< 200kg' : w < 300 ? '200-300kg' : w < 400 ? '300-400kg' : w < 500 ? '400-500kg' : '> 500kg';
  const distribution = ['< 200kg', '200-300kg', '300-400kg', '400-500kg', '> 500kg'].map((label) => ({
    label,
    value: herd.filter((h) => bucket(h.weight) === label).length,
  }));
  const performance = ['Low', 'Good', 'High'].map((label) => ({
    label,
    value: herd.filter((h) => h.performance === label).length,
  }));
  const n = herd.length;
  return {
    herd,
    stats: {
      count: n,
      avgWeight: n ? herd.reduce((s, h) => s + h.weight, 0) / n : 0,
      avgAdg: n ? herd.reduce((s, h) => s + h.adg, 0) / n : 0,
      readyMarket: herd.filter((h) => h.finish === 'Ready').length,
    },
    distribution,
    performance,
  };
}

// ---------- reports_feeding.php ----------
export function feedingReport(db: Tables) {
  const feeds = indexBy(rows(db, 'feed'), 'feed_id');
  const animals = indexBy(rows(db, 'animal'), 'animal_id');
  const lots = indexBy(rows(db, 'lot'), 'lot_id');
  const lotAnimals = rows(db, 'lot_animals');

  const events = rows(db, 'daily_feeding').map((df) => {
    const feed = feeds.get(num(df.feed_id));
    const date = str(df.feeding_date);
    const la = lotAnimals.find(
      (l) =>
        num(l.animal_id) === num(df.animal_id) &&
        date >= str(l.entry_date) &&
        (l.exit_date === null || date <= str(l.exit_date)),
    );
    const qty = num(df.quantity_kg);
    const unitCost = num(feed?.cost_per_kg);
    return {
      date,
      tag: str(animals.get(num(df.animal_id))?.tag_number),
      lot: la ? str(lots.get(num(la.lot_id))?.name) : '',
      feed: str(feed?.name),
      qty,
      unitCost,
      total: qty * unitCost,
    };
  });
  events.sort((a, b) => (a.date < b.date ? 1 : -1));

  const byFeed = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const e of events) {
    byFeed.set(e.feed, (byFeed.get(e.feed) ?? 0) + e.total);
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.qty);
  }
  const totalKg = events.reduce((s, e) => s + e.qty, 0);
  return {
    events,
    stats: {
      totalEvents: events.length,
      totalKg,
      totalCost: events.reduce((s, e) => s + e.total, 0),
      avgConsumption: events.length ? totalKg / events.length : 0,
    },
    costByFeed: [...byFeed.entries()].map(([label, value]) => ({ label, value })),
    kgByDay: [...byDay.entries()].sort().map(([label, value]) => ({ label, value })),
  };
}

// ---------- reports_health.php ----------
export function healthReport(db: Tables, today = new Date()) {
  const animals = indexBy(rows(db, 'animal'), 'animal_id');
  const catalog = indexBy(rows(db, 'medical_catalog'), 'item_id');
  const types = indexBy(rows(db, 'animal_types'), 'type_id');
  const lots = currentLots(db);

  const records = rows(db, 'health_records')
    .map((hr) => {
      const a = animals.get(num(hr.animal_id));
      const med = catalog.get(num(hr.item_id));
      const withdrawal = num(med?.withdrawal_days);
      const date = str(hr.treatment_date);
      const clearDate = addDays(date, withdrawal);
      return {
        date,
        tag: str(a?.tag_number),
        breed: str(types.get(num(a?.type_id))?.breed),
        lot: lots.get(num(hr.animal_id)) ?? '',
        medicine: str(med?.item_name) || 'N/A',
        medType: str(med?.type),
        diagnosis: str(hr.diagnosis),
        vet: str(hr.vet_name),
        cost: num(hr.cost),
        withdrawal,
        clearDate: clearDate.toISOString().slice(0, 10),
        blocked: withdrawal > 0 && clearDate > today,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    records,
    stats: {
      treatments: records.length,
      totalCost: records.reduce((s, r) => s + r.cost, 0),
      animalsTreated: new Set(records.map((r) => r.tag)).size,
      blocked: records.filter((r) => r.blocked).length,
    },
    byType: countBy(records, (r) => r.medType || 'other'),
  };
}

// ---------- reports_financial.php ----------
export function financialReport(db: Tables) {
  const animals = indexBy(rows(db, 'animal'), 'animal_id');
  const categories = indexBy(rows(db, 'financial_categories'), 'category_id');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const ledger = [
    ...rows(db, 'sales').map((s) => ({
      date: str(s.sale_date),
      type: 'Income' as const,
      category: 'Livestock Sales',
      description: `Animal Tag: ${str(animals.get(num(s.animal_id))?.tag_number)}`,
      amount: num(s.total_value),
    })),
    ...rows(db, 'accounts_payable')
      .filter((ap) => ap.status !== 'cancelled')
      .map((ap) => ({
        date: str(ap.due_date),
        type: 'Expense' as const,
        category: str(categories.get(num(ap.category_id))?.name),
        description: str(ap.description),
        amount: num(ap.amount),
      })),
    ...rows(db, 'operational_costs').map((oc) => ({
      date: str(oc.cost_date),
      type: 'Expense' as const,
      category: cap(str(oc.category)),
      description: str(oc.description) || 'Operational cost',
      amount: num(oc.cost_value),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const income = ledger.filter((l) => l.type === 'Income').reduce((s, l) => s + l.amount, 0);
  const expenses = ledger.filter((l) => l.type === 'Expense').reduce((s, l) => s + l.amount, 0);
  const byCategory = new Map<string, number>();
  for (const l of ledger.filter((x) => x.type === 'Expense')) {
    byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + l.amount);
  }
  return {
    ledger,
    stats: { income, expenses, balance: income - expenses, transactions: ledger.length },
    expensesByCategory: [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

