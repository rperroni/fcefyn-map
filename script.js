let materias = [];
let aprobadas = new Set();
let cursando = new Set();
let regulares = new Set();
let carreraActual = localStorage.getItem("ultimaCarrera") || "biomedica-2025"; // default

import { CARRERAS } from './carreras.js';

/* Helpers para localStorage por carrera */
function claveLS(tipo) {
    return `${tipo}_${carreraActual}`;
}

// --- MODIFICACION PARA BASE DE DATOS

async function cargarProgreso() {
    // Siempre cargar desde localStorage primero
    const data = localStorage.getItem(claveLS("aprobadas"));
    aprobadas = data ? new Set(JSON.parse(data)) : new Set();

    const dataCursando = localStorage.getItem(claveLS("cursando"));
    cursando = dataCursando ? new Set(JSON.parse(dataCursando)) : new Set();

    const dataRegulares = localStorage.getItem(claveLS("regulares"));
    regulares = dataRegulares ? new Set(JSON.parse(dataRegulares)) : new Set();

    // Si hay DNI configurado, intentar cargar desde Firebase también
    if (dniActual) {
        try {
            const doc = await db.collection('progreso').doc(dniActual).get();
            if (doc.exists) {
                const dataFirebase = doc.data();
                
                // SOLO CARGAR LAS MATERIAS, IGNORAR LA CARRERA GUARDADA
                // (así podés ver cualquier carrera sin que te fuerce a una específica)
                aprobadas = new Set(dataFirebase.aprobadas || []);
                cursando = new Set(dataFirebase.cursando || []);
                regulares = new Set(dataFirebase.regulares || []);
                
                // NO cambiar carreraActual - dejar la que el usuario eligió
                // carreraActual = dataFirebase.carreraActual || carreraActual;
                
                // También actualizar localStorage
                guardarEnLocalStorage();
                
                mostrarEstadoSync('Datos sincronizados desde la nube');
                actualizarEstado();
            }
        } catch (error) {
            console.error('Error cargando desde Firebase:', error);
            mostrarEstadoSync('Error al sincronizar, usando datos locales', true);
        }
    }
}

async function guardarProgreso() {
    // Siempre guardar en localStorage
    localStorage.setItem(claveLS("aprobadas"), JSON.stringify([...aprobadas]));
    localStorage.setItem(claveLS("cursando"), JSON.stringify([...cursando]));
    localStorage.setItem(claveLS("regulares"), JSON.stringify([...regulares]));
    localStorage.setItem("ultimaCarrera", carreraActual);

    // Si hay DNI configurado, guardar también en Firebase
    if (dniActual) {
        try {
            await db.collection('progreso').doc(dniActual).set({
                aprobadas: [...aprobadas],
                cursando: [...cursando],
                regulares: [...regulares],
                carreraActual: carreraActual,  // ← Esto guarda la carrera ACTUAL
                ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });  // ← IMPORTANTE: merge: true para no pisar otros datos
            mostrarEstadoSync('Datos guardados en la nube');
        } catch (error) {
            console.error('Error guardando en Firebase:', error);
            mostrarEstadoSync('Error al guardar en la nube', true);
        }
    }
}

// Configuración de Firebase (al principio del archivo)
const firebaseConfig = {
    apiKey: "AIzaSyAV6aAXzYBBUx01bPAEYOF6MHR2C9eGzEA",
    authDomain: "fcfefyn-map.firebaseapp.com",
    projectId: "fcfefyn-map",
    storageBucket: "fcfefyn-map.firebasestorage.app",
    messagingSenderId: "293813581211",
    appId: "1:293813581211:web:fa77897e82256e1738dd3e",
    measurementId: "G-TSF0F0WY71"
};

// Inicializar Firebase
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (error) {
    console.log('Firebase no configurado aún');
}

let dniActual = '';

function configurarDNI(dni) {
    const dniLimpio = dni.trim();
    if (dniLimpio) {
        dniActual = dniLimpio;
        mostrarEstadoSync('DNI configurado: ' + dniActual);
        // Recargar progreso para sincronizar con la nube
        cargarProgreso();
        actualizarEstado();
    } else {
        mostrarEstadoSync('Ingresá un DNI válido', true);
    }
}

function limpiarDNI() {
    dniActual = '';
    mostrarEstadoSync('Modo local activado');
    // Recargar solo desde localStorage
    cargarProgreso();
    actualizarEstado();
}

function mostrarEstadoSync(mensaje, esError = false) {
    // Buscar o crear elemento para mostrar estado
    let statusElement = document.getElementById('sync-status');
    if (!statusElement) {
        statusElement = document.createElement('span');
        statusElement.id = 'sync-status';
        statusElement.style.marginLeft = '10px';
        statusElement.style.fontSize = '0.9em';
        // Agregarlo al lado de los controles de sync
        const syncControls = document.querySelector('.sync-controls');
        if (syncControls) {
            syncControls.appendChild(statusElement);
        }
    }
    
    statusElement.textContent = mensaje;
    statusElement.style.color = esError ? '#e74c3c' : '#27ae60';
}

function guardarEnLocalStorage() {
    localStorage.setItem(claveLS("aprobadas"), JSON.stringify([...aprobadas]));
    localStorage.setItem(claveLS("cursando"), JSON.stringify([...cursando]));
    localStorage.setItem(claveLS("regulares"), JSON.stringify([...regulares]));
    localStorage.setItem("ultimaCarrera", carreraActual);
}

function cargarDesdeLocalStorage() {
    const data = localStorage.getItem(claveLS("aprobadas"));
    aprobadas = data ? new Set(JSON.parse(data)) : new Set();

    const dataCursando = localStorage.getItem(claveLS("cursando"));
    cursando = dataCursando ? new Set(JSON.parse(dataCursando)) : new Set();

    const dataRegulares = localStorage.getItem(claveLS("regulares"));
    regulares = dataRegulares ? new Set(JSON.parse(dataRegulares)) : new Set();
}

// --- FIN DE MODIFICACION DB

/* ESTO ERA PARA HACERLO CON LOCAL STORAGE SOLAMENTE
function cargarProgreso() {
    const data = localStorage.getItem(claveLS("aprobadas"));
    aprobadas = data ? new Set(JSON.parse(data)) : new Set();

    const dataCursando = localStorage.getItem(claveLS("cursando"));
    cursando = dataCursando ? new Set(JSON.parse(dataCursando)) : new Set();

    const dataRegulares = localStorage.getItem(claveLS("regulares"));
    regulares = dataRegulares ? new Set(JSON.parse(dataRegulares)) : new Set();
}

function guardarProgreso() {
    localStorage.setItem(claveLS("aprobadas"), JSON.stringify([...aprobadas]));
    localStorage.setItem(claveLS("cursando"), JSON.stringify([...cursando]));
    localStorage.setItem(claveLS("regulares"), JSON.stringify([...regulares]));
    localStorage.setItem("ultimaCarrera", carreraActual);
}*/

// === Context menu y resaltado de correlativas ===
let ctxMenuEl = null;
let ctxMateria = null;
let highlightActive = false;
// Hint flotante "Esc para salir"
let escHintEl = null;

// Detector de pantallas pequeñas (mismo umbral que el resto del código)
function isSmallScreen() {
    return window.innerWidth <= 900;
}

function handleMateriaContextMenu(e, codigo) {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, codigo);
}

function openContextMenu(x, y, codigo) {
    ctxMateria = codigo;
    if (!ctxMenuEl) {
        ctxMenuEl = document.createElement('div');
        ctxMenuEl.id = 'materia-context-menu';
        ctxMenuEl.style.position = 'fixed';
        ctxMenuEl.style.zIndex = '9999';
        ctxMenuEl.style.background = '#fff';
        ctxMenuEl.style.border = '1px solid #ddd';
        ctxMenuEl.style.borderRadius = '6px';
        ctxMenuEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        ctxMenuEl.style.padding = '6px 0';
        ctxMenuEl.style.minWidth = '160px';
        ctxMenuEl.style.fontSize = '14px';
        ctxMenuEl.style.userSelect = 'none';

        const item = document.createElement('div');
        item.textContent = 'Ver correlativas';
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.addEventListener('mouseenter', () => item.style.background = '#f3f4f6');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('click', () => {
            if (ctxMateria) highlightCorrelativas(ctxMateria);
            closeContextMenu();
        });

        ctxMenuEl.appendChild(item);
        document.body.appendChild(ctxMenuEl);
    }

    // Posicionar dentro de la ventana
    const menuW = ctxMenuEl.offsetWidth || 160;
    const menuH = ctxMenuEl.offsetHeight || 40;
    const left = Math.min(x, window.innerWidth - menuW - 4);
    const top = Math.min(y, window.innerHeight - menuH - 4);
    ctxMenuEl.style.left = left + 'px';
    ctxMenuEl.style.top = top + 'px';
    ctxMenuEl.style.display = 'block';

    // Cerrar al hacer click fuera/scroll/resize
    setTimeout(() => {
        document.addEventListener('click', docClickCloseOnce, { once: true });
        window.addEventListener('resize', closeContextMenu, { once: true });
        window.addEventListener('scroll', closeContextMenu, { once: true });
    }, 0);
}

function docClickCloseOnce() { closeContextMenu(); }

function closeContextMenu() {
    if (ctxMenuEl) ctxMenuEl.style.display = 'none';
    ctxMateria = null;
}

function highlightCorrelativas(codigo) {
    clearHighlight();
    const materia = materias.find(m => m.codigo === codigo);
    if (!materia) return;
    highlightActive = true;

    const keep = new Set([codigo, ...(materia.correlativas || [])]);
    document.querySelectorAll('.materia').forEach(el => {
        if (!keep.has(el.id)) {
            el.style.opacity = '0.25';
            el.style.filter = 'grayscale(45%)';
            // Asegura sin borde en no relevantes
            el.style.outline = '';
            el.style.position = '';
            el.style.zIndex = '';
        } else {
            // No oscurecer seleccionada ni correlativas
            el.style.opacity = '';
            el.style.filter = '';
            if (el.id === codigo) {
                // Solo la seleccionada con borde
                el.style.outline = '3px solid rgba(0,128,255,0.7)';
                el.style.position = 'relative';
                el.style.zIndex = '2';
            } else {
                // Correlativas sin borde
                el.style.outline = '';
                el.style.position = '';
                el.style.zIndex = '';
            }
        }
    });

    showEscHint();
}

function clearHighlight() {
    if (!highlightActive) return;
    document.querySelectorAll('.materia').forEach(el => {
        el.style.opacity = '';
        el.style.filter = '';
        el.style.outline = '';
        el.style.zIndex = '';
        el.style.position = '';
    });
    // Remueve el hint si existe
    if (escHintEl) {
        escHintEl.remove();
        escHintEl = null;
    }
    highlightActive = false;
}

function showEscHint() {
    if (escHintEl) return;
    escHintEl = document.createElement('div');
    escHintEl.textContent = isSmallScreen() ? 'Tocá para salir' : 'Click o Esc para salir';
    escHintEl.style.position = 'fixed';
    escHintEl.style.right = '16px';
    escHintEl.style.bottom = '16px';
    escHintEl.style.padding = '8px 12px';
    escHintEl.style.background = 'rgba(17,17,17,0.9)';
    escHintEl.style.color = '#fff';
    escHintEl.style.borderRadius = '8px';
    escHintEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    escHintEl.style.fontSize = '13px';
    escHintEl.style.zIndex = '10000';
    escHintEl.style.pointerEvents = 'none';
    document.body.appendChild(escHintEl);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeContextMenu();
        clearHighlight();
    }
});

// Salir del modo al tocar/clickear en cualquier lado (todas las pantallas)
function handleSmallScreenDismiss(e) {
    if (!highlightActive) return;
    e.preventDefault();
    e.stopPropagation();
    closeContextMenu();
    clearHighlight();
}
// Captura antes que otros listeners
document.addEventListener('click', handleSmallScreenDismiss, true);
document.addEventListener('touchstart', handleSmallScreenDismiss, { capture: true, passive: false });

// === Fin menú contextual/resaltado ===

// Detecta si una materia es un "slot" de Optativa/Selectiva (no es tipo optativa real)
function esSlotOptativaOSelectiva(m) {
    return m && m.tipo !== "optativa" && /^(optativa|selectiva)\b/i.test(m.nombre || "");
}

function actualizarEstado() {
    materias.forEach(m => {
        const elemento = document.getElementById(m.codigo);
        const rtfAdeudados = materias
            .filter(x => !aprobadas.has(x.codigo))
            .reduce((total, x) => total + (x.RTF || 0), 0);

        // Si es un slot (Optativa/Selectiva), no se puede cursar directamente.
        const esSlot = esSlotOptativaOSelectiva(m);

        let puedeCursar;
        // las materias con condiciones especiales
        if (esSlot) {
            puedeCursar = false;
        } else if (m.condiciones) {
            switch (m.condiciones.tipo) {
                case "minAprobadas":
                    puedeCursar = aprobadas.size >= m.condiciones.cantidad;
                    break;
                case "maxAdeudados":
                    puedeCursar = rtfAdeudados <= m.condiciones.cantidad;
                    break;
                default:
                    puedeCursar = false;
            }
        } else {
            // regla estándar: todas las correlativas aprobadas o regulares
            puedeCursar = m.correlativas.every(c => aprobadas.has(c) || regulares.has(c));
        }

        // Colores y clases para optativas
        if (elemento) {
            elemento.classList.remove("optativa");
            if (m.tipo === "optativa") {
                elemento.classList.add("optativa");
                if (aprobadas.has(m.codigo)) {
                    elemento.className = "materia optativa aprobada";
                } else if (regulares.has(m.codigo)) {
                    elemento.className = "materia optativa regular";
                } else if (cursando.has(m.codigo)) {
                    elemento.className = "materia optativa cursando";
                } else if (puedeCursar) {
                    elemento.className = "materia optativa disponible";
                } else {
                    elemento.className = "materia optativa bloqueada";
                }
            } else {
                if (aprobadas.has(m.codigo)) {
                    elemento.className = "materia aprobada";
                } else if (regulares.has(m.codigo)) {
                    elemento.className = "materia regular";
                } else if (cursando.has(m.codigo)) {
                    elemento.className = "materia cursando";
                } else if (puedeCursar) {
                    elemento.className = "materia disponible";
                } else {
                    elemento.className = "materia bloqueada";
                }
            }
        }

        // Tooltip en el nombre
        const nombreSpan = elemento.querySelector(".nombre-materia span");
        if (esSlot) {
            nombreSpan.title = "Cambiá el estado desde la lista de optativas.";
        } else if (aprobadas.has(m.codigo)) {
            nombreSpan.title = "Desaprobar";
        } else if (cursando.has(m.codigo)) {
            nombreSpan.title = "Regularizar";
        } else if (puedeCursar || regulares.has(m.codigo)) {
            nombreSpan.title = "Aprobar";
        } else {
            nombreSpan.title = "Te faltan correlativas";
        }

        // Botón anotarse
        const botonAnotarse = elemento.querySelector(".icono-anotarse");
        const esMobile = window.innerWidth <= 900;
        if (esSlot) {
            // Nunca permitir anotarse en slots Optativa/Selectiva
            botonAnotarse.style.display = "none";
        } else if (aprobadas.has(m.codigo) || (!puedeCursar) || regulares.has(m.codigo)) {
            // En desktop se oculta si no se puede usar
            // En mobile también se oculta si no es disponible/cursando
            botonAnotarse.style.display = "none";
        } else {
            botonAnotarse.style.display = "block";
            botonAnotarse.innerHTML = cursando.has(m.codigo)
                ? '<i class="fa-solid fa-ban"></i>'
                : '<i class="fa-regular fa-pen-to-square"></i>';
            botonAnotarse.title = cursando.has(m.codigo) ? "Abandonar" : "Anotarse";
        }

        // Colores del botón anotarse
        if (botonAnotarse) {
            if (elemento.classList.contains("disponible")) {
                botonAnotarse.classList.add("anotarse");
                botonAnotarse.classList.remove("abandonar");
            } else if (elemento.classList.contains("cursando")) {
                botonAnotarse.classList.add("abandonar");
                botonAnotarse.classList.remove("anotarse");
            } else {
                botonAnotarse.classList.remove("anotarse", "abandonar");
            }
        }
    });
}

// Cambia el estado al click en el nombre
function toggleEstado(codigo) {
    const materia = materias.find(m => m.codigo === codigo);

    // Bloquea cambios directos en slots Optativa/Selectiva
    if (esSlotOptativaOSelectiva(materia)) {
        return;
    }

    if (aprobadas.has(codigo)) {
        aprobadas.delete(codigo);
    } else if (cursando.has(codigo)) {
        if (materia.semestre === 0) {
            aprobadas.add(codigo);
            cursando.delete(codigo);
        } else {
            regulares.add(codigo);
            cursando.delete(codigo);
        }
    } else {
        regulares.delete(codigo);
        aprobadas.add(codigo);
    }

    // Ajusta los slots de optativas según la nueva selección
    updateOptativaSlots();

    guardarProgreso();
    actualizarEstado();
}

// Cambia estado cursando al click en icono
function toggleCursando(codigo) {
    const materia = materias.find(m => m.codigo === codigo);
    // Bloquea cambios directos en slots Optativa/Selectiva
    if (esSlotOptativaOSelectiva(materia)) {
        return;
    }

    if (cursando.has(codigo)) {
        cursando.delete(codigo);
    } else {
        cursando.add(codigo);
    }

    // Ajusta los slots de optativas según la nueva selección
    updateOptativaSlots();

    guardarProgreso();
    actualizarEstado();
}

// Modal "programa no encontrado"
function openProgramaModal(htmlContent) {
    const modal = document.getElementById("programa-modal");
    const body = document.getElementById("programa-modal-body");
    if (!modal || !body) return;
    body.innerHTML = htmlContent;
    modal.classList.add("visible");
}
function setupProgramaModal() {
    const modal = document.getElementById("programa-modal");
    const closeBtn = document.getElementById("programa-modal-close");
    if (!modal || !closeBtn) return;

    closeBtn.addEventListener("click", () => modal.classList.remove("visible"));
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("visible");
    });
}

// Crea el icono "Ver programa" para cualquier materia (con o sin URL)
function buildProgramaIcon(m) {
    const icono = document.createElement("a");
    icono.className = "icono-flotante";
    icono.innerHTML = '<i class="fa-regular fa-file"></i>';
    icono.target = "_blank";

    if (m.programa_url && m.programa_url.trim()) {
        icono.href = m.programa_url;
        icono.rel = "noopener noreferrer";
        icono.title = "Ver programa";
        // Evita que el click cambie el estado de la materia
        icono.addEventListener("click", (e) => e.stopPropagation());
    } else {
        icono.href = "#";
        icono.rel = "noopener";
        icono.title = "Programa no disponible";
        icono.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const planEl = document.getElementById("plan-carrera-link");
            const facLink = (planEl && planEl.href && planEl.href !== "#")
                ? planEl.href
                : "https://fcefyn.unc.edu.ar/";
            const optMsg = (m.tipo === "optativa" || /^(optativa|selectiva)\b/i.test(m.nombre || ""))
                ? "<p>Si es una materia optativa/selectiva, verificá si se sigue dictando.</p>"
                : "";

            const html = `
                <p>Busqué en la <a href = "https://fcefyn.unc.edu.ar/" target="_blank" rel="noopener" style="color: blue">página de la facultad</a>
                 el código de la materia "${m.nombre}" y no se encontró un programa publicado.</p>
                ${optMsg}
                <p>Si tenés el enlace correcto, podés enviarlo desde el botón de sugerencias en el pie de página.</p>
                <p> Asegurate de incluir el código de la materia (por ejemplo 10-04024). Lo podés encontrar en la sección de plan de estudios del Guaraní.</p>
                <p> ¡Gracias!</p>
            `;
            openProgramaModal(html);
        });
    }

    return icono;
}

function cargarCarrera(nombreCarrera) {
    carreraActual = nombreCarrera;

    fetch(`carreras/${nombreCarrera}.json`)
        .then(res => res.json())
        .then(data => {
            // Al cambiar de carrera, salir del modo resaltado y cerrar menú
            clearHighlight();
            closeContextMenu();

            materias = data;
            const contenedor = document.getElementById("contenedor-semestres");
            contenedor.innerHTML = "";

            // Si el archivo está vacío, muestra "En construcción"
            if (!Array.isArray(materias) || materias.length === 0) {
                contenedor.innerHTML = `
                    <div class="en-construccion-panel">
                        <i class="fa-solid fa-person-digging en-construccion-icon"></i>
                        <div><b>En construcción</b></div>
                        <div class="en-construccion-desc">Pronto vas a poder ver el plan de esta carrera.</div>
                        <div class="en-construccion-desc" style="margin-top:14px;">
                            <em>Si sos alumno de esta carrera y querés darme una mano para cargar el plan de estudios mandame un mail a
                            <a href="mailto:rocio.perroni@mi.unc.edu.ar">rocio.perroni@mi.unc.edu.ar</a>.</em>
                        </div>
                    </div>
                `;

                // Asegura contenedor de optativas con mensaje y botón visible
                let optativasCont = document.getElementById("contenedor-optativas");
                if (!optativasCont) {
                    optativasCont = document.createElement("div");
                    optativasCont.id = "contenedor-optativas";
                    contenedor.parentNode.appendChild(optativasCont);
                }
                optativasCont.innerHTML = `
                    <div class="en-construccion-panel">
                        <i class="fa-regular fa-circle-question en-construccion-icon"></i>
                        <div><b>Optativas aún no disponibles</b></div>
                        <div class="en-construccion-desc">
                            Las optativas ofrecidas para este plan aún no están disponibles. Podés consultar el plan viejo como referencia.
                        </div>
                    </div>
                `;
                optativasCont.classList.remove("visible");

                const btnOpt = document.getElementById("optativas-btn");
                if (btnOpt) {
                    btnOpt.style.display = "inline-block";
                    btnOpt.textContent = "Ver optativas";
                    btnOpt.title = "Mostrar optativas";
                }
                return;
            }

            cargarProgreso();

            // Agrupa materias por semestre y optativas
            const grupos = {};
            const optativas = [];
            materias.forEach(m => {
                if (m.tipo === "optativa") {
                    optativas.push(m);
                } else {
                    if (!grupos[m.semestre]) grupos[m.semestre] = [];
                    grupos[m.semestre].push(m);
                }
            });

            Object.keys(grupos).sort((a, b) => a - b).forEach(sem => {
                const columna = document.createElement("div");
                columna.className = "columna-semestre";
                grupos[sem].forEach(m => {
                    const div = document.createElement("div");
                    div.id = m.codigo;
                    div.className = "materia";
                    div.onclick = () => toggleEstado(m.codigo);
                    // Click derecho: ver correlativas
                    div.addEventListener('contextmenu', (e) => handleMateriaContextMenu(e, m.codigo));

                    const asignatura = document.createElement("div");
                    asignatura.classList.add("nombre-materia");

                    const nombre = document.createElement("span");
                    nombre.innerText = m.nombre;

                    asignatura.appendChild(nombre);
                    div.appendChild(asignatura);

                    // Contenedor de iconos a la derecha
                    const acciones = document.createElement("div");
                    acciones.className = "acciones-materia";

                    // Icono ver programa
                    acciones.appendChild(buildProgramaIcon(m));

                    // Botón anotarse
                    const botonAnotarse = document.createElement("div");
                    botonAnotarse.className = "icono-anotarse";
                    botonAnotarse.onclick = e => {
                        e.stopPropagation();
                        toggleCursando(m.codigo);
                    };
                    acciones.appendChild(botonAnotarse);

                    div.appendChild(acciones);
                    columna.appendChild(div);
                });
                contenedor.appendChild(columna);
            });

            // Renderiza optativas en un contenedor aparte (siempre visible el botón)
            let optativasCont = document.getElementById("contenedor-optativas");
            if (!optativasCont) {
                optativasCont = document.createElement("div");
                optativasCont.id = "contenedor-optativas";
                contenedor.parentNode.appendChild(optativasCont);
            }
            optativasCont.innerHTML = "";

            if (optativas.length > 0) {
                optativas.forEach(m => {
                    const div = document.createElement("div");
                    div.id = m.codigo;
                    div.className = "materia optativa";
                    div.onclick = () => toggleEstado(m.codigo);
                    // Click derecho: ver correlativas
                    div.addEventListener('contextmenu', (e) => handleMateriaContextMenu(e, m.codigo));

                    const asignatura = document.createElement("div");
                    asignatura.classList.add("nombre-materia");

                    const nombre = document.createElement("span");
                    nombre.innerText = m.nombre;

                    asignatura.appendChild(nombre);
                    div.appendChild(asignatura);

                    const acciones = document.createElement("div");
                    acciones.className = "acciones-materia";

                    acciones.appendChild(buildProgramaIcon(m));

                    const botonAnotarse = document.createElement("div");
                    botonAnotarse.className = "icono-anotarse";
                    botonAnotarse.onclick = e => {
                        e.stopPropagation();
                        toggleCursando(m.codigo);
                    };
                    acciones.appendChild(botonAnotarse);

                    div.appendChild(acciones);
                    optativasCont.appendChild(div);
                });
            } else {
                // Mensaje si no hay optativas cargadas para este plan
                optativasCont.innerHTML = `
                    <div class="en-construccion-panel">
                        <i class="fa-regular fa-circle-question en-construccion-icon"></i>
                        <div><b>Optativas aún no disponibles</b></div>
                        <div class="en-construccion-desc">
                            Las optativas ofrecidas para este plan aún no están disponibles. Podés consultar el plan viejo como referencia.
                        </div>
                    </div>
                `;
            }

            // Oculto por defecto y botón siempre visible
            optativasCont.classList.remove("visible");
            const btnOpt = document.getElementById("optativas-btn");
            if (btnOpt) {
                btnOpt.style.display = "inline-block";
                btnOpt.textContent = "Ver optativas";
                btnOpt.title = "Mostrar optativas";
            }

            // Alinea los slots de "Optativa I/II/..." con lo seleccionado
            updateOptativaSlots();

            actualizarEstado();
        })
        .catch(err => console.error("Error cargando materias:", err));
}



// Actualiza el enlace del plan de estudios
function actualizarPlanCarreraLink(nombreCarrera) {
    const link = document.getElementById("plan-carrera-link");
    if (link) {
        const carrera = CARRERAS.find(c => c.value === nombreCarrera);
        link.href = carrera && carrera.plan ? carrera.plan : "#";
    }
}


// Renderiza el menú personalizado de carreras
function renderCarreraDropdown() {
    const dropdown = document.getElementById("carrera-dropdown");
    if (!dropdown) return;
    dropdown.innerHTML = "";

    // Encuentra la carrera seleccionada
    const selectedCarrera = CARRERAS.find(c => c.value === carreraActual) || CARRERAS[0];

    // Elemento seleccionado
    const selectedDiv = document.createElement("div");
    selectedDiv.className = "carrera-dropdown-selected";
    selectedDiv.innerHTML = `
        <span>
            ${selectedCarrera.nombre}
            <span class="anio-label">${selectedCarrera.anio}</span>
        </span>
        <i class="fa-solid fa-chevron-down"></i>
    `;
    dropdown.appendChild(selectedDiv);

    // Lista de opciones
    const listDiv = document.createElement("div");
    listDiv.className = "carrera-dropdown-list";
    let selectedOptionDiv = null;
    CARRERAS.forEach(c => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "carrera-dropdown-option" + (c.value === carreraActual ? " selected" : "");
        optionDiv.innerHTML = `
            <span>
                ${c.nombre}
                <span class="anio-label">${c.anio}</span>
            </span>
        `;
        optionDiv.onclick = () => {
            carreraActual = c.value;
            localStorage.setItem("ultimaCarrera", carreraActual); // Guarda la última seleccionada
            renderCarreraDropdown();
            cargarCarrera(carreraActual);
            actualizarPlanCarreraLink(carreraActual);
            listDiv.classList.remove("visible");
        };
        if (c.value === carreraActual) selectedOptionDiv = optionDiv;
        listDiv.appendChild(optionDiv);
    });
    dropdown.appendChild(listDiv);

    // Mostrar/ocultar lista al click
    selectedDiv.onclick = (e) => {
        e.stopPropagation();
        listDiv.classList.toggle("visible");
        // Scroll a la opción seleccionada
        if (listDiv.classList.contains("visible") && selectedOptionDiv) {
            setTimeout(() => {
                selectedOptionDiv.scrollIntoView({ block: "center", behavior: "instant" });
            }, 0);
        }
    };

    // Ocultar lista al click fuera
    document.addEventListener("click", function hideDropdown(e) {
        if (!dropdown.contains(e.target)) {
            listDiv.classList.remove("visible");
        }
    });
}

// Sugerencias: formulario flotante y envío por Formspree
function setupSugerencias() {
    const modal = document.getElementById("sugerencias-modal");
    const btn = document.getElementById("sugerencias-btn");
    const closeBtn = document.getElementById("sugerencias-close");
    const form = document.getElementById("sugerencias-form");
    const status = document.getElementById("sugerencias-status");

    // Mostrar modal
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.classList.add("visible");
        status.textContent = "";
    });

    // Cerrar modal con cruz
    closeBtn.addEventListener("click", () => {
        modal.classList.remove("visible");
    });

    // Cerrar modal al hacer click fuera del contenido
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("visible");
        }
    });

    // Enviar formulario por Formspree
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        status.textContent = "Enviando...";
        // Formspree endpoint para perronirocio@gmail.com
        fetch("https://formspree.io/f/xblkelye", {
            method: "POST",
            headers: { "Accept": "application/json" },
            body: new FormData(form)
        })
        .then(response => {
            if (response.ok) {
                status.textContent = "¡Mensaje enviado! Gracias por tu aporte.";
                form.reset();
                setTimeout(() => { modal.classList.remove("visible"); }, 1800);
            } else {
                status.textContent = "Hubo un error al enviar. Intenta nuevamente.";
            }
        })
        .catch(() => {
            status.textContent = "Hubo un error al enviar. Intenta nuevamente.";
        });
    });
}

// Elimina el listener del <select> original
// document.getElementById("carrera").addEventListener("change", ...);

// Inicializa el menú personalizado y la carrera
renderCarreraDropdown();
cargarCarrera(carreraActual);
actualizarPlanCarreraLink(carreraActual);

// Estados y nombres para referencia de colores
const ESTADOS_MATERIA = [
    { clase: "aprobada", label: "Aprobada", var: "--bgnd-color-aprobada" },
    { clase: "disponible", label: "Disponible para cursar", var: "--bgnd-color-disponible" },
    { clase: "cursando", label: "En curso", var: "--bgnd-color-cursando" },
    { clase: "regular", label: "Regularizada", var: "--bgnd-color-regular" },
    { clase: "bloqueada", label: "Bloqueada (faltan correlativas. Click derecho para verlas.)", var: "--bgnd-color-bloqueada" }
];

// Utilidad para obtener el color real de cada estado desde CSS
function getColorForEstado(clase) {
    // Crea un elemento temporal con la clase y obtiene el color de fondo
    const temp = document.createElement("div");
    temp.className = `materia ${clase}`;
    temp.style.display = "none";
    document.body.appendChild(temp);
    // Usa getComputedStyle para obtener el color actual
    const color = getComputedStyle(temp).backgroundColor;
    document.body.removeChild(temp);
    return color;
}

// Renderiza el panel de referencia de colores
function renderInfoColoresPanel() {
    const panel = document.getElementById("info-colores-panel");
    panel.innerHTML = "<b>Referencia de colores:</b><br><br>";
    ESTADOS_MATERIA.forEach(estado => {
        const color = getColorForEstado(estado.clase);
        const row = document.createElement("div");
        row.className = "color-row";
        row.innerHTML = `
            <span class="color-dot" style="background:${color};"></span>
            <span class="color-label">${estado.label}</span>
        `;
        panel.appendChild(row);
    });
}

// Muestra/oculta el panel al tocar el botón
function setupInfoColores() {
    const btn = document.getElementById("info-colores-btn");
    const panel = document.getElementById("info-colores-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", () => {
        if (panel.classList.contains("visible")) {
            panel.classList.remove("visible");
        } else {
            renderInfoColoresPanel();
            panel.classList.add("visible");
        }
    });
    // Oculta el panel si se toca fuera
    document.addEventListener("click", e => {
        if (!panel.classList.contains("visible")) return;
        if (e.target !== btn && !panel.contains(e.target)) {
            panel.classList.remove("visible");
        }
    });
}

/* Footer: referencia de colores */
function setupFooterColores() {
    const modal = document.getElementById("footer-colores-modal");
    const btn = document.getElementById("footer-colores-btn");
    const closeBtn = document.getElementById("footer-colores-close");
    const list = document.getElementById("footer-colores-list");

    function renderColoresList() {
        list.innerHTML = "";
        ESTADOS_MATERIA.forEach(estado => {
            const color = getComputedStyle(document.documentElement).getPropertyValue(estado.var).trim();
            const row = document.createElement("div");
            row.className = "footer-color-row";
            row.innerHTML = `
                <span class="footer-color-dot" style="background:${color};"></span>
                <span class="footer-color-label">${estado.label}</span>
            `;
            list.appendChild(row);
        });
    }

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        renderColoresList();
        modal.classList.add("visible");
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.remove("visible");
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("visible");
        }
    });
}

/* Inicial */
cargarCarrera(carreraActual);
setupInfoColores();

// Asegura posicionamiento correcto del botón respecto al footer
window.addEventListener('load', setFooterHeightVar);
window.addEventListener('resize', setFooterHeightVar);
document.addEventListener('DOMContentLoaded', setFooterHeightVar);

// Toggle optativas: ejecuta siempre, no depende de DOMContentLoaded
(function() {
    const btnOptativas = document.getElementById("optativas-btn");
    const contOptativas = document.getElementById("contenedor-optativas");
    if (btnOptativas && contOptativas) {
        // Oculta por defecto al cargar
        contOptativas.classList.remove("visible");
        btnOptativas.textContent = "Ver optativas";
        btnOptativas.title = "Mostrar optativas";

        btnOptativas.onclick = function() {
            const visible = contOptativas.classList.toggle("visible");
            btnOptativas.textContent = visible ? "Ocultar optativas" : "Ver optativas";
            btnOptativas.title = visible ? "Ocultar optativas" : "Mostrar optativas";
        };
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    setupSugerencias();
    setupFooterColores();
    setupInfoColores();
    setupProgramaModal();

    // Toggle optativas: no depende de que exista el contenedor en este momento
    const btnOptativas = document.getElementById("optativas-btn");
    if (btnOptativas) {
        btnOptativas.onclick = function() {
            const contOptativas = document.getElementById("contenedor-optativas");
            if (!contOptativas) return; // si no hay optativas, no hace nada
            const visible = contOptativas.classList.toggle("visible");
            btnOptativas.textContent = visible ? "Ocultar optativas" : "Ver optativas";
            btnOptativas.title = visible ? "Ocultar optativas" : "Mostrar optativas";
        };

        // Estado inicial: oculto y texto por defecto
        const contOptInit = document.getElementById("contenedor-optativas");
        if (contOptInit) contOptInit.classList.remove("visible");
        btnOptativas.textContent = "Ver optativas";
        btnOptativas.title = "Mostrar optativas";
    }
});

// Calcula y establece la altura del footer como variable CSS
function setFooterHeightVar() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const h = footer.offsetHeight || 0;
    document.documentElement.style.setProperty('--footer-height', `${h}px`);
}

window.addEventListener('load', setFooterHeightVar);
window.addEventListener('resize', setFooterHeightVar);
document.addEventListener('DOMContentLoaded', setFooterHeightVar);

// Detecta y actualiza los slots de optativas copiando el estado (cursando/regular/aprobada)
function updateOptativaSlots() {
    // Slots: materias NO tipo "optativa" cuyo nombre empieza con "Optativa" o "Selectiva"
    const slots = materias
        .filter(m => esSlotOptativaOSelectiva(m))
        .sort((a, b) => {
            // Orden por semestre y luego por nombre (estable)
            const sa = (typeof a.semestre === "number") ? a.semestre : Number.MAX_SAFE_INTEGER;
            const sb = (typeof b.semestre === "number") ? b.semestre : Number.MAX_SAFE_INTEGER;
            if (sa !== sb) return sa - sb;
            return (a.nombre || "").localeCompare(b.nombre || "", "es");
        })
        .map(m => m.codigo);

    if (slots.length === 0) return;

    // Optativas "reales" seleccionadas (orden según aparecen en el JSON)
    const seleccionadas = materias.filter(m =>
        m.tipo === "optativa" && (aprobadas.has(m.codigo) || regulares.has(m.codigo) || cursando.has(m.codigo))
    );

    // Limpia estados de todos los slots
    slots.forEach(code => {
        aprobadas.delete(code);
        regulares.delete(code);
        cursando.delete(code);
    });

    // Copia el estado de cada optativa seleccionada al slot correspondiente
    const n = Math.min(seleccionadas.length, slots.length);
    for (let i = 0; i < n; i++) {
        const src = seleccionadas[i];
        const dst = slots[i];
        // Copia estado exclusivo
        if (aprobadas.has(src.codigo)) {
            aprobadas.add(dst);
        } else if (regulares.has(src.codigo)) {
            regulares.add(dst);
        } else if (cursando.has(src.codigo)) {
            cursando.add(dst);
        }
    }
}
    
// Agregar event listeners cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    const btnSincronizar = document.getElementById('btn-sincronizar');
    const btnLocal = document.getElementById('btn-local');
    const dniInput = document.getElementById('dni-input');
    
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', function() {
            configurarDNI(dniInput.value);
        });
    }
    
    if (btnLocal) {
        btnLocal.addEventListener('click', limpiarDNI);
    }
    
    console.log("✅ Event listeners configurados");
});

