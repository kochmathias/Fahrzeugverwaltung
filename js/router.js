import { getCurrentUser } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderVehicle } from './views/vehicle.js';
import { renderVehicleForm } from './views/vehicle-form.js';
import { renderAdmin } from './views/admin.js';
import { renderSettings } from './views/settings.js';
import { renderSetPassword } from './views/setpassword.js';

async function router() {
  const hash = window.location.hash || '#/dashboard';
  const container = document.getElementById('app-content');
  const header = document.getElementById('app-header');
  
  const user = await getCurrentUser();
  
  if (!user && hash !== '#/setpassword') {
    header.style.display = 'none';
    renderLogin(container);
    return;
  }
  
  header.style.display = 'flex';
  
  if (user?.profile?.rolle === 'admin') {
    document.getElementById('nav-admin').style.display = 'block';
  }

  if (hash === '#/dashboard') {
    renderDashboard(container);
  } else if (hash.startsWith('#/vehicle/new')) {
    renderVehicleForm(container);
  } else if (hash.startsWith('#/vehicle/')) {
    const id = hash.split('/')[2];
    renderVehicle(container, id);
  } else if (hash === '#/admin') {
    renderAdmin(container);
  } else if (hash === '#/settings') {
    renderSettings(container);
  } else if (hash === '#/setpassword') {
    renderSetPassword(container);
  } else {
    window.location.hash = '#/dashboard';
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);