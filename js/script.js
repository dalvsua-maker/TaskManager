$(document).ready(function () {
  const iconEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const iconDelete = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconCalendar = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

  let editingTaskId = null;
  let editingTaskCompleted = false;
  let editingTaskCreated = null; // Guardamos la fecha de creación original
  let sortDescending = true;
let currentPage = 1;
const tasksPerPage = 3; // Ajusta este número según el tamaño de tu libreta
 function saveTasks() {
    const tasks = [];
    $("#taskList li").each(function () {
        // Buscamos el valor crudo guardado en el atributo data-raw
        const rawDate = $(this).find(".task-date-text").data("raw") || ""; 
        
        tasks.push({
            id: $(this).data("id"),
            createdAt: $(this).data("created"),
            title: $(this).find("strong").text(),
            desc: $(this).find("p").text(),
            date: rawDate, // Guardamos el formato ISO (ej: 2026-03-29T15:30)
            completed: $(this).hasClass("completed")
        });
    });
    localStorage.setItem("misTareas", JSON.stringify(tasks));
}


  function loadTasks() {
    let saved = JSON.parse(localStorage.getItem("misTareas") || "[]");
    // Ordenamos los datos antes de dibujarlos para que nazcan en su sitio
    reorderData(saved);
    saved.forEach((t) =>
      renderTask(t.title, t.desc, t.date, t.completed, t.id, t.createdAt, true),
    );
    updateCounter();
  }

  function reorderData(arr) {
    arr.sort((a, b) =>
      sortDescending ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );
  }

  function updateCounter() {
    const total = $("#taskList li").length;
    const completed = $("#taskList li.completed").length;
    const pending = total - completed;
    const percent = total > 0 ? (completed / total) * 100 : 0;

    $("#taskCount").text(`${pending} pendiente${pending !== 1 ? "s" : ""}`);
    $("#progressBar").css("width", percent + "%");
   // IMPORTANTE: Refrescar el filtro tras cualquier cambio (borrar, tachar, editar)
    const activeFilter = $(".filter-btn.active").data("filter") || "all";
    applyFilter(activeFilter);
  }
  // Usamos $(document).on para que el evento no se pierda nunca
  $(document).on("click", ".filter-btn", function (e) {
    e.preventDefault();
    e.stopPropagation();

    // 1. UI: Cambiar botón activo
    $(".filter-btn").removeClass("active");
    $(this).addClass("active");

       // Refrescar el filtro activo (esto a su vez llamará a la paginación)
    const activeFilter = $(".filter-btn.active").data("filter") || "all";
    applyFilter(activeFilter);

    console.log("Filtrando por:", filter); // Esto te servirá para ver en consola si clica
  });

  // Asegúrate de que la función applyFilter sea exactamente así:
// 1. EL FILTRO: Marca qué tareas son aptas para verse
function applyFilter(filter) {
    $("#taskList li").each(function() {
        const isComp = $(this).hasClass("completed");
        
        // En lugar de hide/show, usamos una clase especial de "Filtro"
        if (filter === "all") {
            $(this).removeClass("is-hidden-by-filter");
        } else if (filter === "pending") {
            isComp ? $(this).addClass("is-hidden-by-filter") : $(this).removeClass("is-hidden-by-filter");
        } else if (filter === "completed") {
            isComp ? $(this).removeClass("is-hidden-by-filter") : $(this).addClass("is-hidden-by-filter");
        }
    });

    // IMPORTANTE: Cada vez que filtramos, volvemos a la página 1 y recalculamos
    currentPage = 1;
    updatePagination(); 
}


  function renderTask(
    title,
    desc,
    date,
    completed,
    id,
    createdAt,
    isLoading = false,
  ) {
  let fechaVisual = "";

if (date && date.includes('T')) {
    const [fecha, hora] = date.split('T'); // Separa fecha de hora
    const [y, m, d] = fecha.split('-');    // Separa año, mes, día
    const añoCorto = y.slice(-2);          // "26"
    fechaVisual = `${d}/${m}/${añoCorto} - ${hora}`; // Resultado: 29/03/26 - 15:30
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

    if (editingTaskId === id && !isLoading) {
      $(`li[data-id="${id}"]`).replaceWith(html);
    } else {
      // Al cargar o añadir, siempre al final del contenedor según el flujo de carga
      $("#taskList").append(html);
    }
  }

  $("#addTask").click(function () {
    const title = $("#taskTitle").val().trim();
    const desc = $("#taskDesc").val().trim();
    const date = $("#taskDate").val();

    if (title !== "") {
      const id = editingTaskId ? editingTaskId : Date.now();
      const createdAt = editingTaskId ? editingTaskCreated : Date.now();
      const isCompleted = editingTaskId ? editingTaskCompleted : false;

      renderTask(title, desc, date, isCompleted, id, createdAt);

      // Si era una tarea nueva, tenemos que reordenar visualmente la lista
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

      $("#taskTitle, #taskDesc, #taskDate").val("");
      $("#addTask").text("Guardar Tarea").css("background", "");
      editingTaskId = null;
      editingTaskCompleted = false;
      editingTaskCreated = null;

      updateCounter();
      saveTasks();
    }
  });

  $(document).on("click", ".edit-btn", function (e) {
    e.stopPropagation();
    const li = $(this).closest("li");
    editingTaskId = li.data("id");
    editingTaskCreated = li.data("created");
    editingTaskCompleted = li.hasClass("completed");

    $("#taskTitle").val(li.find("strong").text());
    $("#taskDesc").val(li.find("p").text());

    // Recuperamos la fecha original (yyyy-mm-dd) del atributo data-raw
    const fechaOriginal = li.find(".task-date-text").data("raw");
    if (fechaOriginal) {
        $("#taskDate").val(fechaOriginal);
    }
    $("#addTask").text("Actualizar Tarea").css("background", "#10b981");
    $("#taskTitle").focus();
  });

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

  $(document).on("click", "li", function (e) {
    if (!$(e.target).closest(".actions").length) {
      $(this).toggleClass("completed");
      updateCounter();
      saveTasks();
    }
  });

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
// Atajo de teclado: ENTER para Guardar o Actualizar
$("#taskTitle, #taskDesc, #taskDate").keypress(function (e) {
    // 13 es el código de la tecla Enter
    if (e.which == 13) {
        // Si es el textarea, permitimos Shift+Enter para saltos de línea
        if (this.id === "taskDesc" && e.shiftKey) {
            return; 
        }
        
        e.preventDefault(); // Evita que el formulario haga cosas raras
        $("#addTask").click(); // Ejecuta la función de guardado/actualización
    }
});
// 2. LA PAGINACIÓN: Solo reparte en hojas las tareas que pasaron el filtro
function updatePagination() {
    // Seleccionamos solo las que NO están ocultas por el filtro
    const visibleTasks = $("#taskList li").not(".is-hidden-by-filter");
    
    const numTotal = visibleTasks.length;
    const totalPages = Math.ceil(numTotal / tasksPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;

    // Ocultamos ABSOLUTAMENTE TODAS las tareas de la lista (por paginación)
    $("#taskList li").addClass("is-hidden-by-pagination");

    // De las que pasaron el filtro, mostramos solo el trozo (slice) de esta página
    const start = (currentPage - 1) * tasksPerPage;
    const end = start + tasksPerPage;
    
    visibleTasks.slice(start, end).removeClass("is-hidden-by-pagination");

    // Actualizar textos y botones
    $("#pageInfo").text(`Página ${currentPage} de ${totalPages}`);
    $("#prevPage").prop("disabled", currentPage === 1);
    $("#nextPage").prop("disabled", currentPage === totalPages);
    $(".notebook-view").attr("data-page", currentPage);
}

// Eventos de botones de página
$(document).on("click", "#nextPage", function() {
    currentPage++;
    updatePagination();
});

$(document).on("click", "#prevPage", function() {
    currentPage--;
    updatePagination();
});
  $("#clearAll").click(function () {
    if (confirm("¿Borrar todo?")) {
      $("#taskList").empty();
      updateCounter();
      saveTasks();
    }
  });

  loadTasks();
});
