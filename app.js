/***********************
 * NutriWeek (offline)
 * Creado por Ramón Morillo · Febrero-2026
 *
 * ✔ Anti-repetición + variedad por proteína
 * ✔ Lista compra con ingredientes agregados
 * ✔ Coste semanal estimado 100% offline (editable)
 * ✔ PDF serio (imprimir/guardar como PDF)
 * ✔ Robustez: si no hay candidatos, relaja reglas y NO se rompe
 * ✔ Protección DOM: no ejecuta nada hasta que existan los elementos
 ***********************/

(function(){

  // ===== Debug: errores visibles (en móvil ayuda mucho) =====
  window.addEventListener("error", (e) => {
    alert("Error en NutriWeek: " + (e?.message || "desconocido"));
  });
  window.addEventListener("unhandledrejection", (e) => {
    alert("Error (promesa) en NutriWeek: " + (e?.reason?.message || e?.reason || "desconocido"));
  });

  // ===== Utilidad para asegurar IDs =====
  function must(id){
    const el = document.getElementById(id);
    if(!el){
      throw new Error(`Falta el elemento con id="${id}" en index.html`);
    }
    return el;
  }

  // ===== Helpers =====
  function euro(n){
    return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR" }).format(n);
  }
  function isWeekend(day){ return day === "Sábado" || day === "Domingo"; }
  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }
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

  // ===== Datos base =====
  const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  const SPEED_LIMITS = {
    lunch: { muy_rapido: 20, rapido: 25, normal: 35 },
    dinner: { rapida: 25, normal: 40, elaborada: 55 },
  };

  const CAT_ORDER = [
    "Verduras y hortalizas", "Fruta",
    "Carnicería", "Pescadería",
    "Huevos", "Lácteos",
    "Panadería",
    "Conservas", "Congelados", "Refrigerados",
    "Pasta, arroz y legumbres",
    "Despensa / básicos"
  ];

  const PRICE = {
    // Proteínas
    "Pollo (kg)": { unit:"kg", eur: 6.90 },
    "Pavo lonchas (pack)": { unit:"pack", eur: 2.20 },
    "Carne picada pavo (kg)": { unit:"kg", eur: 8.50 },
    "Huevos (docena)": { unit:"u", eur: 2.40 },
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
    "Especias / sal / pimienta": { unit:"pack", eur: 0.50 },
  };

  function dish({ id, title, slot, dayType, minutes, protein, tags, ingredients }){
    return { id, title, slot, dayType, minutes, protein, tags, ingredients };
  }

  // ===== Banco de platos =====
  const DISHES = [
    // COMIDAS (any)
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
      id:"L8", title:"Gazpacho + pavo + fruta (ultrarrápido)",
      slot:"lunch", dayType:"any", minutes:10, protein:"mixto",
      tags:["ultrarrápido","verano"],
      ingredients:[
        {cat:"Refrigerados", name:"Pavo lonchas (pack)", qty:1, unit:"pack"},
        {cat:"Fruta", name:"Fruta de temporada (kg)", qty:1.0, unit:"kg"},
        {cat:"Verduras y hortalizas", name:"Tomate (kg)", qty:0.8, unit:"kg"},
        {cat:"Verduras y hortalizas", name:"Pepino (u)", qty:1, unit:"u"},
        {cat:"Verduras y hortalizas", name:"Cebolla (kg)", q
