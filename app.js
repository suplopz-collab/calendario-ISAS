

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
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
let anioActual = 2026;
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

// ===== FESTIVOS 2026 =====
const FESTIVOS = [
  { fecha: "2026-01-01", tipo: "nacional", nombre: "Año Nuevo" },
  { fecha: "2026-12-25", tipo: "nacional", nombre: "Navidad" },
  { fecha: "2026-05-01", tipo: "autonomico", nombre: "Día del Trabajador" },
  { fecha: "2026-08-15", tipo: "local", nombre: "Fiesta Local", municipio: "Mi Ciudad" }
];

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

    // fines de semana
    if(diaSemana === 6) divDia.classList.add("sabado");
    if(diaSemana === 0) divDia.classList.add("domingo");

    // FESTIVOS
    const festivosDia = FESTIVOS_2026.filter(f => f.fecha === fechaISO);
    if(festivosDia.length > 0){
      const tipos = festivosDia.map(f=>f.tipo);
      if(tipos.includes("nacional")) divDia.classList.add("festivo-nacional");
      else if(tipos.includes("autonomico")) divDia.classList.add("festivo-autonomico");
      else divDia.classList.add("festivo-local");

      const info = document.createElement("span");
      info.textContent = "ℹ️";
      info.classList.add("info-festivo");
      info.style.fontSize = "24px";
      info.addEventListener("click", (e)=>{
        e.stopPropagation();
        const texto = festivosDia.map(f=>`• ${f.tipo.toUpperCase()}${f.municipio?" – "+f.municipio:""}: ${f.nombre}`).join("\n");
        alert(texto);
      });
      divDia.appendChild(info);
    }

    // PUNTO MORADO
    const notaGuardada = localStorage.getItem("agenda-" + fechaISO);
    const archivosGuardados = JSON.parse(localStorage.getItem("archivos-" + fechaISO) || "[]");
// 🔔 ICONO RECORDATORIO
// 🔔 ICONO RECORDATORIO CON TOOLTIP
const recordatorioRaw = localStorage.getItem("recordatorio-" + fechaISO);

if (recordatorioRaw) {
  const recordatorio = JSON.parse(recordatorioRaw);

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
    punto.style.display = (hayTexto || hayArchivos) ? "block" : "none";

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

  const btnGuardar = document.getElementById("guardar-agenda");
  const btnCancelar = document.getElementById("cancelar-agenda");

  if(btnGuardar && btnCancelar){
    btnGuardar.replaceWith(btnGuardar.cloneNode(true));
    btnCancelar.replaceWith(btnCancelar.cloneNode(true));

    const nuevoGuardar = document.getElementById("guardar-agenda");
    const nuevoCancelar = document.getElementById("cancelar-agenda");

    nuevoGuardar.addEventListener("click", ()=>{
      const texto = textarea.value.trim();
const hora = document.getElementById("agenda-hora").value; // "" si no se pone
const recordatorio = {
  mensaje: texto || "Recordatorio",
  hora: hora // "" si no hay hora
};
localStorage.setItem("recordatorio-" + fechaISO, JSON.stringify(recordatorio));

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
const chk = document.getElementById("activar-recordatorio");
const sel = document.getElementById("tiempo-recordatorio");

if (chk.checked) {
  const minutosAntes = parseInt(sel.value);

  const fechaEvento = new Date(fechaISO + "T09:00"); // 9:00 por defecto
  const avisoTime = fechaEvento.getTime() - minutosAntes * 60000;

  const recordatorio = {
    fecha: fechaISO,
    avisoTime,
    mensaje: "Tienes algo en la agenda: " + fechaISO
  };

  localStorage.setItem(
    "recordatorio-" + fechaISO,
    JSON.stringify(recordatorio)
  );
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
  cargarDatosRemotos();
});
window.addEventListener("online", () => {
  cargarDatosRemotos();
});
function programarRecordatorios() {
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith("recordatorio-")) return;

    const r = JSON.parse(localStorage.getItem(key));
    if (!r.avisoTime) return;

    const delay = r.avisoTime - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        enviarNotificacion(
          "⏰ Recordatorio",
          r.mensaje + " (" + r.hora + ")"
        );
      }, delay);
    }
  });
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

document.addEventListener("DOMContentLoaded", () => {
  pintarCalendario();
  programarRecordatorios();
});

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

document.addEventListener("DOMContentLoaded", iniciarReloj);
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

// REGISTRO DEL SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.error('SW error', err));
  });
}









