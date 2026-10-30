import { loginUser } from '../auth.js';
import { escapeHtml } from '../utils.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 4rem auto;" class="card">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img src="icons/icon-192.png" alt="Logo" style="width: 64px; height: 64px; border-radius: 16px;" onerror="this.style.display='none'">
        <h2 style="margin-top: 0.5rem;">Fahrzeugverwaltung</h2>
      </div>
      <form id="login-form">
        <label>Benutzername oder E-Mail</label>
        <input type="text" id="username" class="input" required>
        <label>Passwort</label>
        <input type="password" id="password" class="input" required>
        <button type="submit" class="btn" style="width: 100%;">Anmelden</button>
        <p id="login-error" style="color: var(--color-danger); margin-top: 1rem; text-align: center;"></p>
      </form>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    try {
      await loginUser(u, p);
      window.location.hash = '#/dashboard';
    } catch (err) {
      document.getElementById('login-error').textContent = escapeHtml(err.message);
    }
  });
}