let materias = [];
let aprobadas = new Set();
let cursando = new Set();
let regulares = new Set();
let carreraActual = "biomedica-2025"; // default

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

            cargarProgreso();

            const grupos = {};
            materias.forEach(m => {
                if (!grupos[m.semestre]) grupos[m.semestre] = [];
                grupos[m.semestre].push(m);
            });

            Object.keys(grupos).sort((a, b) => a - b).forEach(sem => {
                const columna = document.createElement("div");
                columna.className = "columna-semestre";

                grupos[sem].forEach(m => {
                    const div = document.createElement("div");
                    div.id = m.codigo;
                    div.className = "materia";
                    // Nuevo: click en toda la materia
                    div.onclick = () => toggleEstado(m.codigo);

                    const asignatura = document.createElement("div");
                    asignatura.classList.add("nombre-materia");

                    const nombre = document.createElement("span");
                    nombre.innerText = m.nombre;
                    // nombre.onclick = () => toggleEstado(m.codigo);

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
                        icono.innerHTML = '<i class="fa-regular fa-file"></i>'; // para que no muestre el cuadrado
                        icono.title = "Ver programa";
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

            actualizarEstado();
        })
        .catch(err => console.error("Error cargando materias:", err));
}

// URLs de los planes de estudio por carrera
const PLANES_CARRERA = {
    "biomedica-2025": "https://fcefyn.unc.edu.ar/documents/5190/Ing._Biom%C3%A9dica_Plan_de_estudio_2025.pdf",
    "tusd-2025": "https://fcefyn.unc.edu.ar/documents/5905/Anexo_I_Grilla_de_Cursada-tusd25.pdf"
};

// Actualiza el enlace del plan de estudios
function actualizarPlanCarreraLink(nombreCarrera) {
    const link = document.getElementById("plan-carrera-link");
    if (link) {
        link.href = PLANES_CARRERA[nombreCarrera] || "#";
    }
}

// Listener del selector
document.getElementById("carrera").addEventListener("change", e => {
    cargarCarrera(e.target.value);
    actualizarPlanCarreraLink(e.target.value);
});

// Inicializa el href al cargar
actualizarPlanCarreraLink(carreraActual);

// Estados y nombres para referencia de colores
const ESTADOS_MATERIA = [
    { clase: "aprobada", label: "Aprobada" },
    { clase: "disponible", label: "Disponible para cursar" },
    { clase: "cursando", label: "En curso" },
    { clase: "regular", label: "Regularizada" },
    { clase: "bloqueada", label: "Bloqueada (faltan correlativas)" }
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

/* Inicial */
cargarCarrera(carreraActual);
setupInfoColores();
