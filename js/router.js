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
  
  try {
    const user = await checkAuth();

    // Wenn nicht angemeldet -> Login anzeigen
    if (!user && hash !== '#/login') {
      window.location.hash = '#/login';
      await renderLogin(container);
      return;
    }

    // Routing-Weiche
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
  } catch (err) {
    console.error('Routing-Fehler:', err);
    container.innerHTML = `
      <div class="card" style="border-color: var(--color-danger); margin: 1rem;">
        <p style="color: var(--color-danger); font-weight: 600; margin: 0 0 0.5rem 0;">Ein Fehler ist aufgetreten:</p>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin: 0;">${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
