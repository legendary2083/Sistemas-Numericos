// ====== Helpers ======
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];

function setTheme(fromStorage){
  const root = document.documentElement;
  const saved = fromStorage ?? localStorage.getItem("theme");
  const isLight = saved ? saved === "light" : false;
  root.setAttribute("data-theme", isLight ? "light" : "dark");
  $("#themeToggle") && ($("#themeToggle").checked = isLight);
}
setTheme(true);
$("#themeToggle")?.addEventListener("change", e=>{
  const isLight = e.target.checked;
  document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
  localStorage.setItem("theme", isLight ? "light" : "dark");
});

// ====== Tabs ======
const tabButtons = $$(".tab-btn");
const tabPanels = [$("#tab1"), $("#tab2"), $("#tab3")];
tabButtons.forEach((btn,i)=>{
  btn.addEventListener("click", ()=>{
    tabButtons.forEach(b=>{b.classList.remove("active"); b.setAttribute("aria-selected","false");});
    tabPanels.forEach(p=>p.hidden = true);
    btn.classList.add("active"); btn.setAttribute("aria-selected","true");
    tabPanels[i].hidden = false;
  });
});

// ====== Núcleo numérico ======
const baseValida = b => [2,8,10,16].includes(b);

function limpiarPrefijo(s){
  s = s.trim().toLowerCase();
  if (s.startsWith("-0b")||s.startsWith("+0b")||
      s.startsWith("-0o")||s.startsWith("+0o")||
      s.startsWith("-0x")||s.startsWith("+0x")){
    return s[0] + s.slice(3);
  }
  if (s.startsWith("0b")||s.startsWith("0o")||s.startsWith("0x")){
    return s.slice(2);
  }
  return s;
}

const regexByBase = {
  2: /^[+-]?[01]+$/i,
  8: /^[+-]?[0-7]+$/i,
  10:/^[+-]?\d+$/,
  16:/^[+-]?[0-9a-f]+$/i
};

function validarCadenaBase(raw, base){
  const s = raw.trim(); const low = s.toLowerCase();
  const prefOk = low.startsWith("0b")||low.startsWith("+0b")||low.startsWith("-0b")||
                 low.startsWith("0o")||low.startsWith("+0o")||low.startsWith("-0o")||
                 low.startsWith("0x")||low.startsWith("+0x")||low.startsWith("-0x");
  if (prefOk){
    const body = limpiarPrefijo(low);
    const b = low.includes("0b") ? 2 : low.includes("0o") ? 8 : 16;
    return regexByBase[b].test(body);
  }
  return regexByBase[base]?.test(s) ?? false;
}

function parseInBase(raw, base){
  if (!baseValida(base)) throw new Error("Base no soportada");
  const s = raw.trim(); if (!s) throw new Error("Vacío");
  if (!validarCadenaBase(s, base)) throw new Error("No coincide con la base o contiene caracteres inválidos.");
  const low = s.toLowerCase();
  const hasPref = low.startsWith("0b")||low.startsWith("+0b")||low.startsWith("-0b")||
                  low.startsWith("0o")||low.startsWith("+0o")||low.startsWith("-0o")||
                  low.startsWith("0x")||low.startsWith("+0x")||low.startsWith("-0x");
  if (hasPref) return BigInt(low);
  const sign = (low[0]==="-"||low[0]==="+") ? low[0] : "";
  const body = sign ? low.slice(1) : low;
  const prefix = base===2?"0b":base===8?"0o":base===16?"0x":"";
  return BigInt(base===10 ? (sign+body) : (sign+prefix+body));
}

// Sin prefijos en la salida
function desdeDecimal(n, base){
  if (!baseValida(base)) throw new Error("Base no soportada");
  if (base===10) return n.toString(10);
  const sign = n < 0n ? "-" : "";
  const body = (n < 0n ? -n : n).toString(base).toUpperCase();
  return sign + body; // <-- nunca agrega 0b/0o/0x
}

// ====== Interacciones de cada tab ======
const decIn = $("#decIn");
const baseOut1 = $("#baseOut1");
const out1 = $("#out1");

$("#btnConv1").addEventListener("click", ()=>{
  try{
    const s = decIn.value.trim();
    if (!regexByBase[10].test(s)) throw new Error("Número decimal inválido.");
    const n = BigInt(s);
    const b = parseInt(baseOut1.value,10);
    const res = desdeDecimal(n,b);
    out1.classList.remove("error");
    out1.textContent = `Resultado: ${res}`;
  }catch(e){ out1.classList.add("error"); out1.textContent = `❗ ${e.message}`; }
});
$("#btnClr1").addEventListener("click", ()=>{decIn.value="";out1.textContent="";out1.classList.remove("error");});

const numIn2 = $("#numIn2"), baseIn2 = $("#baseIn2"), out2 = $("#out2");
$("#btnConv2").addEventListener("click", ()=>{
  try{
    const raw = numIn2.value;
    const base = parseInt(baseIn2.value,10);
    const val = parseInBase(raw, base);
    out2.classList.remove("error");
    out2.textContent = `${raw || "(vacío)"} (base ${base}) = ${val.toString(10)} (decimal)`;
  }catch(e){ out2.classList.add("error"); out2.textContent = `❗ ${e.message}`; }
});
$("#btnClr2").addEventListener("click", ()=>{numIn2.value="";out2.textContent="";out2.classList.remove("error");});

const aIn = $("#aIn"), bIn = $("#bIn");
const aBase = $("#aBase"), bBase = $("#bBase");
const opSel = $("#opSel"), resBase = $("#resBase");
const out3 = $("#out3");
$("#btnOp").addEventListener("click", ()=>{
  try{
    const A = parseInBase(aIn.value, parseInt(aBase.value,10));
    const B = parseInBase(bIn.value, parseInt(bBase.value,10));
    const op = opSel.value;
    let res, nombre;
    if (op==="add"){ res = A + B; nombre="Suma"; }
    else if (op==="sub"){ res = A - B; nombre="Resta"; }
    else if (op==="mul"){ res = A * B; nombre="Multiplicación"; }
    else throw new Error("Operación inválida.");
    const bout = parseInt(resBase.value,10);
    const resOut = desdeDecimal(res, bout);
    const fmt = (raw, b, val) => `  ${raw || "(vacío)"} (base ${b}) = ${val.toString(10)} (dec)`;
    const lines = [
      `${nombre}:`,
      fmt(aIn.value, parseInt(aBase.value,10), A),
      fmt(bIn.value, parseInt(bBase.value,10), B),
      `Resultado en decimal: ${res.toString(10)}`,
      `Resultado en base ${bout}: ${resOut}`
    ];
    out3.classList.remove("error");
    out3.textContent = lines.join("\n");
  }catch(e){ out3.classList.add("error"); out3.textContent = `❗ ${e.message}`; }
});
$("#btnClr3").addEventListener("click", ()=>{
  aIn.value=""; bIn.value="";
  aBase.value="10"; bBase.value="10";
  opSel.value="add"; resBase.value="10";
  out3.textContent=""; out3.classList.remove("error");
});

// Enter para ejecutar
[decIn, numIn2, aIn, bIn].forEach(el=>{
  el.addEventListener("keydown", e=>{
    if(e.key==="Enter"){
      if (el===decIn) $("#btnConv1").click();
      else if (el===numIn2) $("#btnConv2").click();
      else $("#btnOp").click();
    }
  });
});

// ====== Panel de Fondo (igual que antes) ======
const bgDialog = $("#bgDialog");
$("#openBg").addEventListener("click", ()=> bgDialog.showModal());
bgDialog.addEventListener("click", (e)=>{ if (e.target === bgDialog) bgDialog.close(); });

const bgFile = $("#bgFile");
const bgUrl = $("#bgUrl");
const bgOpacity = $("#bgOpacity");
const bgBlur = $("#bgBlur");
const bgDarken = $("#bgDarken");
const bgPosition = $("#bgPosition");
const bgParallax = $("#bgParallax");

function applyBgSettings(settings){
  const r = document.documentElement;
  r.style.setProperty("--bg-image", settings.url ? `url("${settings.url}")` : "none");
  r.style.setProperty("--overlay-opacity", settings.overlay ?? .35);
  r.style.setProperty("--bg-blur", (settings.blur ?? 6) + "px");
  r.style.setProperty("--bg-position", settings.position || "center center");
  r.style.setProperty("--bg-attach", settings.parallax ? "fixed" : "scroll");
  r.style.setProperty("--overlay-darken", settings.darken ?? 20);
}
function readBgSettings(){
  try{ return JSON.parse(localStorage.getItem("bgSettings")||"{}"); }
  catch{ return {}; }
}
function saveBgSettings(s){ localStorage.setItem("bgSettings", JSON.stringify(s)); }

function initBgPanel(){
  const s = readBgSettings();
  applyBgSettings({
    url: s.url || "",
    overlay: s.overlay ?? .35,
    blur: s.blur ?? 6,
    position: s.position || "center center",
    parallax: !!s.parallax,
    darken: s.darken ?? 20
  });
  bgUrl.value = s.url || "";
  bgOpacity.value = s.overlay ?? .35;
  bgBlur.value = s.blur ?? 6;
  bgDarken.value = s.darken ?? 20;
  bgPosition.value = s.position || "center center";
  bgParallax.checked = !!s.parallax;
}
initBgPanel();

$("#saveBg").addEventListener("click", (e)=>{
  e.preventDefault();
  const s = {
    url: bgUrl.value.trim(),
    overlay: parseFloat(bgOpacity.value || ".35"),
    blur: parseInt(bgBlur.value || "6", 10),
    position: bgPosition.value,
    parallax: !!bgParallax.checked,
    darken: parseInt(bgDarken.value || "20", 10)
  };
  applyBgSettings(s);
  saveBgSettings(s);
  bgDialog.close();
});

$("#clearBg").addEventListener("click", ()=>{
  const defaults = { url:"", overlay:.35, blur:6, position:"center center", parallax:false, darken:20 };
  applyBgSettings(defaults);
  saveBgSettings(defaults);
  bgUrl.value = "";
});

bgFile.addEventListener("change", ()=>{
  const file = bgFile.files?.[0];
  if (!file) return;
  if (file.type !== "image/png"){ alert("Por favor sube un PNG."); return; }
  const reader = new FileReader();
  reader.onload = () => { bgUrl.value = reader.result; };
  reader.readAsDataURL(file);
});

let raf = null;
window.addEventListener("scroll", ()=>{
  const s = readBgSettings();
  if (!s.parallax) return;
  if (raf) return;
  raf = requestAnimationFrame(()=>{
    const y = window.scrollY * 0.08;
    $(".bg")?.style.setProperty("transform", `translateY(${y}px)`);
    raf = null;
  });
});
