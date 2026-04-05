// Espero a que el DOM esté completamente cargado antes de hacer nada.
// Todo el código va dentro de este bloque para no ejecutarse antes de tiempo.
$(document).ready(function () {

  // --- ICONOS SVG ---
  // Los guardo como strings aquí arriba para no repetirlos cada vez que
  // creo una tarea. Así si algún día cambio el icono, solo lo toco en un sitio.
  const iconEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const iconDelete = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconCalendar = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

  // --- ESTADO DE LA EDICIÓN ---
  // Cuando el usuario pulsa "editar", necesito recordar qué tarea estoy modificando.
  // Guardo su ID, si estaba completada, y su fecha de creación original.
  // Esto es importante: si no guardo createdAt, al guardar la edición
  // la tarea aparecería como "recién creada" y se iría al principio de la lista.
  let editingTaskId = null;
  let editingTaskCompleted = false;
  let editingTaskCreated = null;

  // true = más nuevas primero (orden por defecto)
  let sortDescending = true;

  // Paginación: arranco en la página 1 y muestro 3 tareas por hoja
  let currentPage = 1;
  const tasksPerPage = 3;


  // --- GUARDAR EN LOCALSTORAGE ---
  // Recorro toda la lista del DOM y construyo un array de objetos para guardarlo.
  // Es más fiable leer del DOM que mantener un array en memoria sincronizado,
  // especialmente cuando empiezas con jQuery y todavía no usas frameworks.
  function saveTasks() {
    const tasks = [];
    $("#taskList li").each(function () {
      // La fecha la guardo en formato ISO (ej: 2026-03-29T15:30) usando data-raw,
      // porque el input datetime-local trabaja con ese formato.
      const rawDate = $(this).find(".task-date-text").data("raw") || "";

      tasks.push({
        id: $(this).data("id"),
        createdAt: $(this).data("created"),
        title: $(this).find("strong").text(),
        desc: $(this).find("p").text(),
        date: rawDate,
        completed: $(this).hasClass("completed")
      });
    });
    localStorage.setItem("misTareas", JSON.stringify(tasks));
  }


  // --- CARGAR DESDE LOCALSTORAGE ---
  // Al abrir la página, recupero las tareas guardadas y las dibujo.
  // Las ordeno antes de renderizarlas para que aparezcan ya en su sitio.
  function loadTasks() {
    let saved = JSON.parse(localStorage.getItem("misTareas") || "[]");
    reorderData(saved);
    saved.forEach((t) =>
      renderTask(t.title, t.desc, t.date, t.completed, t.id, t.createdAt, true)
    );
    updateCounter();
  }


  // --- ORDENAR UN ARRAY DE TAREAS ---
  // Ordena por createdAt (timestamp). Dependiendo de sortDescending,
  // las nuevas van primero o las antiguas. Modifica el array directamente (in-place).
  function reorderData(arr) {
    arr.sort((a, b) =>
      sortDescending ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
  }


  // --- ACTUALIZAR CONTADOR Y BARRA DE PROGRESO ---
  // Esta función es el "cerebro visual": la llamo siempre que algo cambia
  // (añadir, borrar, tachar...) para que los números reflejen la realidad.
  function updateCounter() {
    const total = $("#taskList li").length;
    const completed = $("#taskList li.completed").length;
    const pending = total - completed;
    const percent = total > 0 ? (completed / total) * 100 : 0;

    // Manejo el plural de "pendiente" para que no quede raro con 1 tarea
    $("#taskCount").text(`${pending} pendiente${pending !== 1 ? "s" : ""}`);
    $("#progressBar").css("width", percent + "%");

    // Después de actualizar los datos, reaplicamos el filtro activo
    // para que la vista se actualice correctamente
    const activeFilter = $(".filter-btn.active").data("filter") || "all";
    applyFilter(activeFilter);
  }


  // --- CLICK EN LOS FILTROS (Todas / Pendientes / Hechas) ---
  // Uso $(document).on en lugar de $(".filter-btn").click para que funcione
  // aunque los botones se hayan añadido dinámicamente al DOM.
  $(document).on("click", ".filter-btn", function (e) {
    e.preventDefault();
    e.stopPropagation();

    // Cambio qué botón aparece como activo
    $(".filter-btn").removeClass("active");
    $(this).addClass("active");

    const activeFilter = $(".filter-btn.active").data("filter") || "all";
    applyFilter(activeFilter);

    console.log("Filtrando por:", filter); // Útil para depurar en la consola del navegador
  });


  // --- APLICAR FILTRO VISUAL ---
  // En vez de ocultar directamente con hide(), uso una clase CSS especial.
  // Así la paginación puede luego contar cuántas tareas "visibles" hay
  // sin confundirse con las que están ocultas por el filtro.
  function applyFilter(filter) {
    $("#taskList li").each(function () {
      const isComp = $(this).hasClass("completed");

      if (filter === "all") {
        $(this).removeClass("is-hidden-by-filter");
      } else if (filter === "pending") {
        // Si está completada, la ocultamos; si está pendiente, la mostramos
        isComp ? $(this).addClass("is-hidden-by-filter") : $(this).removeClass("is-hidden-by-filter");
      } else if (filter === "completed") {
        isComp ? $(this).removeClass("is-hidden-by-filter") : $(this).addClass("is-hidden-by-filter");
      }
    });

    // Al cambiar el filtro siempre volvemos a la página 1,
    // porque si estábamos en la página 3 y ahora hay menos tareas visibles, peta.
    currentPage = 1;
    updatePagination();
  }


  // --- DIBUJAR UNA TAREA EN EL DOM ---
  // Esta es la función principal. Crea el HTML de una tarea y lo inserta en la lista.
  // El parámetro isLoading me dice si estoy cargando desde localStorage (true)
  // o si es una tarea nueva/editada (false).
  function renderTask(title, desc, date, completed, id, createdAt, isLoading = false) {

    // Convierto la fecha del formato ISO (2026-03-29T15:30)
    // al formato legible (29/03/26 - 15:30) para mostrarlo al usuario
    let fechaVisual = "";
    if (date && date.includes('T')) {
      const [fecha, hora] = date.split('T');
      const [y, m, d] = fecha.split('-');
      const añoCorto = y.slice(-2); // Solo los 2 últimos dígitos del año
      fechaVisual = `${d}/${m}/${añoCorto} - ${hora}`;
    }

    const html = `
      <li data-id="${id}" data-created="${createdAt}" class="${completed ? "completed" : ""}">
        <div class="task-content">
          <strong>${title}</strong>
          ${desc ? `<p>${desc}</p>` : ""}
          ${date ? `<span class="task-date" style="...">
            ${iconCalendar} 
            <span class="task-date-text" data-raw="${date}">${fechaVisual}</span>
          </span>` : ""}
        </div>
        <div class="actions">
          <div class="btn-icon edit-btn">${iconEdit}</div>
          <div class="btn-icon delete-btn">${iconDelete}</div>
        </div>
      </li>
    `;

    // Si estoy editando, reemplazo el elemento existente en su posición.
    // Si es nueva o se está cargando, la añado al final (el orden lo gestiono después).
    if (editingTaskId === id && !isLoading) {
      $(`li[data-id="${id}"]`).replaceWith(html);
    } else {
      $("#taskList").append(html);
    }
  }


  // --- GUARDAR / ACTUALIZAR TAREA ---
  // Este botón hace dos cosas según el contexto:
  // Si editingTaskId está vacío → crea una tarea nueva
  // Si editingTaskId tiene valor → actualiza la existente
  $("#addTask").click(function () {
    const title = $("#taskTitle").val().trim();
    const desc = $("#taskDesc").val().trim();
    const date = $("#taskDate").val();

    if (title !== "") {
      // Si estamos editando, reutilizamos el ID y la fecha de creación original
      const id = editingTaskId ? editingTaskId : Date.now();
      const createdAt = editingTaskId ? editingTaskCreated : Date.now();
      const isCompleted = editingTaskId ? editingTaskCompleted : false;

      renderTask(title, desc, date, isCompleted, id, createdAt);

      // Si era una tarea NUEVA (no una edición), reordeno visualmente la lista
      // para que aparezca en el sitio que le corresponde según la fecha
      if (!editingTaskId) {
        const list = $("#taskList");
        const items = list.children("li").get();
        items.sort((a, b) => {
          const timeA = $(a).data("created");
          const timeB = $(b).data("created");
          return sortDescending ? timeB - timeA : timeA - timeB;
        });
        list.append(items);
      }

      // Limpio el formulario y reseteo el estado de edición
      $("#taskTitle, #taskDesc, #taskDate").val("");
      $("#addTask").text("Guardar Tarea").css("background", "");
      editingTaskId = null;
      editingTaskCompleted = false;
      editingTaskCreated = null;

      updateCounter();
      saveTasks();
    }
  });


  // --- BOTÓN EDITAR ---
  // Al pulsar el lápiz, relleno el formulario con los datos de esa tarea
  // y guardo en las variables de estado que "estoy editando esta tarea".
  $(document).on("click", ".edit-btn", function (e) {
    e.stopPropagation(); // Evito que el clic llegue al <li> y marque la tarea como completada

    const li = $(this).closest("li");
    editingTaskId = li.data("id");
    editingTaskCreated = li.data("created"); // Fundamental para no perder el orden
    editingTaskCompleted = li.hasClass("completed");

    $("#taskTitle").val(li.find("strong").text());
    $("#taskDesc").val(li.find("p").text());

    // Recupero la fecha en formato ISO desde data-raw para meterla en el input
    const fechaOriginal = li.find(".task-date-text").data("raw");
    if (fechaOriginal) {
      $("#taskDate").val(fechaOriginal);
    }

    // Cambio el botón a verde para que el usuario sepa que está editando
    $("#addTask").text("Actualizar Tarea").css("background", "#10b981");
    $("#taskTitle").focus();
  });


  // --- BOTÓN BORRAR ---
  // Hago un fadeOut antes de eliminar el elemento para que no desaparezca
  // de golpe. El remove() va dentro del callback para esperar a que acabe la animación.
  $(document).on("click", ".delete-btn", function (e) {
    e.stopPropagation();
    $(this)
      .closest("li")
      .fadeOut(200, function () {
        $(this).remove();
        updateCounter();
        saveTasks();
      });
  });


  // --- MARCAR TAREA COMO COMPLETADA ---
  // Al hacer clic en cualquier parte del <li> (excepto en los botones de acción)
  // la tarea se tacha o se destaca.
  $(document).on("click", "li", function (e) {
    // Compruebo que el clic no viene de dentro de .actions
    if (!$(e.target).closest(".actions").length) {
      $(this).toggleClass("completed");
      updateCounter();
      saveTasks();
    }
  });


  // --- BOTÓN ORDENAR ---
  // Alterna entre "más nuevas primero" y "más antiguas primero".
  // Coge los <li> del DOM, los ordena en memoria y los vuelve a insertar.
  $("#sortTasks").click(function () {
    sortDescending = !sortDescending;
    $("#sortLabel").text(sortDescending ? "Más nuevas" : "Más antiguas");

    const list = $("#taskList");
    const items = list.children("li").get();
    items.sort((a, b) => {
      const timeA = $(a).data("created");
      const timeB = $(b).data("created");
      return sortDescending ? timeB - timeA : timeA - timeB;
    });
    list.empty().append(items);
    saveTasks();
    updateCounter();
  });


  // --- ATAJO DE TECLADO: ENTER ---
  // Permite guardar la tarea pulsando Enter en cualquier campo del formulario.
  // La excepción es el textarea con Shift+Enter, que sirve para hacer saltos de línea.
  $("#taskTitle, #taskDesc, #taskDate").keypress(function (e) {
    if (e.which == 13) {
      if (this.id === "taskDesc" && e.shiftKey) {
        return; // Shift+Enter en la descripción → salto de línea, no guardamos
      }
      e.preventDefault();
      $("#addTask").click();
    }
  });


  // --- PAGINACIÓN ---
  // Esta función decide qué tareas son visibles en la página actual.
  // Primero ocultamos todas (por paginación), y luego solo mostramos
  // el "trozo" que corresponde a la página actual dentro de las que
  // pasaron el filtro activo.
  function updatePagination() {
    // Solo contamos las que el filtro no ha vetado
    const visibleTasks = $("#taskList li").not(".is-hidden-by-filter");

    const numTotal = visibleTasks.length;
    const totalPages = Math.ceil(numTotal / tasksPerPage) || 1;

    // Si borramos tareas y nos quedamos sin página, volvemos a la última disponible
    if (currentPage > totalPages) currentPage = totalPages;

    // Ocultamos todo primero (por paginación)
    $("#taskList li").addClass("is-hidden-by-pagination");

    // Luego mostramos solo el slice de esta página
    const start = (currentPage - 1) * tasksPerPage;
    const end = start + tasksPerPage;
    visibleTasks.slice(start, end).removeClass("is-hidden-by-pagination");

    // Actualizo el texto y los botones de navegación
    $("#pageInfo").text(`Página ${currentPage} de ${totalPages}`);
    $("#prevPage").prop("disabled", currentPage === 1);
    $("#nextPage").prop("disabled", currentPage === totalPages);

    // Esto actualiza la pestaña lateral del cuaderno (el ::after del CSS la lee)
    $(".notebook-view").attr("data-page", currentPage);
  }


  // --- BOTÓN CARGAR DEMOS ---
  // Carga 5 tareas de ejemplo para poder probar la app sin tener que escribir nada.
  // Uso un pequeño desfase en el timestamp (+ index) para que cada demo
  // tenga una fecha de creación distinta y el orden sea consistente.
  $("#loadDemos").click(function () {
    const demos = [
      { t: "Comprar suministros", d: "Papel, tinta y grapas.", dt: "2026-04-10T10:00", c: true },
      { t: "Tarea muy larga de prueba", d: "Este texto ocupa varios renglones del cuaderno para verificar el tachado.", dt: "2026-04-11T12:00", c: false },
      { t: "Gimnasio", d: "Día de pierna.", dt: "", c: true },
      { t: "Enviar informe", d: "Revisar los KPIs antes de mandar el PDF.", dt: "2026-04-15T09:00", c: false },
      { t: "Reparar la bici", d: "Ajustar frenos.", dt: "", c: false }
    ];

    demos.forEach((task, index) => {
      const id = Date.now() + index;
      renderTask(task.t, task.d, task.dt, task.c, id, id);
    });

    updateCounter();
    saveTasks();
  });


  // --- NAVEGACIÓN ENTRE PÁGINAS ---
  $(document).on("click", "#nextPage", function () {
    currentPage++;
    updatePagination();
  });

  $(document).on("click", "#prevPage", function () {
    currentPage--;
    updatePagination();
  });


  // --- BORRAR TODO ---
  // Pido confirmación antes para evitar borrados accidentales.
  $("#clearAll").click(function () {
    if (confirm("¿Borrar todo?")) {
      $("#taskList").empty();
      updateCounter();
      saveTasks();
    }
  });


  // --- INICIO ---
  // Lo último que hago es cargar las tareas guardadas.
  // Todo lo demás ya está escuchando cuando esto se ejecuta.
  loadTasks();
});