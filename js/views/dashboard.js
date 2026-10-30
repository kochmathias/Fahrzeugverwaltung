import { supabase } from '../supabase.js';
import { escapeHtml, berechneAmpel } from '../utils.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
      <h2 style="font-size: 1.4rem; font-weight: 800; margin:0;">Meine Fahrzeuge</h2>
      <a href="#/vehicle/new" class="btn">+ Fahrzeug anlegen</a>
    </div>
    <div class="card"><p>Lade Fahrzeuge...</p></div>
  `;

  try {
    // Fahrzeuge sicher abfragen
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let totalRot = 0;
    let totalGelb = 0;
    let totalGuenst = 0;

    // Optional: Versuche Monitore zu laden, fang Fehler aber ab, damit das Dashboard nicht abstürzt
    let monitorsMap = {};
    try {
      const { data: monitors } = await supabase.from('monitors').select('*, monitor_types(*)');
      if (monitors) {
        monitors.forEach(m => {
          if (!monitorsMap[m.vehicle_id]) monitorsMap[m.vehicle_id] = [];
          monitorsMap[m.vehicle_id].push(m);
          
          // Ampel berechnen
          const v = vehicles.find(veh => veh.id === m.vehicle_id);
          const km = v ? v.km_stand : 0;
          const status = berechneAmpel(m.ablaufdatum, m.vorlauf_tage, km, m.naechste_faellig_km);
          if (status === 'red') totalRot++;
          else if (status === 'yellow') totalGelb++;
          else if (status === 'green') totalGuenst++;
        });
      }
    } catch (e) {
      console.warn('Monitore konnten nicht geladen werden:', e);
    }

    container.innerHTML = `
      <!-- KPI Summary Bar -->
      <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
        <div class="kpi-card" style="background:var(--color-card); padding:0.85rem; border-radius:14px; text-align:center; border:1px solid var(--color-border);">
          <div style="font-size: 1.3rem; font-weight: 800;">${(vehicles || []).length}</div>
          <div style="font-size: 0.70rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Fahrzeuge</div>
        </div>
        <div class="kpi-card" style="background:var(--color-card); padding:0.85rem; border-radius:14px; text-align:center; border:1px solid var(--color-border);">
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--color-danger);">${totalRot}</div>
          <div style="font-size: 0.70rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Überfällig</div>
        </div>
        <div class="kpi-card" style="background:var(--color-card); padding:0.85rem; border-radius:14px; text-align:center; border:1px solid var(--color-border);">
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--color-warning);">${totalGelb}</div>
          <div style="font-size: 0.70rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Bald fällig</div>
        </div>
        <div class="kpi-card" style="background:var(--color-card); padding:0.85rem; border-radius:14px; text-align:center; border:1px solid var(--color-border);">
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--color-success);">${totalGuenst}</div>
          <div style="font-size: 0.70rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">In Ordnung</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.4rem; font-weight: 800; margin:0;">Meine Fahrzeuge</h2>
        <a href="#/vehicle/new" class="btn">+ Fahrzeug anlegen</a>
      </div>

      ${(!vehicles || vehicles.length === 0) ? `
        <div class="card" style="text-align: center; padding: 2.5rem 1rem;">
          <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Noch keine Fahrzeuge vorhanden.</p>
          <a href="#/vehicle/new" class="btn">+ Erstes Fahrzeug anlegen</a>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          ${vehicles.map(v => {
            const imgUrl = v.bild_pfad 
              ? supabase.storage.from('vehicle-images').getPublicUrl(v.bild_pfad).data.publicUrl 
              : null;

            return `
              <div class="card" style="cursor: pointer; margin-bottom: 0;" onclick="window.location.hash='#/vehicle/${escapeHtml(v.id)}'">
                ${imgUrl 
                  ? `<img src="${imgUrl}" style="width:100%; height:130px; border-radius:10px; object-fit:cover; margin-bottom:0.75rem;">` 
                  : `<div style="width:100%; height:130px; border-radius:10px; background:var(--color-bg); display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); font-weight:700; margin-bottom:0.75rem;">${escapeHtml(v.marke)} ${escapeHtml(v.modell)}</div>`}
                
                <div>
                  <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0 0 0.2rem 0;">${escapeHtml(v.bezeichnung)}</h3>
                  <p style="color: var(--color-text-muted); font-weight: 600; font-size: 0.85rem; margin: 0;">${escapeHtml(v.kennzeichen)} · ${(v.km_stand || 0).toLocaleString('de-AT')} km</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  } catch (err) {
    console.error('Dashboard-Fehler:', err);
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.4rem; font-weight: 800; margin:0;">Meine Fahrzeuge</h2>
        <a href="#/vehicle/new" class="btn">+ Fahrzeug anlegen</a>
      </div>
      <div class="card">
        <p style="color: var(--color-danger); font-weight:600;">Fehler beim Laden der Fahrzeuge:</p>
        <p style="font-size: 0.85rem; opacity: 0.8;">${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
}
