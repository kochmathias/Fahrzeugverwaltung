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
  const user = await checkAuth();

  // Wenn nicht angemeldet -> Login anzeigen
  if (!user && hash !== '#/login') {
    window.location.hash = '#/login';
    renderLogin(container);
    return;
  }

  // Routing-Weiche ohne Einstellungen
  if (hash === '#/login') {
    renderLogin(container);
  } else if (hash === '#/dashboard' || hash === '#/') {
    renderDashboard(container);
  } else if (hash.startsWith('#/vehicle/new')) {
    renderVehicleForm(container);
  } else if (hash.startsWith('#/vehicle/edit/')) {
    const id = hash.replace('#/vehicle/edit/', '');
    renderVehicleForm(container, id);
  } else if (hash.startsWith('#/vehicle/')) {
    const id = hash.replace('#/vehicle/', '');
    renderVehicle(container, id);
  } else if (hash === '#/admin') {
    renderAdmin(container);
  } else {
    renderDashboard(container);
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
