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
    if (header) header.style.display = 'none';
    renderLogin(container);
    return;
  }
  
  if (header) header.style.display = 'block';
  
  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) {
    navAdmin.style.display = user?.profile?.rolle === 'admin' ? 'inline-block' : 'none';
  }

  // Active-State der Navigations-Pills aktualisieren
  document.querySelectorAll('.nav-pill').forEach(pill => {
    const href = pill.getAttribute('href');
    if (href === hash || (hash.startsWith('#/vehicle') && href === '#/dashboard')) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // Exakte Routen-Auswertung
  if (hash === '#/dashboard' || hash === '') {
    renderDashboard(container);
  } else if (hash === '#/vehicle/new') {
    renderVehicleForm(container, null);
  } else if (hash.startsWith('#/vehicle/edit/')) {
    const id = hash.replace('#/vehicle/edit/', '');
    renderVehicleForm(container, id);
  } else if (hash.startsWith('#/vehicle/')) {
    const id = hash.replace('#/vehicle/', '');
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
