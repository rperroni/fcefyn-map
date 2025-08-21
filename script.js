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
}

function actualizarEstado() {
    materias.forEach(m => {
        const elemento = document.getElementById(m.codigo);
        const rtfAdeudados = materias
            .filter(x => !aprobadas.has(x.codigo))
            .reduce((total, x) => total + (x.RTF || 0), 0);

        let puedeCursar;
        // las materias con condiciones especiales
        if (m.condiciones) {
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
        if (aprobadas.has(m.codigo)) {
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
        if (aprobadas.has(m.codigo) || (!puedeCursar) || regulares.has(m.codigo)) {
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

    guardarProgreso();
    actualizarEstado();
}

// Cambia estado cursando al click en icono
function toggleCursando(codigo) {
    if (cursando.has(codigo)) {
        cursando.delete(codigo);
    } else {
        cursando.add(codigo);
    }
    guardarProgreso();
    actualizarEstado();
}

function cargarCarrera(nombreCarrera) {
    carreraActual = nombreCarrera;

    fetch(`carreras/${nombreCarrera}.json`)
        .then(res => res.json())
        .then(data => {
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
                    </div>
                `;
                // Elimina optativas si existen
                const optativasCont = document.getElementById("contenedor-optativas");
                if (optativasCont) optativasCont.remove();
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
                    if (m.programa_url) {
                        const icono = document.createElement("a");
                        icono.href = m.programa_url;
                        icono.target = "_blank";
                        icono.className = "icono-flotante";
                        icono.innerHTML = '<i class="fa-regular fa-file"></i>';
                        icono.title = "Ver programa";
                        // Evita que el click cambie el estado de la materia
                        icono.addEventListener("click", function(e) {
                            e.stopPropagation();
                        });
                        acciones.appendChild(icono);
                    }

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

            // Renderiza optativas en un contenedor aparte
            let optativasCont = document.getElementById("contenedor-optativas");
            if (optativas.length > 0) {
                if (!optativasCont) {
                    optativasCont = document.createElement("div");
                    optativasCont.id = "contenedor-optativas";
                    contenedor.parentNode.appendChild(optativasCont);
                }
                optativasCont.innerHTML = "";
                optativas.forEach(m => {
                    const div = document.createElement("div");
                    div.id = m.codigo;
                    div.className = "materia optativa";
                    div.onclick = () => toggleEstado(m.codigo);

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
                    if (m.programa_url) {
                        const icono = document.createElement("a");
                        icono.href = m.programa_url;
                        icono.target = "_blank";
                        icono.className = "icono-flotante";
                        icono.innerHTML = '<i class="fa-regular fa-file"></i>';
                        icono.title = "Ver programa";
                        // Evita que el click cambie el estado de la materia
                        icono.addEventListener("click", function(e) {
                            e.stopPropagation();
                        });
                        acciones.appendChild(icono);
                    }

                    // Botón anotarse
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

                // Ocultar por defecto y resetear el botón
                optativasCont.classList.remove("visible");
                const btnOpt = document.getElementById("optativas-btn");
                if (btnOpt) {
                    btnOpt.textContent = "Ver optativas";
                    btnOpt.title = "Mostrar optativas";
                }
            } else if (optativasCont) {
                optativasCont.remove();
                const btnOpt = document.getElementById("optativas-btn");
                if (btnOpt) {
                    btnOpt.textContent = "Ver optativas";
                    btnOpt.title = "Mostrar optativas";
                }
            }

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
    { clase: "bloqueada", label: "Bloqueada (faltan correlativas)", var: "--bgnd-color-bloqueada" }
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

