import { supabase } from '../supabase.js';
import { escapeHtml } from '../utils.js';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="card"><h2>Dashboard</h2><p>Lade Fahrzeuge...</p></div>`;
  const { data: vehicles } = await supabase.from('vehicles').select('*, monitors(*, monitor_types(*))');
  
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h2>Meine Fahrzeuge</h2>
      <a href="#/vehicle/new" class="btn">+ Fahrzeug anlegen</a>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
      ${(vehicles || []).map(v => `
        <div class="card" style="cursor: pointer;" onclick="window.location.hash='#/vehicle/${escapeHtml(v.id)}'">
          <h3>${escapeHtml(v.bezeichnung)}</h3>
          <p style="color: var(--color-text-muted);">${escapeHtml(v.kennzeichen)}</p>
        </div>
      `).join('')}
    </div>
  `;
}