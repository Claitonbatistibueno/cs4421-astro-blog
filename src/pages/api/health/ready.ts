import type { APIRoute } from 'astro';
import { loadFarmDb } from '../../../lib/farmDb';

// Readiness: "can it take traffic?" The reports need the farm data file,
// so the app is only ready when that data loads. A failure means: stop
// sending users here, without restarting the container.
export const GET: APIRoute = () => {
  try {
    const animals = loadFarmDb().animal?.length ?? 0;
    return Response.json({ status: 'ready', checks: { farmData: 'ok', animals }, timestamp: new Date().toISOString() });
  } catch (err) {
    return Response.json(
      { status: 'not_ready', checks: { farmData: String(err) }, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
};
