

if ("Notification" in window && Notification.permission === "default") {
  // El permiso se pide cuando el usuario activa un recordatorio.
}

// ===== CONVERTIR ARCHIVO A BASE64 =====
function fileA64(file){
  return new Promise(resolve=>{
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// ===== ELEMENTOS Y FECHA =====
const diasMes = document.getElementById("dias-mes");
const nombreMes = document.getElementById("nombre-mes");
let fechaActual = new Date();
let anioActual = fechaActual.getFullYear();
let mesActual = fechaActual.getMonth();

// Array global temporal para archivos de la agenda
let archivosTemporal = [];

// ===== LÍMITES =====
const MAX_ARCHIVOS = 10;                 // máximo archivos por día
const MAX_TAMANO_TOTAL = 5 * 1024 * 1024; // 5 MB en total

// ===== MESES =====
const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

// ===== FESTIVOS 2026 (base + sobrantes) =====
const FESTIVOS = [
  ...(typeof FESTIVOS_BASE_2026 !== "undefined" ? FESTIVOS_BASE_2026 : []),
  { fecha: "2026-01-01", tipo: "nacional", nombre: "Año Nuevo" },
  { fecha: "2026-12-25", tipo: "nacional", nombre: "Navidad" },
  { fecha: "2026-05-01", tipo: "autonomico", nombre: "Día del Trabajador" },
  { fecha: "2026-08-15", tipo: "local", nombre: "Fiesta Local", municipio: "Mi Ciudad" },
  { fecha: "2026-10-30", tipo: "sobrante", nombre: "DÍA SOBRANTE JORNADA ANUAL" },
  { fecha: "2026-11-23", tipo: "sobrante", nombre: "DÍA SOBRANTE JORNADA ANUAL" },
  { fecha: "2026-12-24", tipo: "sobrante", nombre: "DÍA SOBRANTE JORNADA ANUAL" },
  { fecha: "2026-12-31", tipo: "sobrante", nombre: "DÍA SOBRANTE JORNADA ANUAL" }
];

function leerRecordatorio(fechaISO) {
  try {
    const raw = localStorage.getItem("recordatorio-" + fechaISO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function claveNotificado(recordatorio) {
  return `recordatorio-notificado-${recordatorio.fecha}-${recordatorio.avisoTime}`;
}

function yaNotificado(recordatorio) {
  return localStorage.getItem(claveNotificado(recordatorio)) === "1";
}

function marcarNotificado(recordatorio) {
  localStorage.setItem(claveNotificado(recordatorio), "1");
}

function mostrarPopupFestivo(texto) {
  const popup = document.getElementById("popup-festivo");
  const textoEl = document.getElementById("texto-popup-festivo");
  if (!popup || !textoEl) return;

  textoEl.textContent = texto;
  popup.classList.remove("oculto");
}

function cerrarPopupFestivo() {
  const popup = document.getElementById("popup-festivo");
  if (popup) popup.classList.add("oculto");
}

 

// ===== PINTAR CALENDARIO =====
function pintarCalendario() {
  diasMes.innerHTML = "";
  nombreMes.textContent = `${meses[mesActual]} ${anioActual}`;

  const primerDiaJS = new Date(anioActual, mesActual, 1).getDay();
  const inicio = (primerDiaJS + 6) % 7; // lunes primero
  const diasTotales = new Date(anioActual, mesActual + 1, 0).getDate();

  for (let i = 0; i < inicio; i++) {
    const vacio = document.createElement("div");
    vacio.classList.add("vacio");
    diasMes.appendChild(vacio);
  }

  for (let dia = 1; dia <= diasTotales; dia++) {
    const divDia = document.createElement("div");
    divDia.textContent = dia;
    divDia.style.position = "relative";

    const fechaISO = `${anioActual}-${String(mesActual+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    const fecha = new Date(anioActual, mesActual, dia);
    const diaSemana = fecha.getDay();
    const hoy = new Date();
    const esHoy = (
      dia === hoy.getDate() &&
      mesActual === hoy.getMonth() &&
      anioActual === hoy.getFullYear()
    );

    // fines de semana
    if(diaSemana === 6) divDia.classList.add("sabado");
    if(diaSemana === 0) divDia.classList.add("domingo");

    // FESTIVOS
    const festivosDia = FESTIVOS.filter(f => f.fecha === fechaISO);
    if(festivosDia.length > 0){
      const tipos = festivosDia.map(f=>f.tipo);
      if (tipos.includes("sobrante")) divDia.classList.add("dia-sobrante");
else if (tipos.includes("nacional")) divDia.classList.add("festivo-nacional");
else if (tipos.includes("autonomico")) divDia.classList.add("festivo-autonomico");
else divDia.classList.add("festivo-local");

      const info = document.createElement("span");
      info.textContent = "ℹ️";
      info.classList.add("info-festivo");
      info.style.fontSize = "24px";
      info.addEventListener("click", (e)=>{
        e.stopPropagation();
        const texto = festivosDia.map(f=>`• ${f.tipo.toUpperCase()}${f.municipio?" – "+f.municipio:""}: ${f.nombre}`).join("\n");
        mostrarPopupFestivo(texto);
      });
      divDia.appendChild(info);
    }

    // Resaltar el dia actual por encima de cualquier otra categoria
    if (esHoy) {
      divDia.classList.add("dia-hoy");
    }

    // PUNTO MORADO
    const notaGuardada = localStorage.getItem("agenda-" + fechaISO);
    // ====== MARCA DE TURNO (cuadrado abajo-izquierda) ======
if (notaGuardada) {
  const nota = notaGuardada.toUpperCase();

  let claseTurno = "";
  if (nota.includes("TURNO") && nota.includes("MAÑANA")) claseTurno = "turno-manana";
  else if (nota.includes("TURNO") && nota.includes("TARDE")) claseTurno = "turno-tarde";
  else if (nota.includes("TURNO") && nota.includes("NOCHE")) claseTurno = "turno-noche";

  // Evitar duplicados si repintas el calendario
  if (claseTurno && !divDia.querySelector(".marca-turno")) {
    const marca = document.createElement("span");
    marca.classList.add("marca-turno", claseTurno);
    divDia.appendChild(marca);
  }
}

const archivosGuardados = JSON.parse(localStorage.getItem("archivos-" + fechaISO) || "[]");
// 🔔 ICONO RECORDATORIO
// 🔔 ICONO RECORDATORIO CON TOOLTIP
const recordatorio = leerRecordatorio(fechaISO);
if (recordatorio) {

  const campana = document.createElement("span");
  campana.textContent = "🔔";
  campana.style.position = "absolute";
  campana.style.top = "2px";
  campana.style.left = "2px";
  campana.style.fontSize = "26px";
  campana.style.cursor = "help";

  // 👉 TOOLTIP con el texto del recordatorio
  campana.title = recordatorio.mensaje + (recordatorio.hora ? " – " + recordatorio.hora : "");

  // (opcional) evitar que abra la agenda al pulsar la campana
  campana.addEventListener("click", e => e.stopPropagation());

  divDia.appendChild(campana);
}


    let punto = divDia.querySelector(".marca-agenda");
    if(!punto){
      punto = document.createElement("span");
      punto.classList.add("marca-agenda");
      divDia.appendChild(punto);
    }

    const hayTexto = notaGuardada && notaGuardada.trim() !== "";
    const hayArchivos = archivosGuardados.length > 0;
    // Si la nota es SOLO el turno, no enseñamos el punto morado.
// Si hay cualquier otra cosa escrita (otra línea o más texto), sí se muestra.
const textoLimpio = (notaGuardada || "").trim();
const esSoloTurno = /^.*TURNO:\s*(MAÑANA|TARDE|NOCHE).*$\s*$/i.test(textoLimpio) && !textoLimpio.includes("\n");

const hayTurno = notaGuardada && /TURNO:\s*(MAÑANA|TARDE|NOCHE)/i.test(notaGuardada);
punto.style.display = ((hayArchivos) || (hayTexto && !esSoloTurno)) ? "block" : "none";

    // CLICK ABRE AGENDA
    divDia.addEventListener("click", () => abrirAgenda(fechaISO));

    diasMes.appendChild(divDia);
  }
}

// ===== FUNCIONES PARA ARCHIVOS =====
function mostrarArchivo(obj, fechaISO) {
  const vistaArchivos = document.getElementById("vista-archivos");

  const cont = document.createElement("div");
  cont.style.display = "flex";
  cont.style.flexDirection = "column";
  cont.style.alignItems = "center";
  cont.style.gap = "4px";
  cont.style.marginBottom = "6px";
  cont.classList.add("archivo-item");

  if(obj.tipo.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = obj.data;
    img.style.maxWidth = "80px";
    img.style.maxHeight = "80px";
    cont.appendChild(img);
  } else {
    const nombre = document.createElement("span");
    nombre.textContent = obj.nombre;
    cont.appendChild(nombre);
  }

  const botones = document.createElement("div");
  botones.style.display = "flex";
  botones.style.gap = "4px";

  const btnBorrar = document.createElement("button");
  btnBorrar.textContent = "❌";
  btnBorrar.style.cursor = "pointer";
  btnBorrar.addEventListener("click", () => borrarArchivo(obj, fechaISO));
  botones.appendChild(btnBorrar);

  const btnDescargar = document.createElement("button");
  btnDescargar.textContent = "⬇️";
  btnDescargar.style.cursor = "pointer";
  btnDescargar.title = "Descargar archivo";
  btnDescargar.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = obj.data;
    a.download = obj.nombre;
    a.click();
  });
  botones.appendChild(btnDescargar);

  cont.appendChild(botones);
  vistaArchivos.appendChild(cont);
}

// Borrar archivo
function borrarArchivo(archivo, fechaISO) {
  archivosTemporal = archivosTemporal.filter(a =>
    !(a.nombre === archivo.nombre && a.data === archivo.data)
  );

  if(archivosTemporal.length > 0){
    localStorage.setItem("archivos-" + fechaISO, JSON.stringify(archivosTemporal));
  } else {
    localStorage.removeItem("archivos-" + fechaISO);
  }

  const vistaArchivos = document.getElementById("vista-archivos");
  vistaArchivos.innerHTML = "";
  archivosTemporal.forEach(a => mostrarArchivo(a, fechaISO));

  pintarCalendario();
}

// ===== ABRIR AGENDA =====
function abrirAgenda(fechaISO){
  const popup = document.getElementById("popup-agenda");
  const textarea = document.getElementById("agenda-texto");
  const titulo = document.getElementById("agenda-fecha");
  const inputArchivo = document.getElementById("agenda-archivo");
  const vistaArchivos = document.getElementById("vista-archivos");

  if (!popup || !textarea || !titulo || !inputArchivo || !vistaArchivos) return;

  popup.classList.remove("oculto");
  titulo.textContent = "Agenda " + fechaISO;
  textarea.value = localStorage.getItem("agenda-" + fechaISO) || "";

  // LIMPIAR VISTA Y CARGAR ARCHIVOS GUARDADOS
  vistaArchivos.innerHTML = "";
  archivosTemporal = JSON.parse(localStorage.getItem("archivos-" + fechaISO) || "[]");
  archivosTemporal.forEach(a => mostrarArchivo(a, fechaISO));

  inputArchivo.value = "";
  inputArchivo.onchange = async () => {
    const archivosNuevos = Array.from(inputArchivo.files);

    // Calcular tamaño actual
    let tamañoActual = archivosTemporal.reduce((sum, a) => sum + (a.data.length * 3/4), 0);

    for(const file of archivosNuevos){
      const data = await fileA64(file);
      const sizeBytes = data.length * 3/4;

      if(archivosTemporal.length >= MAX_ARCHIVOS){
        alert(`No puedes añadir más de ${MAX_ARCHIVOS} archivos por día.`);
        break;
      }

      if(tamañoActual + sizeBytes > MAX_TAMANO_TOTAL){
        alert(`Tamaño total de archivos supera ${(MAX_TAMANO_TOTAL/(1024*1024)).toFixed(1)} MB.`);
        break;
      }

      const obj = { nombre: file.name, tipo: file.type, data };
      archivosTemporal.push(obj);
      mostrarArchivo(obj, fechaISO);
      tamañoActual += sizeBytes;
    }
  };

  textarea.scrollIntoView({ behavior: "smooth", block: "center" });
  textarea.focus();
const contPlantillas = document.getElementById("plantillas-agenda");
const inputHora = document.getElementById("agenda-hora");
const chk = document.getElementById("activar-recordatorio");
const sel = document.getElementById("tiempo-recordatorio");
const recordatorioGuardado = leerRecordatorio(fechaISO);

if (inputHora) inputHora.value = recordatorioGuardado?.hora || "";
if (chk) chk.checked = !!recordatorioGuardado?.avisoTime;
if (sel && Number.isFinite(recordatorioGuardado?.minutosAntes)) {
  sel.value = String(recordatorioGuardado.minutosAntes);
}

if (contPlantillas) {
  contPlantillas.onclick = (e) => {
    const btn = e.target.closest("button.tpl");
    if (!btn) return;

    const tipo = btn.dataset.tpl;

    const plantillas = {
      TURNO_M: "🟦 TURNO: Mañana (06:00–14:00)",
      TURNO_T: "🟦 TURNO: Tarde (14:00–22:00)",
      TURNO_N: "🟦 TURNO: Noche (22:00–06:00)",
      VACACIONES: "🟨 VACACIONES",
      MEDICO: "🟥 MÉDICO: " + (inputHora && inputHora.value ? inputHora.value : ""),
      LIBRE: "🟩 LIBRE"
    };

    const linea = (plantillas[tipo] || "").trim();
    if (!linea) return;

    // Si hay texto, lo añadimos en nueva línea; si no, lo ponemos.
    textarea.value = textarea.value.trim()
      ? (textarea.value.trim() + "\n" + linea)
      : linea;

    textarea.focus();
  };
}

  const btnGuardar = document.getElementById("guardar-agenda");
  const btnCancelar = document.getElementById("cancelar-agenda");

  if(btnGuardar && btnCancelar){
    btnGuardar.replaceWith(btnGuardar.cloneNode(true));
    btnCancelar.replaceWith(btnCancelar.cloneNode(true));

    const nuevoGuardar = document.getElementById("guardar-agenda");
    const nuevoCancelar = document.getElementById("cancelar-agenda");

    nuevoGuardar.addEventListener("click", ()=>{
      const texto = textarea.value.trim();
const hora = document.getElementById("agenda-hora").value;

      if(texto === ""){
        localStorage.removeItem("agenda-" + fechaISO);
      } else {
        localStorage.setItem("agenda-" + fechaISO, texto);
      }

      if(archivosTemporal.length > 0){
        localStorage.setItem("archivos-" + fechaISO, JSON.stringify(archivosTemporal));
      } else {
        localStorage.removeItem("archivos-" + fechaISO);
      }
if (chk.checked) {
  const minutosAntes = parseInt(sel.value);
  const horaEvento = hora || "09:00";
  const fechaEvento = new Date(fechaISO + "T" + horaEvento);
  const avisoTime = fechaEvento.getTime() - minutosAntes * 60000;

  const recordatorio = {
    fecha: fechaISO,
    avisoTime,
    minutosAntes,
    mensaje: texto || ("Tienes algo en la agenda: " + fechaISO),
    hora: horaEvento
  };

  localStorage.setItem(
    "recordatorio-" + fechaISO,
    JSON.stringify(recordatorio)
  );

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
} else {
  localStorage.removeItem("recordatorio-" + fechaISO);
}

      popup.classList.add("oculto");
      pintarCalendario();
    });

    nuevoCancelar.addEventListener("click", ()=>{
      popup.classList.add("oculto");
    });
  }
}
// ===== ALARMA VISUAL =====
function mostrarAlarma(texto) {
  const popup = document.getElementById("popup-alarma");
  const txt = document.getElementById("alarma-texto");
  const btn = document.getElementById("cerrar-alarma");

  if (!popup || !txt || !btn) return;

  txt.textContent = texto;
  popup.classList.remove("oculto");

  btn.onclick = () => {
    popup.classList.add("oculto");
  };
}

function avisarRecordatorio(recordatorio) {
  if (!recordatorio || !recordatorio.avisoTime || yaNotificado(recordatorio)) return;

  const mensaje = recordatorio.hora
    ? `${recordatorio.mensaje} (${recordatorio.hora})`
    : recordatorio.mensaje;

  mostrarAlarma(mensaje);
  enviarNotificacion("⏰ Recordatorio", mensaje);

  if ("vibrate" in navigator) {
    navigator.vibrate([250, 100, 250, 100, 400]);
  }

  marcarNotificado(recordatorio);
}

// ===== BOTONES MES =====
document.getElementById("mes-anterior").addEventListener("click", ()=>{
  mesActual--;
  if(mesActual < 0){ mesActual = 11; anioActual--; }
  pintarCalendario();
});

document.getElementById("mes-siguiente").addEventListener("click", ()=>{
  mesActual++;
  if(mesActual > 11){ mesActual = 0; anioActual++; }
  pintarCalendario();
});

// ===== INICIO =====
document.addEventListener("DOMContentLoaded", () => {
  pintarCalendario();
  programarRecordatorios();
  vigilarRecordatoriosEnPrimerPlano();
  cargarDatosRemotos();
  iniciarReloj();

  const cerrarFestivoBtn = document.getElementById("cerrar-popup-festivo");
  const popupFestivo = document.getElementById("popup-festivo");
  if (cerrarFestivoBtn) {
    cerrarFestivoBtn.addEventListener("click", cerrarPopupFestivo);
  }
  if (popupFestivo) {
    popupFestivo.addEventListener("click", (e) => {
      if (e.target === popupFestivo) cerrarPopupFestivo();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarPopupFestivo();
  });
});
window.addEventListener("online", () => {
  cargarDatosRemotos();
});
function programarRecordatorios() {
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith("recordatorio-")) return;

    let r = null;
    try {
      r = JSON.parse(localStorage.getItem(key));
    } catch {
      return;
    }
    if (!r.avisoTime) return;

    const delay = r.avisoTime - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        avisarRecordatorio(r);
      }, delay);
      return;
    }

    if (Date.now() - r.avisoTime < 30 * 60 * 1000) {
      avisarRecordatorio(r);
    }
  });
}

function vigilarRecordatoriosEnPrimerPlano() {
  setInterval(() => {
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith("recordatorio-")) return;

      let r = null;
      try {
        r = JSON.parse(localStorage.getItem(key));
      } catch {
        return;
      }

      if (!r || !r.avisoTime || yaNotificado(r)) return;
      if (Date.now() >= r.avisoTime) avisarRecordatorio(r);
    });
  }, 30000);
}


// ================== DATOS REMOTOS ==================
async function cargarDatosRemotos() {
  if (!navigator.onLine) return;

  try {
    const resp = await fetch("datos.json", {
      cache: "no-store"
    });

    if (!resp.ok) return;

    const datos = await resp.json();

    localStorage.setItem("datos-sindicato", JSON.stringify(datos));
    localStorage.setItem("datos-actualizados", Date.now());

  } catch (e) {
    // no mostrar nada al usuario
  }
}

function iniciarReloj() {
  const horaEl = document.getElementById("hora-actual");
  const fechaEl = document.getElementById("fecha-actual");

  if (!horaEl || !fechaEl) return;

  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const meses = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"
  ];

  function actualizar() {
    const ahora = new Date();

    const h = String(ahora.getHours()).padStart(2,"0");
    const m = String(ahora.getMinutes()).padStart(2,"0");
    const s = String(ahora.getSeconds()).padStart(2,"0");

    horaEl.textContent = `🕒 ${h}:${m}:${s}`;
    fechaEl.textContent = `${dias[ahora.getDay()]}, ${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;
  }

  actualizar();
  setInterval(actualizar, 1000);
}

function enviarNotificacion(titulo, mensaje) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: mensaje,
      icon: "icono.png" // opcional
    });
  }
}
// todo tu código del calendario arriba
// ------------------------------

let deferredInstallPrompt = null;
let swRegistration = null;
const PWA_BANNER_DISMISSED_KEY = "pwa-banner-dismissed";

function isBannerDismissed() {
  return localStorage.getItem(PWA_BANNER_DISMISSED_KEY) === "1";
}

function setBannerDismissed(value) {
  if (value) {
    localStorage.setItem(PWA_BANNER_DISMISSED_KEY, "1");
  } else {
    localStorage.removeItem(PWA_BANNER_DISMISSED_KEY);
  }
}

function setBannerStatus(texto = "") {
  const estadoEl = document.getElementById("pwa-banner-estado");
  if (!estadoEl) return;
  estadoEl.textContent = texto;
  estadoEl.classList.toggle("oculto", !texto);
}

function setBannerState({ showInstall = false, showUpdate = false, texto = "" }) {
  const banner = document.getElementById("pwa-banner");
  const textoEl = document.getElementById("pwa-banner-texto");
  const btnInstall = document.getElementById("btn-instalar-app");
  const btnUpdate = document.getElementById("btn-actualizar-app");

  if (!banner || !textoEl || !btnInstall || !btnUpdate) return;
  if (isBannerDismissed() && showInstall && !showUpdate) return;

  textoEl.textContent = texto || "La app puede instalarse o actualizarse.";
  btnInstall.classList.toggle("oculto", !showInstall);
  btnUpdate.classList.toggle("oculto", !showUpdate);
  banner.classList.toggle("oculto", !showInstall && !showUpdate);
}

function ocultarBannerPwa() {
  const banner = document.getElementById("pwa-banner");
  if (banner) banner.classList.add("oculto");
  setBannerStatus("");
}

function prepararInstalacionPwa() {
  const btnInstall = document.getElementById("btn-instalar-app");
  const btnCerrar = document.getElementById("btn-cerrar-pwa-banner");
  if (!btnInstall || !btnCerrar) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setBannerDismissed(false);
    setBannerStatus("");
    setBannerState({
      showInstall: true,
      texto: "Instala la app para usarla como acceso directo en tu movil."
    });
  });

  btnInstall.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    setBannerDismissed(false);
    setBannerStatus("Abriendo instalador...");
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if (choiceResult.outcome === "accepted") {
      setBannerStatus("Instalacion aceptada.");
      setTimeout(ocultarBannerPwa, 1200);
      return;
    }

    setBannerDismissed(true);
    setBannerStatus("Instalacion cancelada.");
    setTimeout(ocultarBannerPwa, 1200);
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setBannerDismissed(false);
    setBannerState({
      showInstall: false,
      showUpdate: false,
      texto: "Aplicacion instalada."
    });
    setBannerStatus("App instalada correctamente.");
    setTimeout(ocultarBannerPwa, 1600);
  });

  btnCerrar.addEventListener("click", () => {
    setBannerDismissed(true);
    ocultarBannerPwa();
  });
}

function configurarActualizacionPwa(registration) {
  const btnUpdate = document.getElementById("btn-actualizar-app");
  if (!btnUpdate) return;

  const mostrarBotonActualizar = () => {
    setBannerDismissed(false);
    setBannerStatus("");
    setBannerState({
      showUpdate: true,
      texto: "Hay una nueva version disponible. Pulsa actualizar."
    });
  };

  if (registration.waiting) {
    mostrarBotonActualizar();
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        mostrarBotonActualizar();
      }
    });
  });

  btnUpdate.addEventListener("click", () => {
    setBannerDismissed(false);
    setBannerStatus("Actualizando app...");
    btnUpdate.disabled = true;
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    setBannerStatus("No hay actualizacion pendiente.");
    btnUpdate.disabled = false;
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    setBannerStatus("Version actualizada. Recargando...");
    setTimeout(() => window.location.reload(), 400);
  });
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    swRegistration = await navigator.serviceWorker.register("./sw.js");
    configurarActualizacionPwa(swRegistration);
    setInterval(() => swRegistration.update(), 60 * 60 * 1000);
  } catch (err) {
    console.error("SW error", err);
  }
}

window.addEventListener("load", () => {
  registrarServiceWorker();
  prepararInstalacionPwa();
});








