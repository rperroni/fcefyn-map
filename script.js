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
        // las materias modulo de ingles, pps, y pi tienen condiciones especiales de correlativas
        if (m.condiciones) {
            switch (m.condiciones.tipo) {
                case "minAprobadas":
                    puedeCursar = aprobadas.size >= m.condiciones.cantidad;
                    break;
                case "maxAdeudados":
                    puedeCursar = rtfAdeudados <= m.condiciones.cantidad;
                    break;
                // Podés agregar más tipos en el futuro (ej: "requiereCursando", etc.)
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

        // Tooltip
        const nombreSpan = elemento.querySelector(".nombre-materia span");
        if (aprobadas.has(m.codigo)) { //al pasar el mouse sobre una materia aprobada sale el mensaje "desaprobar", que es su acción onclick
            nombreSpan.title = "Desaprobar";
        } else if (cursando.has(m.codigo)) { //hover mouse sobre una materia en curso muestra "regularizar"
            nombreSpan.title = "Regularizar";
        } else if (puedeCursar || regulares.has(m.codigo)) { //sobre una materia disponible o regular dice "aprobar"
            nombreSpan.title = "Aprobar";
        } else {
            nombreSpan.title = "Te faltan correlativas"; //si la materia está bloqueada permite "aprobar" pero avisa que faltan las correlativas
        }

        // Botón anotarse
        const botonAnotarse = elemento.querySelector(".icono-anotarse");
        if (aprobadas.has(m.codigo) || (!puedeCursar) || regulares.has(m.codigo)) {
            botonAnotarse.style.display = "none"; //si la materia está aprobada, no se puede cursar o está regular, no muestra el botón para anotarse
        } else {
            botonAnotarse.style.display = "block";
            botonAnotarse.innerHTML = cursando.has(m.codigo)
                ? '<i class="fa-solid fa-ban"></i>' //botón desinscribirse si está en curso
                : '<i class="fa-regular fa-pen-to-square"></i>'; //o inscribirse si no
            botonAnotarse.title = cursando.has(m.codigo)
                ? "Abandonar" //mensajes diferentes para cada caso arriba descrito
                : "Anotarse";
        }

        /*este bloque habilita el boton de anotarse/abandonar de acuerdo al estado de la materia*/ 
        const iconoAnotarse = elemento.querySelector(".icono-anotarse");
        if (iconoAnotarse) {
            if (elemento.classList.contains("disponible")) {
                iconoAnotarse.classList.add("anotarse");
                iconoAnotarse.classList.remove("abandonar");
            } else if (elemento.classList.contains("cursando")) {
                iconoAnotarse.classList.add("abandonar");
                iconoAnotarse.classList.remove("anotarse");
            } else {
                iconoAnotarse.classList.remove("anotarse", "abandonar");
            }
        }
    });
}

// esta función cambia el estado de una materia onclick
function toggleEstado(codigo) {
    const materia = materias.find(m => m.codigo === codigo);

    /* Si la materia está aprobada, para a disponible o bloqueada segun corresponda*/
    if (aprobadas.has(codigo)) {
        aprobadas.delete(codigo);
    } else if (cursando.has(codigo)) { // si la materia está en curso
        if (materia.semestre === 0) { // y es del ingreso
            aprobadas.add(codigo);
            cursando.delete(codigo); //pasa a aprobada
        } else {
            regulares.add(codigo); // si no es del ingreso pasa a regular
            cursando.delete(codigo);
        }
    } else {
        regulares.delete(codigo); // otro caso (está regular) pasa a aprobada
        aprobadas.add(codigo);
    }

    guardarProgreso();
    actualizarEstado();
}

// cambia el estado de la materia cuando se toca en anotarse/abandonar
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

    //carga el plan de estudios de la carrera seleccionada --> debe coincidir con el value de la lista del html, que debe coincidir con el nombre del archivo
    fetch(`carreras/${nombreCarrera}.json`)
        .then(res => res.json())
        .then(data => {
            materias = data;

            // limpiar antes de redibujar
            const contenedor = document.getElementById("contenedor-semestres");
            contenedor.innerHTML = "";

            cargarProgreso();

            const grupos = {};
            materias.forEach(m => {
                if (!grupos[m.semestre]) grupos[m.semestre] = [];
                grupos[m.semestre].push(m);
            });

            Object.keys(grupos).sort((a, b) => a - b).forEach(sem => {
                // crea las columnas de semestres
                const columna = document.createElement("div");
                columna.className = "columna-semestre";

                grupos[sem].forEach(m => {
                    // crea las tarjetas de materias
                    const div = document.createElement("div");
                    div.id = m.codigo;
                    div.className = "materia";

                    const asignatura = document.createElement("div");
                    asignatura.classList.add("nombre-materia");

                    const nombre = document.createElement("span");
                    nombre.innerText = m.nombre;
                    nombre.onclick = () => toggleEstado(m.codigo);

                    asignatura.appendChild(nombre);
                    div.appendChild(asignatura);

                    const botonAnotarse = document.createElement("div");
                    botonAnotarse.className = "icono-anotarse";
                    botonAnotarse.onclick = e => {
                        e.stopPropagation();
                        toggleCursando(m.codigo);
                    };
                    div.appendChild(botonAnotarse);

                    // este bloque es el desplegable abajo de cada tarjeta que permite clickear para ver el programa de la materia
                    if (m.programa_url) {
                        const icono = document.createElement("a");
                        icono.href = m.programa_url;
                        icono.target = "_blank";
                        icono.className = "icono-flotante fa-regular fa-file";
                        icono.title = "Ver programa";
                        div.appendChild(icono);
                    }

                    columna.appendChild(div);
                });

                contenedor.appendChild(columna);
            });

            actualizarEstado();
        })
        .catch(err => console.error("Error cargando materias:", err));
}

/* Listener del selector */
document.getElementById("carrera").addEventListener("change", e => {
    cargarCarrera(e.target.value);
});

/* Inicial */
cargarCarrera(carreraActual);
