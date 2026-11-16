//dettaglio
let dataset = null;
function preload() {
  loadTable('fiumi_dataset.csv', 'header', tab => { dataset = tab; }, () => {
    document.getElementById('river-content').textContent = 'Impossibile caricare il dataset. Apri il sito tramite un server web locale.';
  });
}
function setup() {
  noCanvas();
  const container = document.getElementById('river-content');
  if (!dataset) return;
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  if (!Number.isInteger(id) || id < 1 || id > dataset.getRowCount()) {
    container.innerHTML = '<p class="detail-error">Fiume non trovato. Torna alla panoramica e seleziona un quadratino.</p>';
    return;
  }
  const row = dataset.getRow(id - 1);
  const get = key => row.getString(key).trim();
  const format = (key, unit) => {
    const value = get(key);
    if (!value || !Number.isFinite(Number(value))) return 'n.d.';
    return Number(value).toLocaleString('it-IT', {maximumFractionDigits:2}) + (unit ? ' ' + unit : '');
  };
  const countries = get('countries');
  document.title = get('name') + ' — I FIUMI NEL MONDO';
  const heading = document.createElement('section');
  heading.className = 'river-heading';
  const title = document.createElement('h2');
  title.textContent = get('name');
  const subtitle = document.createElement('p');
  subtitle.className = 'river-countries';
  const label = document.createElement('strong');
  label.textContent = 'Paesi attraversati: ';
  subtitle.append(label, document.createTextNode(countries));
  heading.append(title, subtitle);
  const rows = [
    ['Foce', get('outflow')],
    ['Continente', get('continent')],
    ['Lunghezza', format('length','km')],
    ['Superficie del bacino', format('area','km²')],
    ['Portata', format('discharge','m³/s')],
    ['Temperatura minima', format('min_temp','°C')],
    ['Temperatura massima', format('max_temp','°C')],
    ['Temperatura media', format('avg_temp','°C')]
  ];
  const dl = document.createElement('dl');
  dl.className = 'river-fields';
  for (const [name, value] of rows) {
    const wrapper = document.createElement('div');
    wrapper.className = 'river-field';
    const dt = document.createElement('dt');
    dt.textContent = name;
    const dd = document.createElement('dd');
    dd.textContent = value || 'n.d.';
    if (String(value).length > 38) dd.className = 'compact';
    wrapper.append(dt, dd);
    dl.append(wrapper);
  }
  container.replaceChildren(heading, dl);
}
