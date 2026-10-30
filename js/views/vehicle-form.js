import { supabase } from '../supabase.js';
import { getCurrentUser } from '../auth.js';
import { escapeHtml } from '../utils.js';

export async function renderVehicleForm(container, vehicleId = null) {
  const isEdit = Boolean(vehicleId);
  let vehicle = {
    bezeichnung: '',
    marke: '',
    modell: '',
    kennzeichen: '',
    fin: '',
    erstzulassung: '',
    km_stand: 0,
    notizen: '',
    bild_pfad: ''
  };

  container.innerHTML = `<div style="padding:1rem;"><p>Lade Formular...</p></div>`;

  if (isEdit) {
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
    if (error || !data) {
      container.innerHTML = `<div style="padding:1rem; color:var(--color-danger)">Fahrzeug konnte nicht geladen werden.</div>`;
      return;
    }
    vehicle = data;
  }

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <h2 class="form-title" style="margin:0;">${isEdit ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}</h2>
        <a href="#/dashboard" class="btn btn-secondary" style="padding: 0.5rem 0.9rem; font-size:0.85rem;">Abbrechen</a>
      </div>

      <form id="vehicle-form">
        <div class="form-group">
          <label class="form-label">Bezeichnung (z. B. Hauptauto, Zweitwagen) *</label>
          <input type="text" id="bezeichnung" class="input" value="${escapeHtml(vehicle.bezeichnung)}" required placeholder="z. B. Mein Audi A4">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Marke *</label>
            <input type="text" id="marke" class="input" value="${escapeHtml(vehicle.marke)}" required placeholder="Audi">
          </div>
          <div class="form-group">
            <label class="form-label">Modell *</label>
            <input type="text" id="modell" class="input" value="${escapeHtml(vehicle.modell)}" required placeholder="A4 Avant">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Kennzeichen *</label>
            <input type="text" id="kennzeichen" class="input" value="${escapeHtml(vehicle.kennzeichen)}" required placeholder="G-123AB">
          </div>
          <div class="form-group">
            <label class="form-label">Aktueller Kilometerstand *</label>
            <input type="number" id="km_stand" class="input" value="${vehicle.km_stand || 0}" min="0" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Erstzulassung</label>
            <input type="date" id="erstzulassung" class="input" value="${vehicle.erstzulassung || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">FIN (Fahrgestellnummer)</label>
            <input type="text" id="fin" class="input" value="${escapeHtml(vehicle.fin || '')}" placeholder="Optional">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Fahrzeugfoto hochladen</label>
          <input type="file" id="bild_file" class="input" accept="image/*">
        </div>

        <div class="form-group">
          <label class="form-label">Notizen</label>
          <textarea id="notizen" class="input" rows="3" placeholder="Besonderheiten, Zubehör etc.">${escapeHtml(vehicle.notizen || '')}</textarea>
        </div>

        <div style="margin-top:1.8rem;">
          <button type="submit" id="btn-save" class="btn" style="width:100%;">Fahrzeug speichern</button>
        </div>
        <p id="form-error" style="color:var(--color-danger); margin-top:0.75rem; text-align:center; font-weight:600;"></p>
      </form>
    </div>
  `;

  // Bildkomprimierung vor Upload
  async function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        };
      };
    });
  }

  document.getElementById('vehicle-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const errElem = document.getElementById('form-error');
    btn.disabled = true;
    btn.textContent = 'Speichere...';
    errElem.textContent = '';

    try {
      const user = await getCurrentUser();
      let bildPfad = vehicle.bild_pfad;

      const fileInput = document.getElementById('bild_file');
      if (fileInput.files && fileInput.files[0]) {
        const compressedBlob = await compressImage(fileInput.files[0]);
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, compressedBlob, { contentType: 'image/jpeg', upsert: true });

        if (uploadErr) throw uploadErr;
        bildPfad = uploadData.path;
      }

      const payload = {
        owner_id: user.id,
        bezeichnung: document.getElementById('bezeichnung').value,
        marke: document.getElementById('marke').value,
        modell: document.getElementById('modell').value,
        kennzeichen: document.getElementById('kennzeichen').value,
        km_stand: parseInt(document.getElementById('km_stand').value, 10) || 0,
        erstzulassung: document.getElementById('erstzulassung').value || null,
        fin: document.getElementById('fin').value || null,
        notizen: document.getElementById('notizen').value || null,
        bild_pfad: bildPfad
      };

      if (isEdit) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', vehicleId);
        if (error) throw error;
      } else {
        const { data: newVehicle, error } = await supabase.from('vehicles').insert(payload).select().single();
        if (error) throw error;

        // Standard-Überwachungstypen für das neue Fahrzeug anlegen
        const { data: types } = await supabase.from('monitor_types').select('*');
        if (types && types.length > 0) {
          const monitorsToInsert = types.map(t => ({
            vehicle_id: newVehicle.id,
            type_id: t.id,
            intervall_monate: t.standard_intervall_monate,
            intervall_km: t.standard_intervall_km,
            vorlauf_tage: t.vorlauf_tage
          }));
          await supabase.from('monitors').insert(monitorsToInsert);
        }
      }

      window.location.hash = '#/dashboard';
    } catch (err) {
      errElem.textContent = 'Fehler beim Speichern: ' + (err.message || err);
      btn.disabled = false;
      btn.textContent = 'Fahrzeug speichern';
    }
  });
}
