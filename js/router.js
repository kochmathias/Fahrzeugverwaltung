import { renderDashboard } from './views/dashboard.js';
import { renderVehicle } from './views/vehicle.js';
import { renderVehicleForm } from './views/vehicle-form.js';
import { renderAdmin } from './views/admin.js';
import { renderLogin } from './views/login.js';
import { checkAuth } from './auth.js';

export async function handleRoute() {
  const container = document.getElementById('app-content');
  if (!container) return;

  const hash = window.location.hash || '#/dashboard';
  container.innerHTML = `<div style="padding: 3rem; text-align: center; color: #94a3b8; font-size: 0.9rem;">Lade App...</div>`;

  let user = null;
  try {
    // Timeout-Schutz: Falls checkAuth nach 3 Sekunden nicht antwortet, geht es trotzdem weiter
    const authPromise = checkAuth();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth-Timeout')), 3000));
    user = await Promise.race([authPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Auth-Hinweis:', err.message);
  }

  // Wenn kein Benutzer da ist und wir nicht im Login sind -> zum Login umleiten
  if (!user && hash !== '#/login') {
    window.location.hash = '#/login';
    await renderLogin(container);
    return;
  }

  try {
    if (hash === '#/login') {
      await renderLogin(container);
    } else if (hash === '#/dashboard' || hash === '#/') {
      await renderDashboard(container);
    } else if (hash.startsWith('#/vehicle/new')) {
      await renderVehicleForm(container);
    } else if (hash.startsWith('#/vehicle/edit/')) {
      const id = hash.replace('#/vehicle/edit/', '');
      await renderVehicleForm(container, id);
    } else if (hash.startsWith('#/vehicle/')) {
      const id = hash.replace('#/vehicle/', '');
      await renderVehicle(container, id);
    } else if (hash === '#/admin') {
      await renderAdmin(container);
    } else {
      window.location.hash = '#/dashboard';
      await renderDashboard(container);
    }
  } catch (renderErr) {
    console.error('Render-Fehler:', renderErr);
    container.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 1.5rem; border-radius: 12px; margin: 1rem; color: #f8fafc;">
        <h3 style="color: #ef4444; margin-top: 0; font-size: 1.1rem;">Darstellungsfehler</h3>
        <p style="font-size: 0.85rem; margin-bottom: 0; color: #cbd5e1;">${renderErr.message || String(renderErr)}</p>
      </div>
    `;
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
