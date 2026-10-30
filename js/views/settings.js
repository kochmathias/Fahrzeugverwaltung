import { supabase } from '../supabase.js';
import { escapeHtml } from '../utils.js';

export async function renderSettings(container) {
  container.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.2rem 0;">Einstellungen</h2>
      <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Persönliche Optionen & Passwort verwalten</p>
    </div>
    <div class="card"><p style="color: var(--color-text-muted); text-align:center;">Lade Einstellungen...</p></div>
  `;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.2rem 0;">Einstellungen</h2>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Persönliche Optionen & Passwort verwalten</p>
      </div>

      <!-- Sektion: Benutzerprofil -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 800; margin: 0 0 0.8rem 0;">Benutzerkonto</h3>
        <div class="form-group">
          <label class="form-label">Angemeldet als</label>
          <input type="text" class="input" value="${escapeHtml(user?.email || 'Unbekannt')}" readonly style="opacity: 0.7; cursor: not-allowed;">
        </div>
      </div>

      <!-- Sektion: Passwort ändern -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 800; margin: 0 0 0.8rem 0;">Passwort ändern</h3>
        <form id="change-password-form">
          <div class="form-group">
            <label class="form-label">Neues Passwort</label>
            <input type="password" id="new-password" class="input" placeholder="••••••••" required minlength="6">
          </div>
          <div class="form-group">
            <label class="form-label">Passwort wiederholen</label>
            <input type="password" id="confirm-password" class="input" placeholder="••••••••" required minlength="6">
          </div>
          <button type="submit" id="btn-save-pw" class="btn" style="width: 100%;">Passwort aktualisieren</button>
          <p id="pw-message" style="margin-top: 0.75rem; font-size: 0.85rem; font-weight: 600; text-align: center; min-height: 1.2em;"></p>
        </form>
      </div>

      <!-- Sektion: Standards für Benachrichtigungen -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 800; margin: 0 0 0.8rem 0;">Fristen-Warnungen</h3>
        <div class="form-group">
          <label class="form-label">Standard-Vorlaufzeit für neue Fristen (Tage)</label>
          <input type="number" id="default-vorlauf" class="input" value="30">
        </div>
        <p style="color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">Legt fest, wie viele Tage vor dem Ablaufdatum einer Frist die Ampel im Dashboard auf „Gelb“ schaltet.</p>
      </div>

      <!-- Sektion: System & App Details -->
      <div class="card">
        <h3 style="font-size: 1rem; font-weight: 800; margin: 0 0 0.5rem 0;">App-Informationen</h3>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0 0 0.25rem 0;">Österreichische Fahrzeugverwaltung PWA</p>
        <p style="color: var(--color-text-muted); font-size: 0.78rem; margin: 0;">Version 1.0.0 · Offline-fähig (Service Worker aktiv)</p>
      </div>
    `;

    // Handler: Passwort ändern
    document.getElementById('change-password-form').onsubmit = async (e) => {
      e.preventDefault();
      const pw1 = document.getElementById('new-password').value;
      const pw2 = document.getElementById('confirm-password').value;
      const msgElem = document.getElementById('pw-message');
      const btn = document.getElementById('btn-save-pw');

      if (pw1 !== pw2) {
        msgElem.style.color = 'var(--color-danger)';
        msgElem.textContent = 'Die Passwörter stimmen nicht überein.';
        return;
      }

      btn.disabled = true;
      msgElem.style.color = 'var(--color-text-muted)';
      msgElem.textContent = 'Speichere neues Passwort...';

      try {
        const { error } = await supabase.auth.updateUser({ password: pw1 });
        if (error) throw error;

        msgElem.style.color = 'var(--color-success)';
        msgElem.textContent = 'Passwort wurde erfolgreich geändert!';
        document.getElementById('change-password-form').reset();
      } catch (err) {
        msgElem.style.color = 'var(--color-danger)';
        msgElem.textContent = 'Fehler: ' + (err.message || 'Passwort konnte nicht geändert werden.');
      } finally {
        btn.disabled = false;
      }
    };

  } catch (err) {
    console.error('Settings-Fehler:', err);
    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;"><h2 style="font-size: 1.3rem; font-weight: 800; margin: 0;">Einstellungen</h2></div>
      <div class="card" style="border-color: var(--color-danger);">
        <p style="color: var(--color-danger); font-weight: 600; margin: 0 0 0.5rem 0;">Fehler beim Laden der Einstellungen:</p>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin: 0;">${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
}
