import { supabase } from '../supabase.js';
import { escapeHtml, berechneAmpel } from '../utils.js';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="card"><p>Lade Fahrzeuge...</p></div>`;

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*, monitors(*, monitor_types(*))')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="card"><p style="color:var(--color-danger)">Fehler beim Laden: ${escapeHtml(error.message)}</p></div>`;
    return;
  }

  // Statistiken berechnen
  let totalRot = 0;
  let totalGelb = 0;
  let totalGuenst = 0;

  (vehicles || []).forEach(v => {
    (v.monitors || []).forEach(m => {
      const status = berechneAmpel(m.ablaufdatum, m.vorlauf_tage, v.km_stand, m.naechste_faellig_km);
      if (status === 'red') totalRot++;
      else if (status === 'yellow') totalGelb++;
      else if (status === 'green') totalGuenst++;
    });
  });

  container.innerHTML = `
    <!-- Referenz-KPI Bar -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${(vehicles || []).length}</div>
        <div class="kpi-label">Fahrzeuge</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--color-danger)">${totalRot}</div>
        <div class="kpi-label">Überfällig</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--color-warning)">${totalGelb}</div>
        <div class="kpi-label">Bald Fällig</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--color-success)">${totalGuenst}</div>
        <div class="kpi-label">In Ordnung</div>
      </div>
    </div>

    <div class="page-header-flex">
      <h2 class="page-title">Meine Fahrzeuge</h2>
      <a href="#/vehicle/new" class="btn">+ Fahrzeug anlegen</a>
    </div>

    ${(!vehicles || vehicles.length === 0) ? `
      <div class="card" style="text-align:center; padding: 2.5rem 1rem;">
        <p style="color:var(--color-text-muted); margin-bottom:1rem;">Noch keine Fahrzeuge vorhanden.</p>
        <a href="#/vehicle/new" class="btn">+ Erstes Fahrzeug anlegen</a>
      </div>
    ` : `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
        ${vehicles.map(v => {
          const imgUrl = v.bild_pfad 
            ? supabase.storage.from('vehicle-images').getPublicUrl(v.bild_pfad).data.publicUrl 
            : null;

          return `
            <div class="card" style="cursor: pointer; transition: transform 0.15s ease;" onclick="window.location.hash='#/vehicle/${escapeHtml(v.id)}'">
              ${imgUrl 
                ? `<img src="${imgUrl}" class="img-preview" style="height:140px; margin-bottom:0.75rem;">` 
                : `<div class="img-preview" style="height:140px; display:flex; align-items:center; justify-content:center; background:var(--color-bg); color:var(--color-text-muted); font-weight:700;">${escapeHtml(v.marke)} ${escapeHtml(v.modell)}</div>`}
              
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:0.1rem;">${escapeHtml(v.bezeichnung)}</h3>
                  <p style="color:var(--color-text-muted); font-weight:600; font-size:0.85rem;">${escapeHtml(v.kennzeichen)} · ${v.km_stand.toLocaleString('de-AT')} km</p>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}
