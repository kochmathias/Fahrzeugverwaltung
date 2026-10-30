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
        <button id="btn-open-add-monitor" class="btn" style="padding: 0.4rem 0.9rem !important; font-size: 0.8rem !important;">+ Frist</button>
      </div>

      <!-- Modal zum Bearbeiten / Hinzufügen einer Frist -->
      <div id="monitor-modal-card" class="card" style="display: none; border-color: var(--color-primary); margin-bottom: 1rem;">
        <h4 id="monitor-modal-title" style="margin: 0 0 0.8rem 0; font-size: 1rem; font-weight: 750;">Frist bearbeiten</h4>
        <form id="monitor-form">
          <input type="hidden" id="edit-mon-id">
          <div class="form-group">
            <label class="form-label">Art der Frist</label>
            <select id="mon-type" class="input" required>
              <option value="">Bitte wählen...</option>
              ${(monitorTypes || []).map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ablaufdatum</label>
            <input type="date" id="mon-date" class="input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Vorlaufzeit (Tage vor Warnung)</label>
            <input type="number" id="mon-vorlauf" class="input" value="30" required>
          </div>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button type="button" id="btn-cancel-monitor" class="nav-pill" style="background: rgba(255,255,255,0.1);">Abbrechen</button>
            <button type="submit" class="btn" style="padding: 0.5rem 1rem !important;">Speichern</button>
          </div>
        </form>
      </div>

      <!-- Liste der Fristen (klickbar zum Bearbeiten) -->
      ${(!monitors || monitors.length === 0) ? `
        <div class="card" style="text-align: center; padding: 1.5rem 1rem;">
          <p style="color: var(--color-text-muted); margin: 0; font-size: 0.85rem;">Noch keine Fristen hinterlegt.</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem;">
          ${monitors.map(m => {
            const status = berechneAmpel(m.ablaufdatum, m.vorlauf_tage, vehicle.km_stand, m.naechste_faellig_km);
            let badgeBg = 'var(--color-success)';
            let statusText = 'Gut';
            if (status === 'red') { badgeBg = 'var(--color-danger)'; statusText = 'Überfällig'; }
            else if (status === 'yellow') { badgeBg = 'var(--color-warning)'; statusText = 'Bald fällig'; }

            const typeName = m.monitor_types ? m.monitor_types.name : 'Überprüfung';
            const datumFormatted = m.ablaufdatum ? new Date(m.ablaufdatum).toLocaleDateString('de-AT') : 'Kein Datum';

            return `
              <div class="card monitor-item" data-id="${m.id}" data-typeid="${m.monitor_type_id}" data-date="${m.ablaufdatum || ''}" data-vorlauf="${m.vorlauf_tage || 30}" style="cursor: pointer; margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; transition: border-color 0.2s;">
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.2rem 0;">${escapeHtml(typeName)}</h4>
                  <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">Gültig bis: <strong>${datumFormatted}</strong></p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="background: ${badgeBg}; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px; text-transform: uppercase;">${statusText}</span>
                  <button type="button" class="btn-delete-mon" data-id="${m.id}" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 1.1rem; padding: 0.2rem;">×</button>
                </div>
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
    const modalTitle = document.getElementById('monitor-modal-title');
    const editMonId = document.getElementById('edit-mon-id');
    const monTypeSelect = document.getElementById('mon-type');
    const monDateInput = document.getElementById('mon-date');
    const monVorlaufInput = document.getElementById('mon-vorlauf');

    // Öffnen für neue Frist
    document.getElementById('btn-open-add-monitor').onclick = () => {
      editMonId.value = '';
      monTypeSelect.value = '';
      monDateInput.value = '';
      monVorlaufInput.value = '30';
      modalTitle.textContent = 'Frist hinzufügen';
      modalCard.style.display = 'block';
    };

    // Klick auf eine bestehende Frist zum Bearbeiten/Datum eintragen
    document.querySelectorAll('.monitor-item').forEach(item => {
      item.onclick = (e) => {
        if (e.target.classList.contains('btn-delete-mon')) return; // Lösch-Button ignorieren
        editMonId.value = item.getAttribute('data-id');
        monTypeSelect.value = item.getAttribute('data-typeid');
        monDateInput.value = item.getAttribute('data-date');
        monVorlaufInput.value = item.getAttribute('data-vorlauf');
        modalTitle.textContent = 'Frist / Ablaufdatum bearbeiten';
        modalCard.style.display = 'block';
      };
    });

    document.getElementById('btn-cancel-monitor').onclick = () => {
      modalCard.style.display = 'none';
    };

    // Frist speichern (Update oder Insert)
    document.getElementById('monitor-form').onsubmit = async (e) => {
      e.preventDefault();
      const mId = editMonId.value;
      const typeId = monTypeSelect.value;
      const ablaufdatum = monDateInput.value;
      const vorlauf = parseInt(monVorlaufInput.value) || 30;

      try {
        if (mId) {
          // Update bestehender Frist
          const { error: upErr } = await supabase.from('monitors').update({
            monitor_type_id: typeId,
            ablaufdatum: ablaufdatum,
            vorlauf_tage: vorlauf
          }).eq('id', mId);
          if (upErr) throw upErr;
        } else {
          // Neue Frist einfügen
          const { error: insErr } = await supabase.from('monitors').insert({
            vehicle_id: id,
            monitor_type_id: typeId,
            ablaufdatum: ablaufdatum,
            vorlauf_tage: vorlauf
          });
          if (insErr) throw insErr;
        }
        renderVehicle(container, id);
      } catch (err) {
        alert('Fehler beim Speichern der Frist: ' + err.message);
      }
    };

    // Frist löschen
    document.querySelectorAll('.btn-delete-mon').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Möchten Sie diese Frist wirklich löschen?')) {
          const monId = btn.getAttribute('data-id');
          await supabase.from('monitors').delete().eq('id', monId);
          renderVehicle(container, id);
        }
      };
    });

    // Fahrzeug löschen
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
