window.addEventListener("error", (e) => {
  alert("Error en NutriWeek: " + (e?.message || "desconocido"));
});

window.addEventListener("unhandledrejection", (e) => {
  alert("Error (promesa) en NutriWeek: " + (e?.reason?.message || e?.reason || "desconocido"));
});
/***********************
 * NutriWeek (offline)
 * - Anti-repetición + variedad por proteína
 * - Lista compra con ingredientes agregados
 * - Coste semanal estimado 100% offline (editable)
 * - PDF serio (imprimir/guardar como PDF)
 ***********************/

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

// Límites de tiempo según preferencias
const SPEED_LIMITS = {
  lunch: { muy_rapido: 20, rapido: 25, normal: 35 },
  dinner: { rapida: 25, normal: 40, elaborada: 55 },
};

// Categorías (Mercadona-friendly)
const CAT_ORDER = [
  "Verduras y hortalizas", "Fruta",
  "Carnicería", "Pescadería",
  "Huevos", "Lácteos",
  "Panadería",
  "Conservas", "Congelados", "Refrigerados",
  "Pasta, arroz y legumbres",
  "Despensa / básicos"
];

// Costes (estimación) 100% offline.
// Edita lo que quieras: precios orientativos €/unidad o €/kg.
// unit: "kg" | "u" (unidad) | "lata" | "pack"
const PRICE = {
  // Proteínas
  "Pollo (kg)": { unit:"kg", eur: 6.90 },
  "Pavo lonchas (pack)": { unit:"pack", eur: 2.20 },
  "Carne picada pavo (kg)": { unit:"kg", eur: 8.50 },
  "Huevos (docena)": { unit:"u", eur: 2.40 }, // aquí lo tratamos como "u"=docena
  "Merluza (kg)": { unit:"kg", eur: 11.90 },
  "Salmón (kg)": { unit:"kg", eur: 14.90 },
  "Atún lata": { unit:"lata", eur: 1.10 },
  "Garbanzos bote": { unit:"lata", eur: 0.95 },
  "Lentejas bote": { unit:"lata", eur: 0.95 },

  // Frescos
  "Tomate (kg)": { unit:"kg", eur: 2.20 },
  "Cebolla (kg)": { unit:"kg", eur: 1.40 },
  "Pimiento (kg)": { unit:"kg", eur: 2.80 },
  "Calabacín (kg)": { unit:"kg", eur: 1.90 },
  "Zanahoria (kg)": { unit:"kg", eur: 1.30 },
  "Lechuga/mezcla ensalada (bolsa)": { unit:"pack", eur: 1.40 },
  "Pepino (u)": { unit:"u", eur: 0.75 },
  "Limón (u)": { unit:"u", eur: 0.60 },
  "Aguacate (u)": { unit:"u", eur: 1.20 },
  "Champiñón (pack)": { unit:"pack", eur: 1.60 },
  "Espárragos verdes (pack)": { unit:"pack", eur: 2.30 },
  "Brócoli (u)": { unit:"u", eur: 1.50 },
  "Patata (kg)": { unit:"kg", eur: 1.40 },
  "Fruta de temporada (kg)": { unit:"kg", eur: 2.00 },

  // Despensa
  "AOVE (l)": { unit:"l", eur: 6.50 },
  "Arroz integral (kg)": { unit:"kg", eur: 2.10 },
  "Pasta integral (kg)": { unit:"kg", eur: 1.80 },
  "Quinoa (kg)": { unit:"kg", eur: 6.50 },
  "Tomate triturado (lata)": { unit:"lata", eur: 0.90 },
  "Tortillas integrales (pack)": { unit:"pack", eur: 1.70 },
  "Pan integral (barra/pack)": { unit:"pack", eur: 1.40 },
  "Queso fresco (pack)": { unit:"pack", eur: 1.70 },
  "Yogur natural (pack)": { unit:"pack", eur: 1.40 },
  "Hummus (pack)": { unit:"pack", eur: 1.80 },
  "Especias / sal / pimienta": { unit:"pack", eur: 0.50 }, // simbólico
};

// Helpers
function euro(n){
  return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR" }).format(n);
}
function isWeekend(day){ return day === "Sábado" || day === "Domingo"; }

function dish({ id, title, slot, dayType, minutes, protein, tags, ingredients }){
  return { id, title, slot, dayType, minutes, protein, tags, ingredients };
}

/**
 * ingredients: array de items
 *  {
 *    cat: "Verduras y hortalizas",
 *    name: "Tomate (kg)", // clave para PRICE si quieres coste
 *    qty: 0.8, unit: "kg"  // cantidad orientativa semanal según el plato para 4
 *  }
 *
 * Nota: cantidades son aproximadas y orientativas.
 */

// BANCO AMPLIADO (mediterráneo, saludable, razonable)
// Comidas: rápidas; Cenas: algo más; Finde: más tiempo
const DISHES = [
  // ===== COMIDAS (any) =====
  dish({
    id:"L1", title:"Ensalada de garbanzos (tomate, pepino, atún, AOVE, limón)",
    slot:"lunch", dayType:"any", minutes:15, protein:"legumbres",
    tags:["rápido","fibra"],
    ingredients:[
      {cat:"Conservas", name:"Garbanzos bote", qty:1, unit:"lata"},
      {cat:"Conservas", name:"Atún lata", qty:2, unit:"lata"},
      {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.6, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pepino (u)", qty:1, unit:"u"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.05, unit:"l"},
      {cat:"Verduras y hortalizas", name:"Limón (u)", qty:1, unit:"u"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L2", title:"Bowl de arroz integral + pollo + verduras (wok)",
    slot:"lunch", dayType:"any", minutes:20, protein:"pollo",
    tags:["wok","equilibrado"],
    ingredients:[
      {cat:"Carnicería", name:"Pollo (kg)", qty:0.6, unit:"kg"},
      {cat:"Pasta, arroz y legumbres", name:"Arroz integral (kg)", qty:0.35, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.4, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Calabacín (kg)", qty:0.4, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.04, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L3", title:"Pasta integral con tomate y queso + ensalada",
    slot:"lunch", dayType:"any", minutes:20, protein:"veg",
    tags:["clásico","kids-friendly"],
    ingredients:[
      {cat:"Pasta, arroz y legumbres", name:"Pasta integral (kg)", qty:0.35, unit:"kg"},
      {cat:"Conservas", name:"Tomate triturado (lata)", qty:2, unit:"lata"},
      {cat:"Lácteos", name:"Queso fresco (pack)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Lechuga/mezcla ensalada (bolsa)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.4, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L4", title:"Wrap integral de pavo + hummus + verduras crujientes",
    slot:"lunch", dayType:"any", minutes:15, protein:"pavo",
    tags:["sin cocinar","rápido"],
    ingredients:[
      {cat:"Panadería", name:"Tortillas integrales (pack)", qty:1, unit:"pack"},
      {cat:"Refrigerados", name:"Hummus (pack)", qty:1, unit:"pack"},
      {cat:"Refrigerados", name:"Pavo lonchas (pack)", qty:2, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Zanahoria (kg)", qty:0.3, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pepino (u)", qty:1, unit:"u"},
      {cat:"Verduras y hortalizas", name:"Lechuga/mezcla ensalada (bolsa)", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L5", title:"Lentejas (bote) salteadas con verdura y pimentón",
    slot:"lunch", dayType:"any", minutes:20, protein:"legumbres",
    tags:["batch-friendly","fibra"],
    ingredients:[
      {cat:"Conservas", name:"Lentejas bote", qty:2, unit:"lata"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.35, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Zanahoria (kg)", qty:0.25, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L6", title:"Salmón a la plancha + ensalada + patata cocida/micro",
    slot:"lunch", dayType:"any", minutes:20, protein:"pescado",
    tags:["omega-3","sencillo"],
    ingredients:[
      {cat:"Pescadería", name:"Salmón (kg)", qty:0.7, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Lechuga/mezcla ensalada (bolsa)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.4, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Patata (kg)", qty:0.8, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Verduras y hortalizas", name:"Limón (u)", qty:1, unit:"u"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L7", title:"Tortilla con espinacas + pan integral + fruta",
    slot:"lunch", dayType:"any", minutes:15, protein:"huevos",
    tags:["rápido","proteína"],
    ingredients:[
      {cat:"Huevos", name:"Huevos (docena)", qty:1, unit:"u"},
      {cat:"Panadería", name:"Pan integral (barra/pack)", qty:1, unit:"pack"},
      {cat:"Fruta", name:"Fruta de temporada (kg)", qty:1.2, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.02, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"L8", title:"Gazpacho + tortilla francesa / pavo + fruta",
    slot:"lunch", dayType:"any", minutes:10, protein:"mixto",
    tags:["ultrarrápido","verano"],
    ingredients:[
      {cat:"Refrigerados", name:"Yogur natural (pack)", qty:0, unit:"pack"}, // no usado, pero dejamos placeholder 0
      {cat:"Refrigerados", name:"Pavo lonchas (pack)", qty:1, unit:"pack"},
      {cat:"Huevos", name:"Huevos (docena)", qty:0.5, unit:"u"},
      {cat:"Fruta", name:"Fruta de temporada (kg)", qty:1.0, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.8, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pepino (u)", qty:1, unit:"u"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.2, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ].filter(x => x.qty > 0)
  }),

  // ===== CENAS (weekday) =====
  dish({
    id:"D1", title:"Merluza al horno con verduras y limón",
    slot:"dinner", dayType:"weekday", minutes:35, protein:"pescado",
    tags:["horno","ligero"],
    ingredients:[
      {cat:"Pescadería", name:"Merluza (kg)", qty:0.9, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.35, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Calabacín (kg)", qty:0.4, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Limón (u)", qty:1, unit:"u"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"D2", title:"Pollo al horno con patata y ensalada",
    slot:"dinner", dayType:"weekday", minutes:45, protein:"pollo",
    tags:["horno","para 4"],
    ingredients:[
      {cat:"Carnicería", name:"Pollo (kg)", qty:1.2, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Patata (kg)", qty:1.2, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Lechuga/mezcla ensalada (bolsa)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.4, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.04, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"D3", title:"Crema de calabacín + pan integral + queso fresco",
    slot:"dinner", dayType:"weekday", minutes:30, protein:"veg",
    tags:["cuchara","suave"],
    ingredients:[
      {cat:"Verduras y hortalizas", name:"Calabacín (kg)", qty:1.0, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Panadería", name:"Pan integral (barra/pack)", qty:1, unit:"pack"},
      {cat:"Lácteos", name:"Queso fresco (pack)", qty:1, unit:"pack"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"D4", title:"Pisto con huevo (huevo al plato)",
    slot:"dinner", dayType:"weekday", minutes:40, protein:"huevos",
    tags:["mediterráneo","clásico"],
    ingredients:[
      {cat:"Conservas", name:"Tomate triturado (lata)", qty:2, unit:"lata"},
      {cat:"Verduras y hortalizas", name:"Calabacín (kg)", qty:0.6, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.4, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Huevos", name:"Huevos (docena)", qty:0.7, unit:"u"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"D5", title:"Revuelto de champiñones y espárragos + ensalada",
    slot:"dinner", dayType:"weekday", minutes:25, protein:"huevos",
    tags:["rápido","verdura"],
    ingredients:[
      {cat:"Huevos", name:"Huevos (docena)", qty:0.6, unit:"u"},
      {cat:"Verduras y hortalizas", name:"Champiñón (pack)", qty:2, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Espárragos verdes (pack)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Lechuga/mezcla ensalada (bolsa)", qty:1, unit:"pack"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.02, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"D6", title:"Fajitas saludables de pollo con pimientos (poco aceite)",
    slot:"dinner", dayType:"weekday", minutes:35, protein:"pollo",
    tags:["divertido","ocasional"],
    ingredients:[
      {cat:"Carnicería", name:"Pollo (kg)", qty:0.8, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.5, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Panadería", name:"Tortillas integrales (pack)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Aguacate (u)", qty:2, unit:"u"},
      {cat:"Verduras y hortalizas", name:"Limón (u)", qty:1, unit:"u"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.02, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),

  // ===== FINES DE SEMANA (weekend) =====
  dish({
    id:"W1", title:"Arroz integral “a la mediterránea” (verduras + atún)",
    slot:"lunch", dayType:"weekend", minutes:45, protein:"mixto",
    tags:["finde","para 4"],
    ingredients:[
      {cat:"Pasta, arroz y legumbres", name:"Arroz integral (kg)", qty:0.45, unit:"kg"},
      {cat:"Conservas", name:"Atún lata", qty:3, unit:"lata"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.5, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Conservas", name:"Tomate triturado (lata)", qty:2, unit:"lata"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.04, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"W2", title:"Salmón al horno con brócoli y patata + yogur con fruta",
    slot:"dinner", dayType:"weekend", minutes:50, protein:"pescado",
    tags:["finde","omega-3"],
    ingredients:[
      {cat:"Pescadería", name:"Salmón (kg)", qty:1.0, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Brócoli (u)", qty:2, unit:"u"},
      {cat:"Verduras y hortalizas", name:"Patata (kg)", qty:1.0, unit:"kg"},
      {cat:"Lácteos", name:"Yogur natural (pack)", qty:1, unit:"pack"},
      {cat:"Fruta", name:"Fruta de temporada (kg)", qty:1.0, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"W3", title:"Ensalada templada de quinoa con verduras y pavo",
    slot:"lunch", dayType:"weekend", minutes:45, protein:"pavo",
    tags:["finde","completo"],
    ingredients:[
      {cat:"Pasta, arroz y legumbres", name:"Quinoa (kg)", qty:0.35, unit:"kg"},
      {cat:"Carnicería", name:"Carne picada pavo (kg)", qty:0.6, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Calabacín (kg)", qty:0.5, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Pimiento (kg)", qty:0.4, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.25, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.03, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
  dish({
    id:"W4", title:"Tortilla de patatas “ligera” + ensalada completa",
    slot:"dinner", dayType:"weekend", minutes:55, protein:"huevos",
    tags:["finde","clásico"],
    ingredients:[
      {cat:"Huevos", name:"Huevos (docena)", qty:1.0, unit:"u"},
      {cat:"Verduras y hortalizas", name:"Patata (kg)", qty:1.5, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Cebolla (kg)", qty:0.3, unit:"kg"},
      {cat:"Verduras y hortalizas", name:"Lechuga/mezcla ensalada (bolsa)", qty:1, unit:"pack"},
      {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.4, unit:"kg"},
      {cat:"Despensa / básicos", name:"AOVE (l)", qty:0.05, unit:"l"},
      {cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"},
    ]
  }),
];

// ===== Estado del menú =====
let menu = DAYS.map(d => ({ day: d, lunch: null, dinner: null }));

// ===== UI =====
const menuBody = document.getElementById("menuBody");
const groceryEl = document.getElementById("grocery");
const costTotalEl = document.getElementById("costTotal");

document.getElementById("genBtn").addEventListener("click", generateWeek);
document.getElementById("clearBtn").addEventListener("click", clearAll);
document.getElementById("printBtn").addEventListener("click", () => {
  buildPrintGrocery();
  window.print();
});
document.getElementById("printMenuBtn").addEventListener("click", () => {
  buildPrintMenu();
  window.print();
});

// ===== Generación con anti-repetición =====
function generateWeek(){
  const lunchSpeed = document.getElementById("lunchSpeed").value;
  const dinnerComplexity = document.getElementById("dinnerComplexity").value;
  const repeats = document.getElementById("repeats").value;

  const usedDishIds = new Map(); // id -> count
  const proteinHistoryLunch = [];
  const proteinHistoryDinner = [];

  menu = DAYS.map((day) => {
    const dayType = isWeekend(day) ? "weekend" : "weekday";

    const lunch = pickDish({
      slot:"lunch",
      dayType,
      limit: SPEED_LIMITS.lunch[lunchSpeed],
      repeats,
      usedDishIds,
      proteinHistory: proteinHistoryLunch
    });

    const dinner = pickDish({
      slot:"dinner",
      dayType,
      limit: SPEED_LIMITS.dinner[dinnerComplexity],
      repeats,
      usedDishIds,
      proteinHistory: proteinHistoryDinner
    });

    proteinHistoryLunch.push(lunch.protein);
    proteinHistoryDinner.push(dinner.protein);

    return { day, lunch, dinner };
  });

  renderAll();
}

function pickDish({ slot, dayType, limit, repeats, usedDishIds, proteinHistory }){
  // 1) filtra por slot, dayType y tiempo
  let candidates = DISHES.filter(d =>
    d.slot === slot &&
    (d.dayType === "any" || d.dayType === dayType) &&
    d.minutes <= limit
  );

  // 2) regla de repeticiones
  const maxRepeat = (repeats === "bajas") ? 1 : 0; // 0 repeticiones -> maxRepeat 0 (no repetir)
  candidates = candidates.filter(d => (usedDishIds.get(d.id) || 0) <= maxRepeat);

  // 3) scoring: variedad por proteína (penaliza repeticiones seguidas)
  const last = proteinHistory[proteinHistory.length - 1];
  const last2 = proteinHistory[proteinHistory.length - 2];

  const scored = candidates.map(d => {
    let score = 0;

    // evita misma proteína seguida
    if (d.protein === last) score -= 3;
    if (d.protein === last2) score -= 1.5;

    // favorece proteínas no vistas recientemente
    const recent = proteinHistory.slice(-4);
    if (!recent.includes(d.protein)) score += 1.2;

    // micro-bonus a legumbres/veg en comidas
    if (slot === "lunch" && (d.protein === "legumbres" || d.protein === "veg")) score += 0.6;

    // micro-bonus a pescado 2-3 veces/semana
    if (d.protein === "pescado") score += 0.3;

    return { d, score };
  }).sort((a,b) => b.score - a.score);

  // 4) elige aleatoriamente entre el top (para que no sea siempre el 1º)
  const top = scored.slice(0, Math.min(8, scored.length)).map(x => x.d);
  let chosen = top[Math.floor(Math.random() * top.length)];

  // 5) fallback si por repeticiones se quedó corto
  if (!chosen){
    const fallback = DISHES.filter(d =>
      d.slot === slot &&
      (d.dayType === "any" || d.dayType === dayType) &&
      d.minutes <= limit
    );
    chosen = fallback[Math.floor(Math.random()*fallback.length)];
  }

  usedDishIds.set(chosen.id, (usedDishIds.get(chosen.id) || 0) + 1);
  return chosen;
}

// Regenerar una celda sin romper el resto
window.regen = function(dayIndex, slot){
  const lunchSpeed = document.getElementById("lunchSpeed").value;
  const dinnerComplexity = document.getElementById("dinnerComplexity").value;
  const repeats = document.getElementById("repeats").value;

  const day = menu[dayIndex].day;
  const dayType = isWeekend(day) ? "weekend" : "weekday";
  const limit = slot === "lunch"
    ? SPEED_LIMITS.lunch[lunchSpeed]
    : SPEED_LIMITS.dinner[dinnerComplexity];

  // reconstruir usado para anti-repetición, quitando el actual
  const usedDishIds = new Map();
  menu.forEach((r, idx) => {
    ["lunch","dinner"].forEach(s => {
      const d = r[s];
      if (!d) return;
      if (idx === dayIndex && s === slot) return; // excluye el actual a reemplazar
      usedDishIds.set(d.id, (usedDishIds.get(d.id) || 0) + 1);
    });
  });

  // historial de proteína hasta el día anterior
  const proteinHistory = menu
    .slice(0, dayIndex)
    .map(r => (slot === "lunch" ? r.lunch?.protein : r.dinner?.protein))
    .filter(Boolean);

  menu[dayIndex][slot] = pickDish({
    slot,
    dayType,
    limit,
    repeats,
    usedDishIds,
    proteinHistory
  });

  renderAll();
};

window.showIngr = function(dayIndex, slot){
  const d = menu[dayIndex][slot];
  if (!d) return;
  const lines = d.ingredients.map(it => `• ${it.cat}: ${it.name} (${prettyQty(it.qty, it.unit)})`);
  alert(`${d.title}\n\nIngredientes orientativos (para 4):\n${lines.join("\n")}`);
};

// ===== Render =====
function renderAll(){
  renderMenu();
  const byCat = getGroceryByCategory();
  renderGrocery(byCat);
  renderCost(byCat);
}

function renderMenu(){
  menuBody.innerHTML = "";
  menu.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${row.day}</strong></td>
      ${renderCell(idx, "lunch", row.lunch)}
      ${renderCell(idx, "dinner", row.dinner)}
    `;
    menuBody.appendChild(tr);
  });
}

function renderCell(idx, slot, d){
  const label = slot === "lunch" ? "Comida" : "Cena";
  if (!d){
    return `<td><span class="muted">—</span></td>`;
  }
  const pills = [
    `<span class="pill">${label}</span>`,
    `<span class="pill">${d.minutes} min</span>`,
    `<span class="pill">${d.protein}</span>`,
    ...d.tags.map(t => `<span class="pill">${t}</span>`)
  ].join(" ");

  return `
    <td>
      <div class="meal">${escapeHtml(d.title)}</div>
      <div class="meta">${pills}</div>
      <div class="cell-actions">
        <button class="btn small" onclick="regen(${idx}, '${slot}')">Regenerar</button>
        <button class="btn small" onclick="showIngr(${idx}, '${slot}')">Ingredientes</button>
      </div>
    </td>
  `;
}

function renderGrocery(byCat){
  const cats = sortCats(Object.keys(byCat));
  groceryEl.innerHTML = cats.map(cat => {
    const items = byCat[cat]
      .sort((a,b) => a.name.localeCompare(b.name, "es"))
      .map(it => `<div class="gitem">${escapeHtml(it.name)} <span class="muted">· ${prettyQty(it.qty, it.unit)}</span></div>`)
      .join("");
    return `<div class="gcat">${escapeHtml(cat)}</div>${items}`;
  }).join("");
}

function renderCost(byCat){
  const total = estimateCost(byCat);
  costTotalEl.textContent = total ? euro(total) : "—";
}

// ===== Lista compra (agregación) =====
function getGroceryByCategory(){
  const byCat = {};
  const add = (it) => {
    if (!byCat[it.cat]) byCat[it.cat] = [];
    const existing = byCat[it.cat].find(x => x.name === it.name && x.unit === it.unit);
    if (existing) existing.qty += it.qty;
    else byCat[it.cat].push({ ...it });
  };

  // Añadir ingredientes de todo el menú
  menu.forEach(r => {
    ["lunch","dinner"].forEach(slot => {
      const d = r[slot];
      if (!d) return;
      d.ingredients.forEach(add);
    });
  });

  // “Básicos” que casi siempre se usan (puedes quitarlos si no quieres)
  add({cat:"Despensa / básicos", name:"AOVE (l)", qty:0.10, unit:"l"});
  add({cat:"Despensa / básicos", name:"Especias / sal / pimienta", qty:1, unit:"pack"});

  // Fruta/ensalada genérica por semana (si el menú no la cubre suficiente)
  add({cat:"Fruta", name:"Fruta de temporada (kg)", qty:1.5, unit:"kg"});

  return byCat;
}

// ===== Coste estimado offline =====
function estimateCost(byCat){
  let total = 0;

  for (const cat of Object.keys(byCat)){
    for (const it of byCat[cat]){
      const price = PRICE[it.name];
      if (!price) continue; // si no está, no se calcula (evita inventar)
      // compatibilidad simple por unidad
      total += it.qty * price.eur;
    }
  }
  // redondeo 2 decimales
  return Math.round(total * 100) / 100;
}

// ===== PDF / impresión =====
function buildPrintGrocery(){
  const printArea = document.getElementById("printArea");
  const stamp = new Date().toLocaleString("es-ES");

  const byCat = getGroceryByCategory();
  const cats = sortCats(Object.keys(byCat));

  let html = `
    <h1 class="p-title">NutriWeek — Lista de la compra</h1>
    <p class="p-sub">Generado: ${stamp} · Familia (4) · Mediterránea saludable · Coste estimado: ${costTotalEl.textContent}</p>
  `;

  cats.forEach(cat => {
    html += `<div class="p-section">${escapeHtml(cat)}</div><ul class="p-list">`;
    byCat[cat]
      .sort((a,b) => a.name.localeCompare(b.name, "es"))
      .forEach(it => {
        html += `<li class="p-item"><span class="box"></span>${escapeHtml(it.name)} <span style="color:#555">(${prettyQty(it.qty, it.unit)})</span></li>`;
      });
    html += `</ul>`;
  });

  html += `<div class="p-footer">NutriWeek · Creado por Ramón Morillo · Febrero-2026</div>`;
  printArea.innerHTML = html;
}

function buildPrintMenu(){
  const printArea = document.getElementById("printArea");
  const stamp = new Date().toLocaleString("es-ES");

  let html = `
    <h1 class="p-title">NutriWeek — Menú semanal</h1>
    <p class="p-sub">Generado: ${stamp} · Familia (4) · Mediterránea saludable</p>
    <table class="p-table" aria-label="Menú semanal para imprimir">
      <thead>
        <tr>
          <th style="width:90px">Día</th>
          <th>Comida</th>
          <th>Cena</th>
        </tr>
      </thead>
      <tbody>
  `;

  menu.forEach(r => {
    html += `
      <tr>
        <td><strong>${escapeHtml(r.day)}</strong></td>
        <td>${escapeHtml(r.lunch?.title || "—")}<div style="color:#555; font-size:11px; margin-top:4px;">${r.lunch ? `${r.lunch.minutes} min · ${r.lunch.protein}` : ""}</div></td>
        <td>${escapeHtml(r.dinner?.title || "—")}<div style="color:#555; font-size:11px; margin-top:4px;">${r.dinner ? `${r.dinner.minutes} min · ${r.dinner.protein}` : ""}</div></td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <div class="p-footer">NutriWeek · Creado por Ramón Morillo · Febrero-2026</div>
  `;

  printArea.innerHTML = html;
}

// ===== Utils =====
function prettyQty(qty, unit){
  if (qty === 0) return "";
  const r = Math.round(qty * 100) / 100;
  if (unit === "kg") return `${r} kg`;
  if (unit === "l") return `${r} l`;
  if (unit === "u") return `${r} u`;
  if (unit === "lata") return `${r} lata(s)`;
  if (unit === "pack") return `${r} pack(s)`;
  return `${r} ${unit}`;
}

function sortCats(cats){
  return cats.sort((a,b) => {
    const ia = CAT_ORDER.indexOf(a);
    const ib = CAT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function clearAll(){
  menu = DAYS.map(d => ({ day: d, lunch: null, dinner: null }));
  menuBody.innerHTML = "";
  groceryEl.innerHTML = "";
  costTotalEl.textContent = "—";
  document.getElementById("printArea").innerHTML = "";
}

// Render inicial vacío
clearAll();
