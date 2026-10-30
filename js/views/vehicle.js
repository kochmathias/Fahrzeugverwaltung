import { supabase } from '../supabase.js';
import { escapeHtml, berechneAmpel } from '../utils.js';

export async function renderVehicle(container, id) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
      <a href="#/dashboard" class="nav-pill" style="background: rgba(255,255,255,0.1); text-decoration: none;">← Zurück</a>
      <div style="display: flex; gap: 0.5rem;">
        <a href="#/vehicle/edit/${escapeHtml(id)}" class="btn" style="padding: 0.4rem 0.9rem !important; font-size: 0.8rem !important;">Bearbeiten</a>
      </div>
    </div>
    <div class="card"><p style="color: var(--color-text-muted); text-align:center;">Lade Fahrzeugdetails...</p></div>
  `;

  try {
    const { data: vehicle, error: vehError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (vehError) throw vehError;

    const { data: monitors, error: monError } = await supabase
      .from('monitors')
      .select('*, monitor_types(*)')
      .eq('vehicle_id', id);

    if (monError) console.warn('Monitore konnten nicht geladen werden:', monError);

    // Historie für alle Monitore dieses Fahrzeugs laden
    let historyMap = {};
    if (monitors && monitors.length > 0) {
      const monitorIds = monitors.map(m => m.id);
      const { data: histData } = await supabase
        .from('monitor_history')
        .select('*')
        .in('monitor_id', monitorIds)
        .order('erledigt_am', { ascending: false });

      if (histData) {
        histData.forEach(h => {
          if (!historyMap[h.monitor_id]) historyMap[h.monitor_id] = [];
          historyMap[h.monitor_id].push(h);
        });
      }
    }

    const { data: monitorTypes } = await supabase
      .from('monitor_types')
      .select('*');

    const imgUrl = vehicle.bild_pfad 
      ? supabase.storage.from('vehicle-images').getPublicUrl(vehicle.bild_pfad).data.publicUrl 
      : null;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
        <a href="#/dashboard" class="nav-pill" style="background: rgba(255,255,255,0.1); text-decoration: none;">← Zurück</a>
        <div style="display: flex; gap: 0.5rem;">
          <a href="#/vehicle/edit/${escapeHtml(id)}" class="btn" style="padding: 0.4rem 0.9rem !important; font-size: 0.8rem !important;">Bearbeiten</a>
        </div>
      </div>

      <!-- Fahrzeug-Header Karte -->
      <div class="card" style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.25rem;">
        ${imgUrl 
          ? `<img src="${imgUrl}" style="width:90px; height:90px; border-radius:16px; object-fit:cover; flex-shrink:0;">` 
          : `<div style="width:90px; height:90px; border-radius:16px; background:var(--color-bg); display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); font-size:0.85rem; font-weight:700; flex-shrink:0;">KFZ</div>`}
        
        <div style="flex-grow: 1; min-width: 0;">
          <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0 0 0.2rem 0;">${escapeHtml(vehicle.bezeichnung)}</h2>
          <p style="color: var(--color-primary); font-weight: 700; font-size: 0.95rem; margin: 0 0 0.3rem 0;">${escapeHtml(vehicle.kennzeichen)}</p>
          <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">${escapeHtml(vehicle.marke || '')} ${escapeHtml(vehicle.modell || '')} · ${(vehicle.km_stand || 0).toLocaleString('de-AT')} km</p>
        </div>
      </div>

      <!-- Stammdaten -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.8rem; letter-spacing: 0.04em;">Stammdaten</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.9rem;">
          <div>
            <span style="color: var(--color-text-muted); display: block; font-size: 0.75rem;">Erstzulassung</span>
            <strong>${vehicle.erstzulassung ? new Date(vehicle.erstzulassung).toLocaleDateString('de-AT') : 'Nicht angegeben'}</strong>
          </div>
          <div>
            <span style="color: var(--color-text-muted); display: block; font-size: 0.75rem;">FIN (Fahrgestellnummer)</span>
            <strong>${escapeHtml(vehicle.fin || 'Nicht angegeben')}</strong>
          </div>
        </div>
        ${vehicle.notizen ? `
          <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid var(--color-border);">
            <span style="color: var(--color-text-muted); display: block; font-size: 0.75rem; margin-bottom: 0.2rem;">Notizen / Zubehör</span>
            <p style="margin: 0; font-size: 0.9rem; white-space: pre-wrap;">${escapeHtml(vehicle.notizen)}</p>
          </div>
        ` : ''}
      </div>

      <!-- Fristen & Überprüfungen -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0;">Fristen & Überprüfungen</h3>
      </div>

      <!-- Modal zum Bearbeiten / Verlängern einer Frist -->
      <div id="monitor-modal-card" class="card" style="display: none; border-color: var(--color-primary); margin-bottom: 1rem;">
        <h4 id="monitor-modal-title" style="margin: 0 0 0.8rem 0; font-size: 1rem; font-weight: 750;">Frist bearbeiten & verlängern</h4>
        <form id="monitor-form">
          <input type="hidden" id="edit-mon-id">
          <div class="form-group">
            <label class="form-label">Art der Frist</label>
            <input type="text" id="mon-type-name" class="input" readonly style="opacity: 0.7; cursor: not-allowed;">
          </div>
          <div class="form-group">
            <label class="form-label">Neues Ablaufdatum</label>
            <input type="date" id="mon-date" class="input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Vorlaufzeit (Tage vor Warnung)</label>
            <input type="number" id="mon-vorlauf" class="input" value="30" required>
          </div>
          <div class="form-group">
            <label class="form-label">Notiz zur Verlängerung / Wartung (optional)</label>
            <input type="text" id="mon-history-notiz" class="input" placeholder="z. B. Pickerl ohne Mängel bestanden">
          </div>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" id="btn-cancel-monitor" class="nav-pill" style="background: rgba(255,255,255,0.1);">Abbrechen</button>
            <button type="submit" class="btn" style="padding: 0.5rem 1rem !important;">Speichern & Verlängern</button>
          </div>
        </form>
      </div>

      <!-- Liste der Fristen mit Historien-Anzeige -->
      ${(!monitors || monitors.length === 0) ? `
        <div class="card" style="text-align: center; padding: 1.5rem 1rem;">
          <p style="color: var(--color-text-muted); margin: 0; font-size: 0.85rem;">Keine Fristen konfiguriert.</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
          ${monitors.map(m => {
            const status = berechneAmpel(m.ablaufdatum, m.vorlauf_tage, vehicle.km_stand, m.naechste_faellig_km);
            let badgeBg = 'var(--color-success)';
            let statusText = 'Gut';
            if (status === 'red') { badgeBg = 'var(--color-danger)'; statusText = 'Überfällig'; }
            else if (status === 'yellow') { badgeBg = 'var(--color-warning)'; statusText = 'Bald fällig'; }

            const typeName = m.monitor_types ? m.monitor_types.name : 'Überprüfung';
            const datumFormatted = m.ablaufdatum ? new Date(m.ablaufdatum).toLocaleDateString('de-AT') : 'Kein Datum gesetzt';
            const histories = historyMap[m.id] || [];

            return `
              <div class="card" style="margin-bottom: 0; padding: 1rem 1.25rem;">
                <div class="monitor-item" data-id="${m.id}" data-typename="${escapeHtml(typeName)}" data-date="${m.ablaufdatum || ''}" data-vorlauf="${m.vorlauf_tage || 30}" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.2rem 0;">${escapeHtml(typeName)}</h4>
                    <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">Gültig bis: <strong>${datumFormatted}</strong></p>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="background: ${badgeBg}; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px; text-transform: uppercase;">${statusText}</span>
                    <span style="color: var(--color-text-muted); font-size: 0.8rem;">✏️</span>
                  </div>
                </div>

                <!-- Historie / Log für diesen Monitor anzeigen, falls vorhanden -->
                ${histories.length > 0 ? `
                  <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--color-border);">
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-bottom: 0.4rem;">Verlauf / Historie (${histories.length})</span>
                    <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                      ${histories.map(h => `
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--color-text-muted);">
                          <span>📅 Neu bis: <strong>${new Date(h.neues_ablaufdatum).toLocaleDateString('de-AT')}</strong> (${escapeHtml(h.notiz || 'Verlängert')})</span>
                          <span>${h.km_stand ? h.km_stand.toLocaleString('de-AT') + ' km' : ''}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- Fahrzeug löschen -->
      <div style="margin-top: 2rem; text-align: center;">
        <button id="btn-delete-vehicle" style="background: transparent; border: 1px solid var(--color-danger); color: var(--color-danger); border-radius: 14px; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 700; cursor: pointer;">Fahrzeug löschen</button>
      </div>
    `;

    const modalCard = document.getElementById('monitor-modal-card');
    const editMonId = document.getElementById('edit-mon-id');
    const monTypeNameInput = document.getElementById('mon-type-name');
    const monDateInput = document.getElementById('mon-date');
    const monVorlaufInput = document.getElementById('mon-vorlauf');
    const monHistoryNotiz = document.getElementById('mon-history-notiz');

    document.querySelectorAll('.monitor-item').forEach(item => {
      item.onclick = () => {
        editMonId.value = item.getAttribute('data-id');
        monTypeNameInput.value = item.getAttribute('data-typename');
        monDateInput.value = item.getAttribute('data-date');
        monVorlaufInput.value = item.getAttribute('data-vorlauf');
        monHistoryNotiz.value = '';
        modalCard.style.display = 'block';
        modalCard.scrollIntoView({ behavior: 'smooth' });
      };
    });

    document.getElementById('btn-cancel-monitor').onclick = () => {
      modalCard.style.display = 'none';
    };

    document.getElementById('monitor-form').onsubmit = async (e) => {
      e.preventDefault();
      const mId = editMonId.value;
      const neuesDatum = monDateInput.value;
      const vorlauf = parseInt(monVorlaufInput.value) || 30;
      const notiz = monHistoryNotiz.value.trim();

      try {
        // Historie im Backend abspeichern
        await supabase.from('monitor_history').insert({
          monitor_id: mId,
          neues_ablaufdatum: neuesDatum,
          km_stand: vehicle.km_stand,
          notiz: notiz || 'Frist verlängert / aktualisiert'
        });

        // Aktuelle Frist aktualisieren
        const { error: upErr } = await supabase.from('monitors').update({
          ablaufdatum: neuesDatum,
          vorlauf_tage: vorlauf
        }).eq('id', mId);

        if (upErr) throw upErr;
        renderVehicle(container, id);
      } catch (err) {
        alert('Fehler beim Speichern der Frist: ' + err.message);
      }
    };

    document.getElementById('btn-delete-vehicle').onclick = async () => {
      if (confirm('Möchten Sie dieses Fahrzeug und alle zugehörigen Fristen wirklich unwiderruflich löschen?')) {
        try {
          await supabase.from('monitors').delete().eq('vehicle_id', id);
          const { error: delErr } = await supabase.from('vehicles').delete().eq('id', id);
          if (delErr) throw delErr;
          window.location.hash = '#/dashboard';
        } catch (err) {
          alert('Fehler beim Löschen des Fahrzeugs: ' + err.message);
        }
      }
    };

  } catch (err) {
    console.error('Detail-Fehler:', err);
    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;"><a href="#/dashboard" class="nav-pill" style="background: rgba(255,255,255,0.1); text-decoration: none;">← Zurück</a></div>
      <div class="card" style="border-color: var(--color-danger);">
        <p style="color: var(--color-danger); font-weight:600; margin:0 0 0.5rem 0;">Fehler beim Laden des Fahrzeugs:</p>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin:0;">${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
}
