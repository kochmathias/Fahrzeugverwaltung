import { loginUser } from '../auth.js';
import { escapeHtml } from '../utils.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div style="max-width: 380px; margin: 2.5rem auto; padding: 1.75rem 1.25rem;" class="card">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(37,99,235,0.3); margin-bottom: 0.75rem;">
          <img src="icons/icon-192.png" alt="Logo" style="width: 32px; height: 32px; object-fit: cover;" onerror="this.style.display='none'">
        </div>
        <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #F8FAFC; letter-spacing: -0.02em;">Fahrzeugverwaltung</h2>
        <p style="color: var(--color-text-muted); font-size: 0.8rem; margin-top: 0.3rem;">Bitte melden Sie sich an</p>
      </div>
      
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">Benutzername oder E-Mail</label>
          <input type="text" id="username" class="input" autocomplete="username" required placeholder="z. B. admin">
        </div>
        
        <div class="form-group">
          <label class="form-label">Passwort</label>
          <input type="password" id="password" class="input" autocomplete="current-password" required placeholder="••••••••">
        </div>
        
        <button type="submit" id="btn-login-submit" class="btn" style="width: 100%; margin-top: 0.5rem;">Anmelden</button>
        <p id="login-error" style="color: var(--color-danger); margin-top: 1rem; text-align: center; font-weight: 600; font-size: 0.85rem; min-height: 1.2em;"></p>
      </form>
    </div>
  `;

  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('btn-login-submit');
      const errorElem = document.getElementById('login-error');
      const u = document.getElementById('username').value.trim();
      const p = document.getElementById('password').value;

      if (!u || !p) {
        errorElem.textContent = 'Bitte Benutzername und Passwort eingeben.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Anmeldung läuft...';
      errorElem.textContent = '';

      try {
        await loginUser(u, p);
        window.location.href = './index.html#/dashboard';
        window.location.reload();
      } catch (err) {
        console.error('Login-Fehler:', err);
        let msg = err.message || 'Anmeldung fehlgeschlagen';
        if (msg.includes('Invalid login credentials')) {
          msg = 'Benutzername oder Passwort falsch.';
        }
        errorElem.textContent = escapeHtml(msg);
        btn.disabled = false;
        btn.textContent = 'Anmelden';
      }
    });
  }
}
