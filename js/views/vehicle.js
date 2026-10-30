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

    // Alle anderen Fahrzeuge des Users laden (für Vignetten-Übertragung)
    const { data: allVehicles } = await supabase
      .from('vehicles')
      .select('id, bezeichnung, kennzeichen')
      .neq('id', id);

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
          <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">${escapeHtml(vehicle.marke || '')} ${escapeHtml(vehicle.modell || '')} · <strong style="color: #F8FAFC;">${(vehicle.km_stand || 0).toLocaleString('de-AT')} km</strong></p>
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

      <!-- Fristen & Überprüfungen Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0;">Fristen & Überprüfungen</h3>
        <button id="btn-open-custom-monitor" class="btn" style="padding: 0.4rem 0.9rem !important; font-size: 0.8rem !important;">+ Neue Frist</button>
      </div>

      <!-- Modal für neue Frist anlegen -->
      <div id="custom-monitor-card" class="card" style="display: none; border-color: var(--color-primary); margin-bottom: 1rem;">
        <h4 style="margin: 0 0 0.8rem 0; font-size: 1rem; font-weight: 750;">Neue Frist anlegen</h4>
        <form id="custom-monitor-form">
          <div class="form-group">
            <label class="form-label">Bezeichnung der Frist</label>
            <input type="text" id="custom-mon-name" class="input" placeholder="z. B. Feuerlöscherprüfung" required>
          </div>
          <div class="form-group">
            <label class="form-label">Ablaufdatum</label>
            <input type="date" id="custom-mon-date" class="input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Vorlaufzeit (Tage vor Warnung)</label>
            <input type="number" id="custom-mon-vorlauf" class="input" value="30" required>
          </div>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" id="btn-cancel-custom" class="nav-pill" style="background: rgba(255,255,255,0.1);">Abbrechen</button>
            <button type="submit" class="btn" style="padding: 0.5rem 1rem !important;">Frist erstellen</button>
          </div>
        </form>
      </div>

      <!-- Modal zum Bearbeiten / Verlängern einer Frist -->
      <div id="monitor-modal-card" class="card" style="display: none; border-color: var(--color-primary); margin-bottom: 1rem;">
        <h4 id="monitor-modal-title" style="margin: 0 0 0.8rem 0; font-size: 1rem; font-weight: 750;">Frist verlängern</h4>
        <form id="monitor-form">
          <input type="hidden" id="edit-mon-id">
          <input type="hidden" id="edit-mon-typename">
          <div class="form-group">
            <label class="form-label">Art der Frist</label>
            <input type="text" id="mon-type-name" class="input" readonly style="opacity: 0.7; cursor: not-allowed;">
          </div>
          <div class="form-group">
            <label class="form-label">Neues Ablaufdatum</label>
            <input type="date" id="mon-date" class="input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Aktueller Kilometerstand</label>
            <input type="number" id="mon-km" class="input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Vorlaufzeit (Tage vor Warnung)</label>
            <input type="number" id="mon-vorlauf" class="input" value="30" required>
          </div>
          <div class="form-group">
            <label class="form-label">Notiz zur Verlängerung / Wartung (optional)</label>
            <input type="text" id="mon-history-notiz" class="input" placeholder="z. B. Pickerl ohne Mängel bestanden">
          </div>

          <!-- Spezielle Option für Vignette: Kennzeichen-Übertragung -->
          <div id="vignette-transfer-container" style="display: none; margin-top: 1rem; padding: 0.75rem; background: rgba(37,99,235,0.1); border-radius: 12px; border: 1px solid rgba(37,99,235,0.3);">
            <label class="form-label" style="color: var(--color-primary);">Vignette auf anderes Fahrzeug übertragen</label>
            <select id="target-vehicle-id" class="input">
              <option value="">-- Nicht übertragen (nur hier verlängern) --</option>
              ${(allVehicles || []).map(tv => `<option value="${tv.id}">${escapeHtml(tv.bezeichnung)} (${escapeHtml(tv.kennzeichen)})</option>`).join('')}
            </select>
            <small style="display: block; color: var(--color-text-muted); font-size: 0.75rem; margin-top: 0.3rem;">Überträgt das Ablaufdatum dieser Vignette direkt auf das gewählte Kennzeichen/Fahrzeug.</small>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" id="btn-cancel-monitor" class="nav-pill" style="background: rgba(255,255,255,0.1);">Abbrechen</button>
            <button type="submit" class="btn" style="padding: 0.5rem 1rem !important;">Speichern & Verlängern</button>
          </div>
        </form>
      </div>

      <!-- Liste der Fristen mit Lösch-Button für jede Frist -->
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

            const typeName = m.monitor_types ? m.monitor_types.name : (m.custom_name || 'Überprüfung');
            const datumFormatted = m.ablaufdatum ? new Date(m.ablaufdatum).toLocaleDateString('de-AT') : 'Kein Datum gesetzt';
            const histories = historyMap[m.id] || [];

            return `
              <div class="card" style="margin-bottom: 0; padding: 1rem 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.2rem 0;">${escapeHtml(typeName)}</h4>
                    <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">Gültig bis: <strong>${datumFormatted}</strong></p>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="background: ${badgeBg}; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px; text-transform: uppercase;">${statusText}</span>
                    <button type="button" class="btn-delete-main-monitor" data-id="${m.id}" data-typename="${escapeHtml(typeName)}" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 1.1rem; font-weight: 700; padding: 0.2rem 0.4rem;" title="Diese Frist komplett löschen">×</button>
                  </div>
                </div>

                <!-- Text-Button zum Verlängern -->
                <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--color-border);">
                  <button type="button" class="monitor-edit-btn nav-pill" data-id="${m.id}" data-typename="${escapeHtml(typeName)}" data-date="${m.ablaufdatum || ''}" data-vorlauf="${m.vorlauf_tage || 30}" style="background: rgba(37,99,235,0.2); color: #93c5fd; font-size: 0.75rem; padding: 0.3rem 0.75rem;">
                    + Verlängerung eintragen
                  </button>
                </div>

                <!-- Verlauf / Historie -->
                ${histories.length > 0 ? `
                  <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--color-border);">
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-bottom: 0.4rem;">Verlauf / Historie (${histories.length})</span>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                      ${histories.map(h => `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--color-text-muted); background: rgba(255,255,255,0.03); padding: 0.3rem 0.5rem; border-radius: 8px;">
                          <span>📅 Neu bis: <strong>${new Date(h.neues_ablaufdatum).toLocaleDateString('de-AT')}</strong> (${escapeHtml(h.notiz || 'Verlängert')}) · ${h.km_stand ? h.km_stand.toLocaleString('de-AT') + ' km' : ''}</span>
                          <button type="button" class="btn-delete-hist" data-histid="${h.id}" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.9rem; font-weight: 700; padding: 0 0.2rem;" title="Logeintrag löschen">×</button>
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

    // Modal Elemente
    const modalCard = document.getElementById('monitor-modal-card');
    const customCard = document.getElementById('custom-monitor-card');
    const editMonId = document.getElementById('edit-mon-id');
    const editMonTypeName = document.getElementById('edit-mon-typename');
    const monTypeNameInput = document.getElementById('mon-type-name');
    const monDateInput = document.getElementById('mon-date');
    const monKmInput = document.getElementById('mon-km');
    const monVorlaufInput = document.getElementById('mon-vorlauf');
    const monHistoryNotiz = document.getElementById('mon-history-notiz');
    const vignetteContainer = document.getElementById('vignette-transfer-container');
    const targetVehicleSelect = document.getElementById('target-vehicle-id');

    // Neue Frist anlegen
    document.getElementById('btn-open-custom-monitor').onclick = () => {
      customCard.style.display = customCard.style.display === 'none' ? 'block' : 'none';
      modalCard.style.display = 'none';
    };
    document.getElementById('btn-cancel-custom').onclick = () => {
      customCard.style.display = 'none';
    };

    document.getElementById('custom-monitor-form').onsubmit = async (e) => {
      e.preventDefault();
      const customName = document.getElementById('custom-mon-name').value.trim();
      const datum = document.getElementById('custom-mon-date').value;
      const vorlauf = parseInt(document.getElementById('custom-mon-vorlauf').value) || 30;

      try {
        const { error: insErr } = await supabase.from('monitors').insert({
          vehicle_id: id,
          custom_name: customName,
          ablaufdatum: datum,
          vorlauf_tage: vorlauf
        });
        if (insErr) throw insErr;
        renderVehicle(container, id);
      } catch (err) {
        alert('Fehler beim Anlegen der Frist: ' + err.message);
      }
    };

    // Verlängerung eintragen
    document.querySelectorAll('.monitor-edit-btn').forEach(btn => {
      btn.onclick = () => {
        const tName = btn.getAttribute('data-typename');
        editMonId.value = btn.getAttribute('data-id');
        editMonTypeName.value = tName;
        monTypeNameInput.value = tName;
        monDateInput.value = btn.getAttribute('data-date');
        monVorlaufInput.value = btn.getAttribute('data-vorlauf');
        monKmInput.value = vehicle.km_stand || 0;
        monHistoryNotiz.value = '';
        
        if (tName.toLowerCase().includes('vignette')) {
          vignetteContainer.style.display = 'block';
        } else {
          vignetteContainer.style.display = 'none';
        }

        modalCard.style.display = 'block';
        customCard.style.display = 'none';
        modalCard.scrollIntoView({ behavior: 'smooth' });
      };
    });

    document.getElementById('btn-cancel-monitor').onclick = () => {
      modalCard.style.display = 'none';
    };

    document.getElementById('monitor-form').onsubmit = async (e) => {
      e.preventDefault();
      const mId = editMonId.value;
      const tName = editMonTypeName.value;
      const neuesDatum = monDateInput.value;
      const neuerKm = parseInt(monKmInput.value) || 0;
      const vorlauf = parseInt(monVorlaufInput.value) || 30;
      const notiz = monHistoryNotiz.value.trim();
      const targetVehId = targetVehicleSelect ? targetVehicleSelect.value : '';

      try {
        await supabase.from('vehicles').update({ km_stand: neuerKm }).eq('id', id);

        await supabase.from('monitor_history').insert({
          monitor_id: mId,
          neues_ablaufdatum: neuesDatum,
          km_stand: neuerKm,
          notiz: notiz || 'Verlängerung eingetragen'
        });

        await supabase.from('monitors').update({
          ablaufdatum: neuesDatum,
          vorlauf_tage: vorlauf
        }).eq('id', mId);

        if (targetVehId && tName.toLowerCase().includes('vignette')) {
          const { data: targetMon } = await supabase
            .from('monitors')
            .select('id')
            .eq('vehicle_id', targetVehId)
            .limit(1);

          if (targetMon && targetMon.length > 0) {
            await supabase.from('monitors').update({
              ablaufdatum: neuesDatum,
              vorlauf_tage: vorlauf
            }).eq('id', targetMon[0].id);
          }
        }

        renderVehicle(container, id);
      } catch (err) {
        alert('Fehler beim Speichern: ' + err.message);
      }
    };

    // Haupt-Frist komplett löschen (egal ob fix oder benutzerdefiniert)
    document.querySelectorAll('.btn-delete-main-monitor').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const tName = btn.getAttribute('data-typename');
        if (confirm(`Möchten Sie die Frist "${tName}" und deren kompletten Verlauf wirklich löschen?`)) {
          const monId = btn.getAttribute('data-id');
          try {
            await supabase.from('monitor_history').delete().eq('monitor_id', monId);
            const { error: delMonErr } = await supabase.from('monitors').delete().eq('id', monId);
            if (delMonErr) throw delMonErr;
            renderVehicle(container, id);
          } catch (err) {
            alert('Fehler beim Löschen der Frist: ' + err.message);
          }
        }
      };
    });

    // Historie-Log löschen
    document.querySelectorAll('.btn-delete-hist').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Möchten Sie diesen Verlaufseintrag wirklich löschen?')) {
          const histId = btn.getAttribute('data-histid');
          try {
            await supabase.from('monitor_history').delete().eq('id', histId);
            renderVehicle(container, id);
          } catch (err) {
            alert('Fehler beim Löschen des Logs: ' + err.message);
          }
        }
      };
    });

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
