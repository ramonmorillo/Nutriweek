const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const DISHES = [
  // Comidas rápidas
  {title:"Ensalada de garbanzos completa (tomate, pepino, atún)", slot:"lunch", time:15, protein:"legumbres", cats:["Verduras","Conservas","Despensa"]},
  {title:"Arroz integral con pollo y verduras (wok)", slot:"lunch", time:20, protein:"pollo", cats:["Carnicería","Verduras","Despensa"]},
  {title:"Pasta integral con tomate y queso + ensalada", slot:"lunch", time:20, protein:"veg", cats:["Pasta/arroz","Verduras","Lácteos","Despensa"]},
  {title:"Tortilla con espinacas + fruta", slot:"lunch", time:12, protein:"huevos", cats:["Huevos","Verduras","Fruta","Despensa"]},
  {title:"Wrap integral de pavo + hummus + verduras", slot:"lunch", time:15, protein:"pavo", cats:["Panadería","Charcutería","Refrigerados","Verduras"]},

  // Cenas algo más elaboradas
  {title:"Merluza al horno con verduras y limón", slot:"dinner", time:35, protein:"pescado", cats:["Pescadería","Verduras","Despensa"]},
  {title:"Pollo al horno con patata y ensalada", slot:"dinner", time:45, protein:"pollo", cats:["Carnicería","Verduras","Despensa"]},
  {title:"Crema de calabacín + pan integral + queso fresco", slot:"dinner", time:30, protein:"veg", cats:["Verduras","Panadería","Lácteos","Despensa"]},
  {title:"Pisto con huevo (huevo al plato)", slot:"dinner", time:40, protein:"huevos", cats:["Verduras","Huevos","Despensa"]},
  {title:"Revuelto de champiñones y espárragos + ensalada", slot:"dinner", time:25, protein:"huevos", cats:["Verduras","Huevos","Despensa"]}
];

let menu = [];

const menuBody = document.getElementById("menuBody");
const groceryEl = document.getElementById("grocery");

document.getElementById("genBtn").addEventListener("click", generateWeek);
document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("clearBtn").addEventListener("click", clearMenu);

function generateWeek(){
  // por ahora sencillo; luego meteremos lógica de tiempos/repeticiones/fin de semana
  menu = DAYS.map(day => ({
    day,
    lunch: pick("lunch"),
    dinner: pick("dinner")
  }));
  render();
}

function pick(slot){
  const options = DISHES.filter(d => d.slot === slot);
  return options[Math.floor(Math.random() * options.length)];
}

function render(){
  menuBody.innerHTML = "";
  menu.forEach(d => {
    menuBody.innerHTML += `
      <tr>
        <td><strong>${d.day}</strong></td>
        <td>
          <div class="meal">${d.lunch.title}</div>
          <div class="meta">${d.lunch.time} min · ${d.lunch.protein}</div>
        </td>
        <td>
          <div class="meal">${d.dinner.title}</div>
          <div class="meta">${d.dinner.time} min · ${d.dinner.protein}</div>
        </td>
      </tr>
    `;
  });
  renderGrocery();
}

function renderGrocery(){
  if (menu.length === 0){
    groceryEl.innerHTML = "";
    return;
  }

  const byCat = {};
  const add = (cat, item) => {
    if (!byCat[cat]) byCat[cat] = new Set();
    byCat[cat].add(item);
  };

  // Categorías base útiles (para no olvidar básicos)
  ["AOVE", "Sal", "Pimienta", "Vinagre"].forEach(x => add("Despensa", x));
  ["Tomate", "Cebolla", "Zanahoria", "Ensalada variada"].forEach(x => add("Verduras", x));
  ["Fruta de temporada"].forEach(x => add("Fruta", x));

  // Agregar categorías derivadas del menú (por ahora categorías, luego ingredientes reales)
  menu.forEach(d => {
    d.lunch.cats.forEach(c => add(c, "—"));
    d.dinner.cats.forEach(c => add(c, "—"));
  });

  // Render (minimal)
  const order = ["Verduras","Fruta","Carnicería","Pescadería","Huevos","Lácteos","Panadería","Conservas","Refrigerados","Pasta/arroz","Despensa"];
  const cats = Object.keys(byCat).sort((a,b) => {
    const ia = order.indexOf(a); const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  groceryEl.innerHTML = cats.map(cat => {
    const items = Array.from(byCat[cat]).filter(x => x !== "—");
    const line = items.length ? items.join(", ") : "<span class='muted'>(pendiente: ingredientes detallados)</span>";
    return `<div style="margin:10px 0 4px; font-weight:650">${cat}</div><div>${line}</div>`;
  }).join("");
}

function clearMenu(){
  menu = [];
  menuBody.innerHTML = "";
  groceryEl.innerHTML = "";
}
