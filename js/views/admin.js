import { supabase } from '../supabase.js';
import { escapeHtml } from '../utils.js';

export async function renderAdmin(container) {
  container.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.2rem 0;">Administration</h2>
      <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Benutzer, Passwörter & Fahrzeug-Zuordnungen</p>
    </div>
    <div class="card"><p style="color: var(--color-text-muted); text-align:center;">Lade Admin-Bereich...</p></div>
  `;

  try {
    // 1. Monitor-Typen laden
    const { data: monitorTypes } = await supabase.from('monitor_types').select('*').order('name');

    // 2. Benutzer-Profile laden
    const { data: users } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });

    // 3. Alle Fahrzeuge laden (für die Zuweisung)
    const { data: vehicles } = await supabase.from('vehicles').select('id, bezeichnung, kennzeichen');

    // 4. Bestehende Zuordnungen laden
    const { data: userVehicles } = await supabase.from('user_vehicles').select('*');

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.2rem 0;">Administration</h2>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Benutzer, Passwörter & Fahrzeug-Zuordnungen</p>
      </div>

      <!-- Sektion: Benutzer anlegen & zuordnen -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 800; margin: 0 0 0.5rem 0;">Benutzer & Fahrzeug-Freigaben</h3>
        <p style="color: var(--color-text-muted); font-size: 0.82rem; margin-bottom: 1rem;">Legen Sie Benutzer an und bestimmen Sie, welche Fahrzeuge diese einsehen dürfen.</p>

        <form id="create-user-form" style="margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 14px; border: 1px solid var(--color-border);">
          <h4 style="font-size: 0.9rem; font-weight: 750; margin: 0 0 0.75rem 0; color: var(--color-primary);">Neuen Benutzer erstellen</h4>
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label">E-Mail / Benutzername</label>
            <input type="email" id="new-user-email" class="input" placeholder="benutzer@gmx.at" required>
          </div>
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label">Passwort</label>
            <input type="password" id="new-user-password" class="input" placeholder="••••••••" required>
          </div>

          ${vehicles && vehicles.length > 0 ? `
            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label class="form-label">Fahrzeug-Berechtigungen</label>
              <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.3rem;">
                ${vehicles.map(v => `
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #F8FAFC; cursor: pointer;">
                    <input type="checkbox" name="assign-vehicle" value="${v.id}" style="accent-color: var(--color-primary); width: 16px; height: 16px;">
                    ${escapeHtml(v.bezeichnung)} (${escapeHtml(v.kennzeichen)})
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <button type="submit" class="btn" style="width: 100%; margin-top: 0.5rem;">Benutzer anlegen</button>
        </form>

        <!-- Liste bestehender Benutzer -->
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${(!users || users.length === 0) ? `
            <p style="color: var(--color-text-muted); font-size: 0.85rem; text-align: center; margin: 0.5rem 0;">Bisher keine weiteren Benutzer angelegt.</p>
          ` : users.map(u => {
            const assignedVehs = (userVehicles || []).filter(uv => uv.user_id === u.id).map(uv => {
              const veh = (vehicles || []).find(v => v.id === uv.vehicle_id);
              return veh ? `${veh.bezeichnung} (${veh.kennzeichen})` : '';
            }).filter(Boolean);

            return `
              <div class="card" style="margin-bottom: 0; padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <span style="font-size: 0.95rem; font-weight: 800; color: #F8FAFC; display: block;">${escapeHtml(u.email)}</span>
                    <span style="font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase;">Rolle: ${escapeHtml(u.role || 'User')}</span>
                  </div>
                  <button type="button" class="btn-delete-user" data-id="${u.id}" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 1.1rem; font-weight: 700; padding: 0.2rem 0.4rem;" title="Benutzer löschen">×</button>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed var(--color-border);">
                  Zugeordnete Fahrzeuge: <strong>${assignedVehs.length > 0 ? assignedVehs.join(', ') : 'Keine Fahrzeuge zugewiesen'}</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Sektion: Standard-Fristen Vorlagen -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 800; margin: 0;">Standard-Fristen Vorlagen</h3>
        </div>
        <form id="add-type-form" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
          <input type="text" id="new-type-name" class="input" placeholder="Neue Vorlage (z. B. Feuerlöscher)" required style="margin-bottom: 0;">
          <button type="submit" class="btn" style="white-space: nowrap; padding: 0.6rem 1rem !important;">+ Hinzufügen</button>
        </form>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${(!monitorTypes || monitorTypes.length === 0) ? `
            <p style="color: var(--color-text-muted); font-size: 0.85rem; text-align: center; margin: 1rem 0;">Keine Vorlagen vorhanden.</p>
          ` : monitorTypes.map(t => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--color-border);">
              <span style="font-size: 0.9rem; font-weight: 700; color: #F8FAFC;">${escapeHtml(t.name)}</span>
              <button type="button" class="btn-delete-type" data-id="${t.id}" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 1.1rem; font-weight: 700; padding: 0.2rem 0.4rem;" title="Vorlage löschen">×</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Handler: Benutzer anlegen & Fahrzeugzuordnungen speichern
    document.getElementById('create-user-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('new-user-email').value.trim();
      const password = document.getElementById('new-user-password').value;
      const selectedVehicles = Array.from(document.querySelectorAll('input[name="assign-vehicle"]:checked')).map(cb => cb.value);

      try {
        // 1. In user_profiles eintragen
        const { data: newUser, error: insErr } = await supabase.from('user_profiles').insert({
          email: email,
          role: 'user'
        }).select().single();

        if (insErr) throw insErr;

        // 2. Fahrzeug-Zuordnungen speichern
        if (selectedVehicles.length > 0 && newUser) {
          const relationInserts = selectedVehicles.map(vehId => ({
            user_id: newUser.id,
            vehicle_id: vehId
          }));
          const { error: relErr } = await supabase.from('user_vehicles').insert(relationInserts);
          if (relErr) throw relErr;
        }

        alert(`Benutzer ${email} erfolgreich erstellt und Fahrzeuge zugewiesen!`);
        renderAdmin(container);
      } catch (err) {
        alert('Fehler beim Erstellen des Benutzers: ' + err.message);
      }
    };

    // Handler: Benutzer löschen
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Möchten Sie diesen Benutzer und seine Zuordnungen wirklich löschen?')) {
          const userId = btn.getAttribute('data-id');
          try {
            await supabase.from('user_vehicles').delete().eq('user_id', userId);
            const { error: delErr } = await supabase.from('user_profiles').delete().eq('id', userId);
            if (delErr) throw delErr;
            renderAdmin(container);
          } catch (err) {
            alert('Fehler beim Löschen: ' + err.message);
          }
        }
      };
    });

    // Handler: Vorlage hinzufügen
    document.getElementById('add-type-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-type-name').value.trim();
      if (!name) return;
      try {
        const { error: insErr } = await supabase.from('monitor_types').insert({ name });
        if (insErr) throw insErr;
        renderAdmin(container);
      } catch (err) {
        alert('Fehler: ' + err.message);
      }
    };

    // Handler: Vorlage löschen
    document.querySelectorAll('.btn-delete-type').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Möchten Sie diese Vorlage löschen?')) {
          const typeId = btn.getAttribute('data-id');
          await supabase.from('monitor_types').delete().eq('id', typeId);
          renderAdmin(container);
        }
      };
    });

  } catch (err) {
    console.error('Admin-Fehler:', err);
    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;"><h2 style="font-size: 1.3rem; font-weight: 800; margin: 0;">Administration</h2></div>
      <div class="card" style="border-color: var(--color-danger);">
        <p style="color: var(--color-danger); font-weight: 600; margin: 0 0 0.5rem 0;">Fehler beim Laden des Admin-Bereichs:</p>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin: 0;">${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
}
