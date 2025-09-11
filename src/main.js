// Variables y utilidades
const eps = 1e-8;

// Añadir nueva restricción (fila)
document.getElementById('addRestr').addEventListener('click', () => {
  const div = document.createElement('div');
  div.className = 'rrow flex gap-2 items-center';
  div.innerHTML = `
          <input type="number" step="any" placeholder="a (x1)" class="bg-gray-700 p-2 rounded w-20 a" />
          <input type="number" step="any" placeholder="b (x2)" class="bg-gray-700 p-2 rounded w-20 b" />
          <select class="op bg-gray-700 p-2 rounded">
            <option value="<=">≤</option>
            <option value=">=">≥</option>
            <option value="=">=</option>
          </select>
          <input type="number" step="any" placeholder="c" class="bg-gray-700 p-2 rounded w-20 c" />
          <button type="button" class="remove text-sm px-2 py-1 bg-red-600 rounded">Eliminar</button>
        `;
  document.getElementById('restricciones').appendChild(div);

  // agregar handler para el botón eliminar
  div.querySelector('.remove').addEventListener('click', () => div.remove());
});

// eliminar en la fila inicial si el usuario pulsa Eliminar
document.querySelectorAll('.remove').forEach(b =>
  b.addEventListener('click', e => {
    const row = e.target.closest('.rrow');
    if (row) row.remove();
  })
);

// Función que lee las restricciones del DOM
function readConstraints() {
  const rows = Array.from(document.querySelectorAll('#restricciones .rrow'));
  const constraints = [];
  for (const r of rows) {
    const a = parseFloat(r.querySelector('.a').value);
    const b = parseFloat(r.querySelector('.b').value);
    const op = r.querySelector('.op').value;
    const c = parseFloat(r.querySelector('.c').value);
    if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
      constraints.push({ a, b, op, c });
    }
  }
  return constraints;
}

function feasible(x1, x2, constraints, nonneg) {
  if (nonneg) {
    if (x1 < -eps || x2 < -eps) return false;
  }
  for (const r of constraints) {
    const lhs = r.a * x1 + r.b * x2;
    if (r.op === '<=') {
      if (lhs > r.c + 1e-6) return false;
    } else if (r.op === '>=') {
      if (lhs < r.c - 1e-6) return false;
    } else {
      // '='
      if (Math.abs(lhs - r.c) > 1e-6) return false;
    }
  }
  return true;
}

// eliminar duplicados por coordenadas (redondeando)
function uniquePoints(points) {
  const map = new Map();
  for (const p of points) {
    const k = `${p.x1.toFixed(6)}|${p.x2.toFixed(6)}`;
    if (!map.has(k)) map.set(k, p);
  }
  return Array.from(map.values());
}

// Convex hull (monotone chain)
function convexHull(points) {
  if (points.length <= 1) return points.slice();
  const pts = points
    .map(p => ({ x: p.x1, y: p.x2 }))
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);
  return hull.map(p => ({ x1: p.x, x2: p.y }));
}

// Resolver y graficar
document.getElementById('form').addEventListener('submit', ev => {
  ev.preventDefault();
  const tipo = document.getElementById('tipo').value;
  const nonneg = document.getElementById('nonneg').checked;
  const C1 = parseFloat(document.getElementById('c1').value);
  const C2 = parseFloat(document.getElementById('c2').value);

  if (!Number.isFinite(C1) || !Number.isFinite(C2)) {
    document.getElementById('resultado').innerHTML =
      '<p class="text-yellow-300">Introduce coeficientes válidos para la función objetivo.</p>';
    return;
  }

  const constraints = readConstraints();
  if (constraints.length === 0) {
    document.getElementById('resultado').innerHTML =
      '<p class="text-yellow-300">Añade al menos una restricción válida.</p>';
    return;
  }

  // calcular intersecciones pairwise
  let pts = [];
  // origen si se fuerza no-negatividad
  if (nonneg) pts.push({ x1: 0, x2: 0 });

  // intersecciones entre pares de restricciones
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const r1 = constraints[i];
      const r2 = constraints[j];
      const det = r1.a * r2.b - r2.a * r1.b;
      if (Math.abs(det) > eps) {
        const x1 = (r1.c * r2.b - r2.c * r1.b) / det;
        const x2 = (r1.a * r2.c - r2.a * r1.c) / det;
        if (
          Number.isFinite(x1) &&
          Number.isFinite(x2) &&
          feasible(x1, x2, constraints, nonneg)
        ) {
          pts.push({ x1, x2 });
        }
      }
    }
    // intersecciones con ejes
    const r = constraints[i];
    if (Math.abs(r.b) > eps) {
      const x1 = 0;
      const x2 = r.c / r.b;
      if (Number.isFinite(x2) && feasible(x1, x2, constraints, nonneg))
        pts.push({ x1, x2 });
    }
    if (Math.abs(r.a) > eps) {
      const x2 = 0;
      const x1 = r.c / r.a;
      if (Number.isFinite(x1) && feasible(x1, x2, constraints, nonneg))
        pts.push({ x1, x2 });
    }
  }

  pts = uniquePoints(pts);

  if (pts.length === 0) {
    document.getElementById('resultado').innerHTML =
      '<p class="text-red-400">No hay soluciones factibles con las condiciones dadas.</p>';
    Plotly.purge('grafico');
    return;
  }

  // evaluar Z y seleccionar óptimo
  pts = pts.map(p => ({ ...p, z: C1 * p.x1 + C2 * p.x2 }));
  let opt = pts[0];
  for (const p of pts) {
    if (tipo === 'max') {
      if (p.z > opt.z) opt = p;
    } else {
      if (p.z < opt.z) opt = p;
    }
  }

  // construir polígono de la región factible (convex hull)
  const hull = convexHull(pts);

  // rangos para graficar
  const allX = hull.map(p => p.x1).concat(pts.map(p => p.x1));
  const allY = hull.map(p => p.x2).concat(pts.map(p => p.x2));
  const minX = Math.min(...allX, 0) - 1;
  const maxX = Math.max(...allX, 1) + 1;
  const minY = Math.min(...allY, 0) - 1;
  const maxY = Math.max(...allY, 1) + 1;

  // preparar trazas de restricciones
  const traces = [];
  const sampleCount = 200;
  const xSample = Array.from(
    { length: sampleCount },
    (_, i) => minX + (i / (sampleCount - 1)) * (maxX - minX)
  );

  for (let i = 0; i < constraints.length; i++) {
    const r = constraints[i];
    if (Math.abs(r.b) > eps) {
      const y = xSample.map(x => (r.c - r.a * x) / r.b);
      traces.push({
        x: xSample,
        y,
        mode: 'lines',
        name: `R${i + 1}: ${r.a}x₁+${r.b}x₂ ${r.op} ${r.c}`
      });
    } else if (Math.abs(r.a) > eps) {
      // vertical line x = c/a
      const xConst = r.c / r.a;
      traces.push({
        x: [xConst, xConst],
        y: [minY, maxY],
        mode: 'lines',
        name: `R${i + 1}: x=${xConst.toFixed(3)}`
      });
    }
  }

  // polígono región factible
  if (hull.length >= 1) {
    traces.push({
      x: hull.map(p => p.x1).concat(hull[0].x1),
      y: hull.map(p => p.x2).concat(hull[0].x2),
      fill: 'toself',
      mode: 'lines',
      name: 'Región factible',
      fillcolor: 'rgba(34,197,94,0.15)',
      line: { color: 'rgba(34,197,94,0.9)' }
    });
  }

  // puntos (vértices)
  traces.push({
    x: pts.map(p => p.x1),
    y: pts.map(p => p.x2),
    text: pts.map(
      (p, i) => `V${i + 1}: (${p.x1.toFixed(3)}, ${p.x2.toFixed(3)}) Z=${p.z.toFixed(3)}`
    ),
    mode: 'markers+text',
    textposition: 'top center',
    marker: { size: 8, color: 'rgb(99,102,241)' },
    name: 'Vértices'
  });

  // punto óptimo
  traces.push({
    x: [opt.x1],
    y: [opt.x2],
    text: [`Óptimo: (${opt.x1.toFixed(3)}, ${opt.x2.toFixed(3)}) Z*=${opt.z.toFixed(3)}`],
    mode: 'markers+text',
    textposition: 'bottom right',
    marker: { size: 14, color: 'rgb(239,68,68)', symbol: 'star' },
    name: 'Óptimo'
  });

  const layout = {
    title: 'Gráfico del problema - modo oscuro',
    paper_bgcolor: '#0b1220',
    plot_bgcolor: '#071025',
    font: { color: '#e6eef8' },
    xaxis: { title: 'x₁', range: [minX, maxX] },
    yaxis: { title: 'x₂', range: [minY, maxY] },
    legend: { orientation: 'h' },
    margin: { t: 50 }
  };

  Plotly.newPlot('grafico', traces, layout, { responsive: true });

  // mostrar resultados
  document.getElementById('resultado').innerHTML = `
          <h2 class="text-lg font-semibold mb-2">Resultado</h2>
          <p>${tipo === 'max' ? 'Máximo' : 'Mínimo'} en (x₁, x₂) = (${opt.x1.toFixed(
    3
  )}, ${opt.x2.toFixed(3)}), Z* = ${opt.z.toFixed(3)}</p>
          <h3 class="mt-2 font-semibold">Vértices factibles:</h3>
          <ul class="list-disc list-inside">${pts
            .map(
              (p, i) =>
                `<li>V${i + 1}: (${p.x1.toFixed(3)}, ${p.x2.toFixed(
                  3
                )}) — Z=${p.z.toFixed(3)}</li>`
            )
            .join('')}</ul>
        `;
});
