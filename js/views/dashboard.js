import { supabase } from '../supabase.js';
import { escapeHtml, berechneAmpel } from '../utils.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
      <h2 style="font-size: 1.3rem; font-weight: 800; margin:0;">Meine Fahrzeuge</h2>
      <a href="#/vehicle/new" class="btn">+ Fahrzeug</a>
    </div>
    <div class="card"><p style="color: var(--color-text-muted); text-align:center;">Lade Fahrzeuge...</p></div>
  `;

  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let totalRot = 0;
    let totalGelb = 0;
    let totalGuenst = 0;

    let vehicleStatusMap = {};
    let monitorsMap = {};

    try {
      const { data: monitors } = await supabase.from('monitors').select('*, monitor_types(*)');
      if (monitors) {
        monitors.forEach(m => {
          if (!monitorsMap[m.vehicle_id]) monitorsMap[m.vehicle_id] = [];
          monitorsMap[m.vehicle_id].push(m);
          
          const v = vehicles.find(veh => veh.id === m.vehicle_id);
          const km = v ? v.km_stand : 0;
          const status = berechneAmpel(m.ablaufdatum, m.vorlauf_tage, km, m.naechste_faellig_km);
          
          if (status === 'red') totalRot++;
          else if (status === 'yellow') totalGelb++;
          else if (status === 'green') totalGuenst++;

          // Schlechtesten Status für das Fahrzeug ermitteln (red > yellow > green)
          const currentWorst = vehicleStatusMap[m.vehicle_id];
          if (status === 'red') {
            vehicleStatusMap[m.vehicle_id] = 'red';
          } else if (status === 'yellow' && currentWorst !== 'red') {
            vehicleStatusMap[m.vehicle_id] = 'yellow';
          } else if (status === 'green' && !currentWorst) {
            vehicleStatusMap[m.vehicle_id] = 'green';
          }
        });
      }
    } catch (e) {
      console.warn('Monitore konnten nicht geladen werden:', e);
    }

    container.innerHTML = `
      <!-- KPI Summary Bar -->
      <div class="kpi-grid">
        <div class="card kpi-card">
          <div class="kpi-value">${(vehicles || []).length}</div>
          <div class="kpi-label">Fahrzeuge</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-value" style="color: var(--color-danger);">${totalRot}</div>
          <div class="kpi-label">Überfällig</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-value" style="color: var(--color-warning);">${totalGelb}</div>
          <div class="kpi-label">Bald fällig</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-value" style="color: var(--color-success);">${totalGuenst}</div>
          <div class="kpi-label">Gut</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="font-size: 1.3rem; font-weight: 800; margin:0;">Fahrzeugliste</h2>
        <a href="#/vehicle/new" class="btn">+ Fahrzeug</a>
      </div>

      ${(!vehicles || vehicles.length === 0) ? `
        <div class="card" style="text-align: center; padding: 2.5rem 1rem;">
          <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Noch keine Fahrzeuge vorhanden.</p>
          <a href="#/vehicle/new" class="btn">+ Erstes Fahrzeug anlegen</a>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${vehicles.map(v => {
            const imgUrl = v.bild_pfad 
              ? supabase.storage.from('vehicle-images').getPublicUrl(v.bild_pfad).data.publicUrl 
              : null;

            const worstStatus = vehicleStatusMap[v.id];
            let borderColor = 'var(--color-border)';
            if (worstStatus === 'red') borderColor = 'var(--color-danger)';
            else if (worstStatus === 'yellow') borderColor = 'var(--color-warning)';
            else if (worstStatus === 'green') borderColor = 'var(--color-success)';

            return `
              <div class="card" style="cursor: pointer; margin-bottom: 0.75rem; display: flex; gap: 1rem; align-items: center; border-left: 5px solid ${borderColor};" onclick="window.location.hash='#/vehicle/${escapeHtml(v.id)}'">
                ${imgUrl 
                  ? `<img src="${imgUrl}" style="width:70px; height:70px; border-radius:12px; object-fit:cover; flex-shrink:0;">` 
                  : `<div style="width:70px; height:70px; border-radius:12px; background:var(--color-bg); display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); font-size:0.75rem; font-weight:700; flex-shrink:0;">KFZ</div>`}
                
                <div style="flex-grow: 1; min-width: 0;">
                  <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.15rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(v.bezeichnung)}</h3>
                  <p style="color: var(--color-text-muted); font-weight: 600; font-size: 0.8rem; margin: 0;">${escapeHtml(v.kennzeichen)} · ${(v.km_stand || 0).toLocaleString('de-AT')} km</p>
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
        <h2 style="font-size: 1.3rem; font-weight: 800; margin:0;">Meine Fahrzeuge</h2>
        <a href="#/vehicle/new" class="btn">+ Fahrzeug</a>
      </div>
      <div class="card" style="border-color: var(--color-danger);">
        <p style="color: var(--color-danger); font-weight:600; margin:0 0 0.5rem 0;">Fehler beim Laden der Fahrzeuge:</p>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin:0; word-break: break-all;">${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
}
