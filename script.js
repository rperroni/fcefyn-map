let materias = [];
let aprobadas = new Set();
let cursando = new Set(); // nuevo set
let regulares = new Set();

function cargarProgreso() {
    const data = localStorage.getItem("aprobadas");
    if (data) {
        aprobadas = new Set(JSON.parse(data));
    }
    const dataCursando = localStorage.getItem("cursando");
    if (dataCursando) cursando = new Set(JSON.parse(dataCursando));
    const dataRegulares = localStorage.getItem("regulares");
    if (dataRegulares) regulares = new Set(JSON.parse(dataRegulares));
}

function guardarProgreso() {
    localStorage.setItem("aprobadas", JSON.stringify([...aprobadas]));
    localStorage.setItem("cursando", JSON.stringify([...cursando]));
    localStorage.setItem("regulares", JSON.stringify([...regulares]));
}

function actualizarEstado() {
    materias.forEach(m => {
        const elemento = document.getElementById(m.codigo);
        const rtfAdeudados = materias
                .filter(x => !aprobadas.has(x.codigo))
                .reduce((total, x) => total + (x.RTF || 0), 0);

        let puedeCursar;

        if (m.codigo === "ingles"){
            //modulo de ingles requiere 10 asignaturas aprobadas (+3 del ingreso)
            puedeCursar = aprobadas.size > 13;
        }else if (m.codigo === "PPS"){
            // Práctica profesional supervisada: requiere adeudar <= 100 RTF
            puedeCursar = rtfAdeudados <= 100;
        } else if (m.codigo === "PI") { 
            // Proyecto integrador: requiere adeudar <= 50 RTF
            puedeCursar = rtfAdeudados <= 50;
        } else {
            // Caso normal: requiere correlativas aprobadas
            puedeCursar = m.correlativas.every(c => aprobadas.has(c) || regulares.has(c));
        }
        //const puedeCursar = m.correlativas.every(c => aprobadas.has(c));

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

         // Actualizar tooltip del nombre
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

        // Mostrar/ocultar botón de anotarse
        const botonAnotarse = elemento.querySelector(".icono-anotarse");
        if (aprobadas.has(m.codigo) || (!puedeCursar) || regulares.has(m.codigo)) {
            botonAnotarse.style.display = "none";
        } else {
            botonAnotarse.style.display = "block"; // mostrar en cursando o disponible
            botonAnotarse.innerHTML = cursando.has(m.codigo) 
                ? '<i class="fa-solid fa-ban"></i>'  // desanotarse
                : '<i class="fa-regular fa-pen-to-square"></i>';       // normal
            botonAnotarse.title = cursando.has(m.codigo) 
                ? "Abandonar"  // tachado
                : "Anotarse";       // normal
        }

        const iconoAnotarse = elemento.querySelector(".icono-anotarse");
        if (iconoAnotarse) {
            if (elemento.classList.contains("disponible")) {
                iconoAnotarse.classList.add("anotarse");
                iconoAnotarse.classList.remove("desanotarse");
            } else if (elemento.classList.contains("cursando")) {
                iconoAnotarse.classList.add("desanotarse");
                iconoAnotarse.classList.remove("anotarse");
            } else {
                iconoAnotarse.classList.remove("anotarse", "desanotarse");
            }
        }
    });
}

function toggleAprobada(codigo) {
    const materia = materias.find(m => m.codigo === codigo);

    if (aprobadas.has(codigo)) {
        aprobadas.delete(codigo);
    } else if (cursando.has(codigo)) {
        if (materia.semestre === 0) {
            // Semestre 0: ir directo a aprobada
            aprobadas.add(codigo);
            cursando.delete(codigo);
        } else {
            // Semestres normales: pasar a regular
            regulares.add(codigo);
            cursando.delete(codigo);
        }
    } else { /* está regular */
        regulares.delete(codigo);
        aprobadas.add(codigo);
    }

    guardarProgreso();
    actualizarEstado();
}

function toggleCursando(codigo) {
    if (cursando.has(codigo)) {
        cursando.delete(codigo);
    } else {
        cursando.add(codigo);
    }
    guardarProgreso();
    actualizarEstado();
}


fetch("materias.json")
    .then(res => res.json())
    .then(data => {
        materias = data;
        cargarProgreso();

        const contenedor = document.getElementById("contenedor-semestres");

        // Agrupar por semestre
        const grupos = {};
        materias.forEach(m => {
            if (!grupos[m.semestre]) grupos[m.semestre] = [];
            grupos[m.semestre].push(m);
        });

        // Ordenar semestres y crear columnas
        Object.keys(grupos).sort((a, b) => a - b).forEach(sem => {
            const columna = document.createElement("div");
            columna.className = "columna-semestre";

            grupos[sem].forEach(m => {
                const div = document.createElement("div");
                div.id = m.codigo;
                div.className = "materia";

                // Nombre
                const asignatura = document.createElement("div");
                asignatura.classList.add("nombre-materia");

                const nombre = document.createElement("span");
                nombre.innerText = m.nombre;
                nombre.onclick = () => toggleAprobada(m.codigo);

                asignatura.appendChild(nombre);
                div.appendChild(asignatura);

                // Botón anotarse
                const botonAnotarse = document.createElement("div");
                botonAnotarse.className = "icono-anotarse";
                botonAnotarse.onclick = e => {
                    e.stopPropagation(); // no aprobar/desaprobar al hacer click en el ícono
                    toggleCursando(m.codigo);
                };
                div.appendChild(botonAnotarse);

                // Icono programa
                if (m.programa_url) {
                    const icono = document.createElement("a");
                    icono.href = m.programa_url;
                    icono.target = "_blank";
                    icono.className = "icono-flotante";
                    icono.title = "Ver programa";
                    icono.classList.add("fa-regular", "fa-file");
                    div.appendChild(icono);
                }

                columna.appendChild(div);
            });

            contenedor.appendChild(columna);
        });

        actualizarEstado();
    })
    .catch(err => console.error("Error cargando materias:", err));
