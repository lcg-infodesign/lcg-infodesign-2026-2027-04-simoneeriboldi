
const continenti = [
  ['AFRICA', 'Africa'], ['ASIA', 'Asia'], ['EUROPA', 'Europe'],
  ['NORD AMERICA', 'North America'], ['OCEANIA', 'Oceania'],
  ['SUD AMERICA', 'South America']
];


const sfondo = '#caf0f8', blu = '#03045e';
const colori = ['#1644b8', '#416dd7', '#8d68bd', '#d64c74', '#db3030'];
let tabellaFiumi, erroreCsv = null;
let fiumi = [], quadrati = [], hover = null, selezionato = null;
let zoomNomi = [1, 1, 1, 1, 1, 1], zoomQuadrati = {};
let tempMin = 0, tempMax = 30, lunghezzaMax = 1;

function preload() {
  loadTable('fiumi_dataset.csv', 'header', tabella => {
    tabellaFiumi = tabella;
  }, () => {
    erroreCsv = true;
    console.error('Impossibile caricare il dstaset fiumi_dataset.csv.');
  });
}

function setup() {
  if (erroreCsv || !tabellaFiumi || tabellaFiumi.getRowCount() === 0) {
    document.getElementById('grafico').innerHTML = 'Dataset non disponibile. Avvia il sito tramite un server web locale.';
  } else {
    fiumi = tabellaFiumi.getRows().map((riga, i) => {
      let continente = riga.getString('continent');
      return {
        id: i, name: riga.getString('name'),
        continente: continente === 'Australia' ? 'Oceania' : continente,
        lunghezza: numero(riga.getString('length')),
        portata: numero(riga.getString('discharge')),
        media: numero(riga.getString('avg_temp')),
        minima: numero(riga.getString('min_temp')),
        massima: numero(riga.getString('max_temp'))
      };
    });
  }
  let temperature = fiumi.map(f => f.media).filter(v => v !== null);
  if (temperature.length) {
    tempMin = Math.floor(Math.min(...temperature));
    tempMax = Math.ceil(Math.max(...temperature));
    if (tempMax === tempMin) tempMax++;
    lunghezzaMax = Math.max(1, ...fiumi.map(f => f.lunghezza || 0));
  }
  document.getElementById('tmin').textContent = tempMin + ' °C';
  document.getElementById('tmax').textContent = tempMax + ' °C';
  let canvas = createCanvas(100, 100);
  canvas.parent('grafico');
  textFont('Montserrat');
  windowResized();
}

function numero(v) {
  return v === null || v === undefined || String(v).trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v);
}
function formato(v) {
  return v === null ? 'n.d.' : v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
function casuale(n) {
  let x = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function colore(t) {
  if (t === null) return color('#7a7a9c');
  let n = constrain(map(t, tempMin, tempMax, 0, 4), 0, 4);
  let i = Math.min(3, Math.floor(n));
  return lerpColor(color(colori[i]), color(colori[i + 1]), n - i);
}
function scalaPortata(v, minimo, massimo) {
  return map(Math.log10(Math.max(v || minimo, minimo)), Math.log10(minimo), Math.log10(massimo), 0, 1);
}

function draw() {
  background(sfondo);
  quadrati = [];
  if (!fiumi.length) return;
  let colonne = width >= 710 ? 2 : 1;
  let larghezza = width / colonne;
  let altezza = colonne === 2 ? 350 : 325;
  let gruppi = continenti.map(c => fiumi.filter(f => f.continente === c[1]));

  for (let i = 0; i < continenti.length; i++) {
    let x = (i % colonne) * larghezza;
    let y = Math.floor(i / colonne) * altezza;
    disegnaContinente(continenti[i][0], gruppi[i], i, x, y, larghezza, altezza);
  }

  hover = trovaQuadrato(mouseX, mouseY);

  for (let q of quadrati) {
    let obiettivo = q === hover ? 1.32 : 1;
    zoomQuadrati[q.f.id] = lerp(zoomQuadrati[q.f.id] || 1, obiettivo, .16);
    let dim = q.dim * zoomQuadrati[q.f.id];
    push();
    translate(q.x, q.y);
    rotate(q.angolo);
    noStroke(); fill(colore(q.f.media)); rectMode(CENTER);
    rect(0, 0, dim, dim, Math.min(7, dim * .24));
    if (selezionato === q.f) {
      noFill(); stroke(blu); strokeWeight(1.5);
      rect(0, 0, dim + 7, dim + 7, 8);
    }
    pop();
  }
  cursor(hover ? HAND : ARROW);
  if (hover) drawTooltip(hover);
}

function disegnaContinente(nome, gruppo, indice, x, y, w, h) {
  let sinistra = x + 29, destra = x + w - 25;
  let alto = y + 26, basso = y + h - 66;
  let centro = (alto + basso) / 2;
  let dueRighe = nome.includes('AMERICA');
  let fontBase = dueRighe ? Math.min(76, (destra - sinistra) * .90 / (7 * .62))
    : Math.max(24, Math.min(69, (destra - sinistra) * 1.58 / nome.length));
  let vicino = mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
  zoomNomi[indice] = lerp(zoomNomi[indice], vicino ? 1.145 : 1, .105);
  let font = fontBase * zoomNomi[indice];

  // IL NOME DEL CONTINENNTE SULLO SOFNDO POCO PIU OPACO
  noStroke(); fill(3, 4, 94, 51); textStyle(BOLD);
  textAlign(CENTER, CENTER); textSize(font); textLeading(font * .82);
  text(dueRighe ? nome.replace(' ', '\n') : nome, (sinistra + destra) / 2, centro + 10);

  let portate = gruppo.map(f => f.portata).filter(v => v > 0);
  if (!portate.length) return;
  let min = Math.min(...portate), max = Math.max(...portate);
  if (min === max) { min /= 1.5; max *= 1.5; }

  // PICCOLO margine
  let margine = (Math.log10(max) - Math.log10(min)) * .10;
  min /= Math.pow(10, margine); max *= Math.pow(10, margine);
  let posizioni = [];
  let ordinati = [...gruppo].sort((a, b) => (b.lunghezza || 0) - (a.lunghezza || 0));

  for (let f of ordinati) {
    let dim = map(sqrt(f.lunghezza || 0), 0, sqrt(lunghezzaMax), 7, 29);
    let px = lerp(sinistra + dim / 2, destra - dim / 2, scalaPortata(f.portata, min, max));
    let py = centro, punteggio = Infinity;

    for (let tentativo = 0; tentativo < 145; tentativo++) {
      let distanza = (tentativo / 144) * ((basso - alto) * .46 - dim / 2);
      let prova = constrain(centro + (tentativo % 2 ? -1 : 1) * distanza
        + (casuale(f.id * 19 + tentativo) * 2 - 1) * 8, alto + dim / 2, basso - dim / 2);
      let collisioni = 0;
      for (let p of posizioni) {
        let spazio = (dim + p.dim) / 2 + 3;
        if (abs(px - p.x) < spazio && abs(prova - p.y) < spazio)
          collisioni += (spazio - abs(px - p.x)) * (spazio - abs(prova - p.y)) * 100;
      }
      let valore = collisioni + abs(prova - centro) * .19 + casuale(f.id * 43 + tentativo) * 4;
      if (valore < punteggio) { punteggio = valore; py = prova; }
      if (collisioni === 0 && tentativo > 8) break;
    }
    posizioni.push({ x: px, y: py, dim: dim * 1.28 });
    quadrati.push({ f, x: px, y: py, dim, angolo: (casuale(f.id * 37 + 11) - .5) * .85 });
  }

  // asse orizzontale per continente
  let asseY = y + h - 39;
  stroke(3, 4, 94, 85); strokeWeight(.8); line(sinistra, asseY, destra, asseY);
  noStroke(); fill(blu); textStyle(NORMAL); textSize(10); textAlign(LEFT, TOP);
  text('PORTATA (m³/s)', sinistra, asseY + 17);
  let tacche = [];
  for (let e = Math.floor(Math.log10(min)) - 1; e <= Math.ceil(Math.log10(max)) + 1; e++) {
    for (let m of [1, 2, 5]) {
      let n = m * Math.pow(10, e);
      if (n >= min && n <= max) tacche.push(n);
    }
  }
  if (tacche.length > 4) {
    let n = tacche.length - 1;
    tacche = [...new Set([tacche[0], tacche[Math.round(n / 3)], tacche[Math.round(n * 2 / 3)], tacche[n]])];
  }
  for (let n of tacche) {
    let tx = lerp(sinistra, destra, scalaPortata(n, min, max));
    stroke(3, 4, 94, 75); line(tx, asseY - 3, tx, asseY + 3);
    noStroke(); fill(blu); textSize(9); textAlign(CENTER, BOTTOM);
    text(n.toLocaleString('it-IT', { maximumFractionDigits: n < 1 ? 2 : n < 10 ? 1 : 0 }), tx, asseY - 7);
  }
}

function drawTooltip(q) {
  let f = q.f, w = Math.min(280, width - 12), h = 94;
  let x = constrain(q.x + 15, 5, width - w - 5);
  let y = constrain(q.y - 100, 5, height - h - 5);
  noStroke(); fill(blu); rectMode(CORNER); rect(x, y, w, h, 8);
  fill(255); textAlign(LEFT, TOP); textStyle(BOLD); textSize(11);
  text(f.name.length > 37 ? f.name.slice(0, 35) + '…' : f.name, x + 11, y + 10);
  textStyle(NORMAL); textSize(10);
  text('Temperatura media: ' + formato(f.media) + ' °C', x + 11, y + 34);
  text('Lunghezza: ' + formato(f.lunghezza) + ' km', x + 11, y + 53);
  text('Portata: ' + formato(f.portata) + ' m³/s', x + 11, y + 72);
}

function trovaQuadrato(x, y) {
  //ultimo quadrato precedenza sovrappoosto
  return [...quadrati].reverse().find(q => {
    let dx = x - q.x, dy = y - q.y;
    return abs(dx * cos(q.angolo) + dy * sin(q.angolo)) < q.dim / 2 + 7 &&
      abs(-dx * sin(q.angolo) + dy * cos(q.angolo)) < q.dim / 2 + 7;
  }) || null;
}
function mousePressed() { seleziona(mouseX, mouseY); }
function touchStarted() {
  if (touches.length) { seleziona(touches[0].x, touches[0].y); return false; }
}
function seleziona(x, y) {
  let q = trovaQuadrato(x, y);
  if (q) window.location.href = 'dettaglio.html?id=' + encodeURIComponent(q.f.id + 1);
}
function windowResized() {
  let w = Math.max(300, document.getElementById('grafico').clientWidth);
  let colonne = w >= 710 ? 2 : 1;
  resizeCanvas(w, Math.ceil(6 / colonne) * (colonne === 2 ? 350 : 325) + 10);
}
