export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

export function pseudoEmail(username) {
  return `${username.toLowerCase().trim()}@kfz-at-user.local`;
}

export function berechneAmpel(ablaufdatumStr, vorlaufTage = 60, aktuellerKm = null, faelligKm = null, pufferKm = 1000) {
  let zeitStatus = 'gray';
  if (ablaufdatumStr) {
    const heute = new Date();
    const ablauf = new Date(ablaufdatumStr);
    const diffTage = Math.ceil((ablauf - heute) / (1000 * 60 * 60 * 24));
    if (diffTage < 0) zeitStatus = 'red';
    else if (diffTage <= vorlaufTage) zeitStatus = 'yellow';
    else zeitStatus = 'green';
  }

  let kmStatus = 'gray';
  if (aktuellerKm !== null && faelligKm !== null) {
    if (aktuellerKm >= faelligKm) kmStatus = 'red';
    else if (faelligKm - aktuellerKm <= pufferKm) kmStatus = 'yellow';
    else kmStatus = 'green';
  }

  const rang = { red: 3, yellow: 2, green: 1, gray: 0 };
  const statuses = [zeitStatus, kmStatus];
  statuses.sort((a, b) => rang[b] - rang[a]);
  return statuses[0];
}