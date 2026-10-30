import { getCurrentUser } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderVehicle } from './views/vehicle.js';
import { renderVehicleForm } from './views/vehicle-form.js';
import { renderAdmin } from './views/admin.js';
import { renderSettings } from './views/settings.js';
import { renderSetPassword } from './views/setpassword.js';

async function router() {
  const container = document.getElementById('app-content');
  const header = document.getElementById('app-header');

  try {
    const hash = window.location.hash || '#/dashboard';
    const user = await getCurrentUser();
    
    if (!user && hash !== '#/setpassword') {
      if (header) header.style.display = 'none';
      renderLogin(container);
      return;
    }
    
    if (header) header.style.display = 'block';
    
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.onclick = async (e) => {
        e.preventDefault();
        import('./js/auth.js').then(m => m.logoutUser().catch(() => window.location.reload()));
      };
    }
    
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) {
      navAdmin.style.display = user?.profile?.rolle === 'admin' ? 'inline-block' : 'none';
    }

    document.querySelectorAll('.nav-pill').forEach(pill => {
      const href = pill.getAttribute('href');
      if (href === hash || (hash.startsWith('#/vehicle') && href === '#/dashboard')) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    if (hash === '#/dashboard' || hash === '') {
      await renderDashboard(container);
    } else if (hash === '#/vehicle/new') {
      await renderVehicleForm(container, null);
    } else if (hash.startsWith('#/vehicle/edit/')) {
      const id = hash.replace('#/vehicle/edit/', '');
      await renderVehicleForm(container, id);
    } else if (hash.startsWith('#/vehicle/')) {
      const id = hash.replace('#/vehicle/', '');
      await renderVehicle(container, id);
    } else if (hash === '#/admin') {
      await renderAdmin(container);
    } else if (hash === '#/settings') {
      await renderSettings(container);
    } else if (hash === '#/setpassword') {
      await renderSetPassword(container);
    } else {
      window.location.hash = '#/dashboard';
    }
  } catch (err) {
    console.error('Router-Schwerpunktfehler:', err);
    if (container) {
      container.innerHTML = `
        <div class="card" style="margin: 1rem; border-color: var(--color-danger);">
          <h3 style="color: var(--color-danger); margin-top:0;">Kritischer App-Fehler</h3>
          <p style="font-size: 0.85rem; word-break: break-all;">${err.message || String(err)}</p>
          <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" class="btn" style="margin-top:1rem; width:100%;">App-Cache zurücksetzen & Neustarten</button>
        </div>
      `;
    }
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
