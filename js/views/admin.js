import { supabase } from '../supabase.js';
import { escapeHtml } from '../utils.js';

export async function renderAdmin(container) {
  container.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.2rem 0;">Administration</h2>
      <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Verwaltung von System-Standards und Vorlagen</p>
    </div>
    <div class="card"><p style="color: var(--color-text-muted); text-align:center;">Lade Admin-Daten...</p></div>
  `;

  try {
    // Monitor-Typen (Vorlagen) laden
    const { data: monitorTypes, error } = await supabase
      .from('monitor_types')
      .select('*')
      .order('name');

    if (error) throw error;

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.2rem 0;">Administration</h2>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Verwaltung von System-Standards und Vorlagen</p>
      </div>

      <!-- Sektion: Standard-Fristen / Monitor-Typen -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 800; margin: 0;">Standard-Frister Vorlagen</h3>
        </div>
        <p style="color: var(--color-text-muted); font-size: 0.82rem; margin-bottom: 1rem;">Diese Vorlagen stehen beim Hinzufügen von Fristen an Fahrzeugen zur Auswahl.</p>

        <!-- Formular zum Hinzufügen einer neuen Vorlage -->
        <form id="add-type-form" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
          <input type="text" id="new-type-name" class="input" placeholder="Neue Vorlage (z. B. Feuerlöscher)" required style="margin-bottom: 0;">
          <button type="submit" class="btn" style="white-space: nowrap; padding: 0.6rem 1rem !important;">+ Hinzufügen</button>
        </form>

        <!-- Liste der Vorlagen -->
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

      <!-- Sektion: App-Info -->
      <div class="card">
        <h3 style="font-size: 1rem; font-weight: 800; margin: 0 0 0.5rem 0;">System-Informationen</h3>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0 0 0.5rem 0;">Fahrzeugverwaltung PWA v1.0</p>
        <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">Datenbank-Anbindung: Supabase (Aktiv)</p>
      </div>
    `;

    // Handler: Neue Vorlage hinzufügen
    document.getElementById('add-type-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-type-name').value.trim();
      if (!name) return;

      try {
        const { error: insErr } = await supabase.from('monitor_types').insert({ name });
        if (insErr) throw insErr;
        renderAdmin(container);
      } catch (err) {
        alert('Fehler beim Hinzufügen der Vorlage: ' + err.message);
      }
    };

    // Handler: Vorlage löschen
    document.querySelectorAll('.btn-delete-type').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
          const typeId = btn.getAttribute('data-id');
          try {
            const { error: delErr } = await supabase.from('monitor_types').delete().eq('id', typeId);
            if (delErr) throw delErr;
            renderAdmin(container);
          } catch (err) {
            alert('Fehler beim Löschen: ' + err.message);
          }
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
