// =============================================================================
// GESTOR DE TAREAS — script.js
// =============================================================================
// Todo el código vive dentro de $(document).ready() para garantizar que el
// navegador haya terminado de construir el HTML antes de que empecemos a
// manipularlo. Si intentáramos tocar el DOM antes de que exista, jQuery
// devolvería elementos vacíos y nada funcionaría.
// =============================================================================

$(document).ready(function () {

  // ---------------------------------------------------------------------------
  // ICONOS SVG
  // ---------------------------------------------------------------------------
  // Los tres iconos (editar, borrar, calendario) se definen aquí arriba como
  // strings de texto con el código SVG dentro. La razón es sencilla: los usamos
  // cada vez que creamos una tarea y, si los escribiéramos directamente en la
  // función, repetiríamos el mismo bloque de código decenas de veces.
  // Así, si mañana quiero cambiar el icono de editar, solo lo toco en un sitio.
  // ---------------------------------------------------------------------------
  const iconEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const iconDelete = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconCalendar = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;


  // ---------------------------------------------------------------------------
  // VARIABLES DE ESTADO GLOBAL
  // ---------------------------------------------------------------------------
  // Estas variables actúan como la "memoria a corto plazo" de la aplicación.
  // Mientras el usuario está editando una tarea, necesito recordar cuál es,
  // si estaba completada y cuándo se creó originalmente.
  //
  // La fecha de creación (editingTaskCreated) es especialmente importante:
  // si al guardar la edición perdiera ese timestamp, la tarea aparecería como
  // "recién creada" y saltaría al principio de la lista, desordenando todo.
  // ---------------------------------------------------------------------------
  let editingTaskId = null;         // ID de la tarea que estamos editando (null = modo creación)
  let editingTaskCompleted = false; // Estado del checkbox antes de editar
  let editingTaskCreated = null;    // Timestamp original de creación

  let sortDescending = true;   // true = más nuevas primero (orden por defecto)
  let currentPage = 1;         // Página actual de la paginación
  const tasksPerPage = 3;      // Cuántas tareas se muestran por "hoja" del cuaderno


  // ---------------------------------------------------------------------------
  // FUNCIÓN: saveTasks()
  // ---------------------------------------------------------------------------
  // Recorre todos los <li> del DOM y construye un array de objetos JavaScript,
  // que luego convierte a texto JSON y guarda en localStorage.
  //
  // ¿Por qué leer del DOM en lugar de mantener un array propio en memoria?
  // Porque el DOM es la fuente de verdad: contiene el estado real (completada o
  // no, texto actual, fecha...). Mantener dos fuentes sincronizadas es una fuente
  // habitual de errores cuando empiezas a trabajar con jQuery.
  //
  // localStorage es el almacenamiento permanente del navegador: los datos
  // sobreviven a cerrar la pestaña o el navegador, hasta que se borran explícitamente.
  // ---------------------------------------------------------------------------
  function saveTasks() {
    const tasks = [];
    $("#taskList li").each(function () {
      // La fecha la almacenamos en formato ISO (ej: "2026-03-29T15:30")
      // porque ese es el formato nativo del input type="datetime-local".
      // Lo guardamos en el atributo data-raw para poder recuperarlo sin conversión.
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
    // JSON.stringify convierte el array a un string de texto para guardarlo.
    localStorage.setItem("misTareas", JSON.stringify(tasks));
  }


  // ---------------------------------------------------------------------------
  // FUNCIÓN: loadTasks()
  // ---------------------------------------------------------------------------
  // Al arrancar la aplicación, recupera las tareas del localStorage y las dibuja.
  // Si no hay nada guardado, el operador || devuelve un array vacío "[]" como
  // valor por defecto, evitando errores al intentar parsear null.
  // Las ordenamos antes de renderizarlas para que aparezcan ya en su posición.
  // ---------------------------------------------------------------------------
  function loadTasks() {
    let saved = JSON.parse(localStorage.getItem("misTareas") || "[]");
    reorderData(saved);  // Ordena el array antes de pintarlo
    saved.forEach((t) =>
      renderTask(t.title, t.desc, t.date, t.completed, t.id, t.createdAt, true)
    );
    updateCounter(); // Actualiza el contador y la barra de progreso
  }


  // ---------------------------------------------------------------------------
  // FUNCIÓN: reorderData(arr)
  // ---------------------------------------------------------------------------
  // Ordena un array de objetos de tarea por su timestamp de creación (createdAt).
  // El método sort() acepta una función comparadora: si devuelve un número
  // negativo, "a" va antes; si es positivo, "b" va antes.
  // Dependiendo de sortDescending, invertimos quién resta a quién.
  // Esta función modifica el array original directamente (in-place), no devuelve uno nuevo.
  // ---------------------------------------------------------------------------
  function reorderData(arr) {
    arr.sort((a, b) =>
      sortDescending ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
  }


  // ---------------------------------------------------------------------------
  // FUNCIÓN: updateCounter()
  // ---------------------------------------------------------------------------
  // Es el "cerebro visual" de la app: cada vez que algo cambia (se añade una
  // tarea, se borra, se tacha...) llamamos a esta función para que todos los
  // indicadores reflejen el estado real.
  //
  // Hace tres cosas:
  //   1. Cuenta tareas totales, completadas y pendientes
  //   2. Actualiza el texto del contador y la barra de progreso
  //   3. Reaaplica el filtro activo (para que el conteo cuadre con lo que se ve)
  //
  // El truco del plural ("pendiente" vs "pendientes") evita que salga el
  // horrible "1 pendientes" que demuestra que la app no fue pensada con cuidado.
  // ---------------------------------------------------------------------------
  function updateCounter() {
    const total = $("#taskList li").length;
    const completed = $("#taskList li.completed").length;
    const pending = total - completed;
    const percent = total > 0 ? (completed / total) * 100 : 0;

    $("#taskCount").text(`${pending} pendiente${pending !== 1 ? "s" : ""}`);
    $("#progressBar").css("width", percent + "%");

    // Después de actualizar los datos, reaplicamos el filtro activo para que
    // la lista y el contador estén siempre sincronizados.
    const activeFilter = $(".filter-btn.active").data("filter") || "all";
    applyFilter(activeFilter);
  }


  // ---------------------------------------------------------------------------
  // EVENTO: Clic en botones de filtro (Todas / Pendientes / Hechas)
  // ---------------------------------------------------------------------------
  // Usamos $(document).on() en lugar de $(".filter-btn").click() para aplicar
  // delegación de eventos. Esto significa que el listener se pone en el
  // documento, que siempre existe, y "escucha" los clics que suban desde
  // elementos hijos que coincidan con el selector.
  //
  // En este caso concreto los botones de filtro son estáticos, pero es una
  // buena práctica que evita problemas cuando los elementos se crean dinámicamente.
  //
  // stopPropagation() evita que el clic "burbujee" hacia arriba y active otros
  // listeners accidentalmente.
  // ---------------------------------------------------------------------------
  $(document).on("click", ".filter-btn", function (e) {
    e.preventDefault();
    e.stopPropagation();

    $(".filter-btn").removeClass("active");
    $(this).addClass("active");

    const activeFilter = $(".filter-btn.active").data("filter") || "all";
    applyFilter(activeFilter);

    console.log("Filtrando por:", filter); // Útil para depurar en la consola del navegador
  });


  // ---------------------------------------------------------------------------
  // FUNCIÓN: applyFilter(filter)
  // ---------------------------------------------------------------------------
  // Decide qué tareas se ven y cuáles no, según el filtro seleccionado.
  //
  // La clave del diseño aquí es que usamos una clase CSS específica
  // ("is-hidden-by-filter") en lugar de llamar a hide() directamente.
  // Esto nos permite que la lógica de paginación pueda distinguir entre
  // "esta tarea no existe en esta página" y "esta tarea existe pero el filtro
  // la está ocultando". Sin esa separación, la paginación contaría mal.
  //
  // Al cambiar de filtro, siempre volvemos a la página 1 para evitar
  // quedarnos en una página que ya no existe con el nuevo filtro aplicado.
  // ---------------------------------------------------------------------------
  function applyFilter(filter) {
    $("#taskList li").each(function () {
      const isComp = $(this).hasClass("completed");

      if (filter === "all") {
        $(this).removeClass("is-hidden-by-filter");
      } else if (filter === "pending") {
        isComp ? $(this).addClass("is-hidden-by-filter") : $(this).removeClass("is-hidden-by-filter");
      } else if (filter === "completed") {
        isComp ? $(this).removeClass("is-hidden-by-filter") : $(this).addClass("is-hidden-by-filter");
      }
    });

    currentPage = 1;
    updatePagination();
  }


  // ---------------------------------------------------------------------------
  // FUNCIÓN: renderTask(...)
  // ---------------------------------------------------------------------------
  // Es la función más importante del proyecto: construye el HTML de una tarea
  // y la inserta en la lista. Recibe todos los datos como parámetros.
  //
  // Parámetros:
  //   title      → Título de la tarea
  //   desc       → Descripción (puede estar vacía)
  //   date       → Fecha en formato ISO ("2026-03-29T15:30") o vacía
  //   completed  → Boolean: ¿está completada?
  //   id         → Identificador único (usamos Date.now() para generarlo)
  //   createdAt  → Timestamp de creación (para el ordenado)
  //   isLoading  → true si viene de localStorage, false si es nueva o editada
  //
  // Conversión de fecha: el input devuelve "2026-03-29T15:30" (formato máquina),
  // pero al usuario le enseñamos "29/03/26 - 15:30" (formato humano).
  // Guardamos el formato máquina en data-raw y mostramos el humano en pantalla.
  //
  // La lógica de inserción al final es importante:
  //   - Si estamos editando, reemplazamos el <li> existente en su lugar (replaceWith).
  //   - Si es nueva o se está cargando, simplemente la añadimos al final con append().
  //   El reordenado del DOM lo gestiona la función del botón "Guardar" después.
  // ---------------------------------------------------------------------------
  function renderTask(title, desc, date, completed, id, createdAt, isLoading = false) {

    let fechaVisual = "";
    if (date && date.includes('T')) {
      const [fecha, hora] = date.split('T');
      const [y, m, d] = fecha.split('-');
      const añoCorto = y.slice(-2); // Solo los 2 últimos dígitos del año (ej: "26")
      fechaVisual = `${d}/${m}/${añoCorto} - ${hora}`;
    }

    // Template literal: construimos el HTML completo de la tarea como un string.
    // Los ternarios (?:) permiten omitir la descripción y la fecha si están vacías,
    // evitando que queden etiquetas <p> o <span> vacías en el DOM.
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
      // Modo edición: sustituye el <li> viejo por el nuevo en el mismo lugar
      $(`li[data-id="${id}"]`).replaceWith(html);
    } else {
      // Modo creación / carga inicial: añade al final de la lista
      $("#taskList").append(html);
    }
  }


  // ---------------------------------------------------------------------------
  // EVENTO: Botón "Guardar Tarea" / "Actualizar Tarea"
  // ---------------------------------------------------------------------------
  // Este botón tiene dos modos de funcionamiento según el contexto:
  //
  //   MODO CREACIÓN (editingTaskId === null):
  //     Genera un nuevo ID con Date.now() (millisegundos desde 1970, siempre único),
  //     renderiza la tarea, y la reordena visualmente en la lista.
  //
  //   MODO EDICIÓN (editingTaskId tiene un valor):
  //     Reutiliza el ID y el timestamp originales para no perder la posición
  //     en la lista ni el historial de la tarea.
  //
  // En ambos casos, al terminar:
  //   - Se limpia el formulario
  //   - Se resetean las variables de estado de edición
  //   - Se actualiza el contador
  //   - Se guarda en localStorage
  // ---------------------------------------------------------------------------
  $("#addTask").click(function () {
    const title = $("#taskTitle").val().trim();
    const desc = $("#taskDesc").val().trim();
    const date = $("#taskDate").val();

    if (title !== "") {
      const id = editingTaskId ? editingTaskId : Date.now();
      const createdAt = editingTaskId ? editingTaskCreated : Date.now();
      const isCompleted = editingTaskId ? editingTaskCompleted : false;

      renderTask(title, desc, date, isCompleted, id, createdAt);

      // Solo reordenamos si es una tarea nueva, no en ediciones.
      // En edición, replaceWith() ya la dejó en su sitio correcto.
      if (!editingTaskId) {
        const list = $("#taskList");
        const items = list.children("li").get(); // .get() convierte jQuery en array nativo
        items.sort((a, b) => {
          const timeA = $(a).data("created");
          const timeB = $(b).data("created");
          return sortDescending ? timeB - timeA : timeA - timeB;
        });
        list.append(items); // Reinserta todos los elementos en el nuevo orden
      }

      // Limpieza del formulario y reset del estado de edición
      $("#taskTitle, #taskDesc, #taskDate").val("");
      $("#addTask").text("Guardar Tarea").css("background", ""); // Restaura el color original del botón
      editingTaskId = null;
      editingTaskCompleted = false;
      editingTaskCreated = null;

      updateCounter();
      saveTasks();
    }
  });


  // ---------------------------------------------------------------------------
  // EVENTO: Botón editar (icono lápiz)
  // ---------------------------------------------------------------------------
  // Al pulsar el lápiz, rellenamos el formulario con los datos de esa tarea
  // y guardamos en las variables de estado que "estamos editando esta".
  //
  // stopPropagation() es fundamental aquí: sin él, el clic llegaría también
  // al <li> padre y marcaría la tarea como completada involuntariamente.
  //
  // La fecha la recuperamos desde data-raw (formato ISO) para que el input
  // type="datetime-local" pueda interpretarla correctamente.
  //
  // Cambiamos el texto y color del botón guardar a "Actualizar" para que el
  // usuario sepa que está en modo edición y no en modo creación.
  // ---------------------------------------------------------------------------
  $(document).on("click", ".edit-btn", function (e) {
    e.stopPropagation();

    const li = $(this).closest("li"); // Sube hasta el <li> que contiene este botón
    editingTaskId = li.data("id");
    editingTaskCreated = li.data("created");
    editingTaskCompleted = li.hasClass("completed");

    $("#taskTitle").val(li.find("strong").text());
    $("#taskDesc").val(li.find("p").text());

    const fechaOriginal = li.find(".task-date-text").data("raw");
    if (fechaOriginal) {
      $("#taskDate").val(fechaOriginal);
    }

    // Feedback visual: el botón se vuelve verde para indicar el modo edición
    $("#addTask").text("Actualizar Tarea").css("background", "#10b981");
    $("#taskTitle").focus(); // Lleva el cursor al campo de título automáticamente
  });


  // ---------------------------------------------------------------------------
  // EVENTO: Botón borrar (icono papelera)
  // ---------------------------------------------------------------------------
  // Antes de borrar, hacemos un fadeOut() de 200ms para suavizar la desaparición.
  // El remove() va dentro del callback de fadeOut: así esperamos a que la
  // animación termine antes de eliminar el elemento del DOM.
  // Si lo borráramos directamente, el elemento desaparecería de golpe.
  // ---------------------------------------------------------------------------
  $(document).on("click", ".delete-btn", function (e) {
    e.stopPropagation(); // Evita que el clic llegue al <li> y lo marque como completado
    $(this)
      .closest("li")
      .fadeOut(200, function () {
        $(this).remove();
        updateCounter();
        saveTasks();
      });
  });


  // ---------------------------------------------------------------------------
  // EVENTO: Clic en el cuerpo de una tarea (marcar como completada)
  // ---------------------------------------------------------------------------
  // Al hacer clic en cualquier parte del <li>, la tarea se tacha o se destaca.
  // La condición "if (!$(e.target).closest('.actions').length)" comprueba que
  // el clic NO viene de dentro del div .actions (donde están los botones).
  // Así evitamos que editar o borrar también marque la tarea como completada.
  //
  // toggleClass() es la forma más limpia de alternar una clase CSS:
  // si la tiene, la quita; si no la tiene, la añade.
  // ---------------------------------------------------------------------------
  $(document).on("click", "li", function (e) {
    if (!$(e.target).closest(".actions").length) {
      $(this).toggleClass("completed");
      updateCounter();
      saveTasks();
    }
  });


  // ---------------------------------------------------------------------------
  // EVENTO: Botón ordenar (Más nuevas / Más antiguas)
  // ---------------------------------------------------------------------------
  // Alterna el criterio de orden y reordena el DOM al momento.
  // El proceso es: cogemos los <li> como array nativo con .get(), los ordenamos
  // con el método sort() nativo de JavaScript, y los reinsertamos todos en la
  // lista con append(). jQuery es inteligente y mueve los elementos existentes,
  // no los duplica.
  // ---------------------------------------------------------------------------
  $("#sortTasks").click(function () {
    sortDescending = !sortDescending; // Alterna entre true y false
    $("#sortLabel").text(sortDescending ? "Más nuevas" : "Más antiguas");

    const list = $("#taskList");
    const items = list.children("li").get(); // Array nativo de elementos DOM
    items.sort((a, b) => {
      const timeA = $(a).data("created");
      const timeB = $(b).data("created");
      return sortDescending ? timeB - timeA : timeA - timeB;
    });
    list.empty().append(items); // Vaciamos y rellenamos en el nuevo orden
    saveTasks();
    updateCounter();
  });


  // ---------------------------------------------------------------------------
  // EVENTO: Atajo de teclado — tecla Enter
  // ---------------------------------------------------------------------------
  // Permite guardar la tarea pulsando Enter desde cualquier campo del formulario,
  // lo que da una experiencia más ágil sin tener que usar el ratón.
  //
  // La excepción es el textarea con Shift+Enter: ese combo debe insertir un
  // salto de línea en la descripción, no guardar la tarea.
  // e.which == 13 es el código de la tecla Enter.
  // ---------------------------------------------------------------------------
  $("#taskTitle, #taskDesc, #taskDate").keypress(function (e) {
    if (e.which == 13) {
      if (this.id === "taskDesc" && e.shiftKey) {
        return; // Shift+Enter en la descripción → salto de línea, no guardamos
      }
      e.preventDefault(); // Evita el comportamiento por defecto (envío de formulario)
      $("#addTask").click(); // Simula un clic en el botón guardar
    }
  });


  // ---------------------------------------------------------------------------
  // FUNCIÓN: updatePagination()
  // ---------------------------------------------------------------------------
  // Gestiona qué tareas se muestran según la página actual, respetando también
  // el filtro activo. El flujo es:
  //
  //   1. Calculamos cuántas tareas son "visibles" (las que el filtro no ocultó)
  //   2. Ocultamos TODAS con "is-hidden-by-pagination"
  //   3. Con slice(), extraemos el "trozo" que corresponde a esta página
  //      y les quitamos esa clase para que vuelvan a verse
  //   4. Actualizamos el texto de "Página X de Y" y los botones anterior/siguiente
  //   5. Actualizamos el atributo data-page del cuaderno, que el CSS usa para
  //      mostrar la pestaña lateral ("PAG 1", "PAG 2"...) con el pseudo-elemento ::after
  //
  // La separación entre "oculto por filtro" y "oculto por paginación" es clave:
  // una tarea puede estar oculta por ambas razones a la vez, y necesitamos
  // distinguirlo para que el conteo sea correcto.
  // ---------------------------------------------------------------------------
  function updatePagination() {
    const visibleTasks = $("#taskList li").not(".is-hidden-by-filter");

    const numTotal = visibleTasks.length;
    const totalPages = Math.ceil(numTotal / tasksPerPage) || 1; // Mínimo 1 página siempre

    // Corrección: si tras borrar tareas la página actual ya no existe, volvemos a la última
    if (currentPage > totalPages) currentPage = totalPages;

    // Paso 1: ocultamos todo por paginación
    $("#taskList li").addClass("is-hidden-by-pagination");

    // Paso 2: calculamos el rango y mostramos solo ese slice
    const start = (currentPage - 1) * tasksPerPage;
    const end = start + tasksPerPage;
    visibleTasks.slice(start, end).removeClass("is-hidden-by-pagination");

    // Paso 3: actualizamos la UI de navegación
    $("#pageInfo").text(`Página ${currentPage} de ${totalPages}`);
    $("#prevPage").prop("disabled", currentPage === 1);
    $("#nextPage").prop("disabled", currentPage === totalPages);

    // Paso 4: el atributo data-page lo lee el CSS con attr() en el ::after del cuaderno
    $(".notebook-view").attr("data-page", currentPage);
  }


  // ---------------------------------------------------------------------------
  // EVENTO: Botón "Cargar Demos"
  // ---------------------------------------------------------------------------
  // Inserta 5 tareas de ejemplo para poder probar la app sin tener que escribir.
  // El truco del "+ index" en el ID y en createdAt garantiza que cada demo tenga
  // un timestamp diferente, evitando que todas tengan el mismo orden.
  // ---------------------------------------------------------------------------
  $("#loadDemos").click(function () {
    const demos = [
      { t: "Comprar suministros", d: "Papel, tinta y grapas.", dt: "2026-04-10T10:00", c: true },
      { t: "Tarea muy larga de prueba", d: "Este texto ocupa varios renglones del cuaderno para verificar el tachado.", dt: "2026-04-11T12:00", c: false },
      { t: "Gimnasio", d: "Día de pierna.", dt: "", c: true },
      { t: "Enviar informe", d: "Revisar los KPIs antes de mandar el PDF.", dt: "2026-04-15T09:00", c: false },
      { t: "Reparar la bici", d: "Ajustar frenos.", dt: "", c: false }
    ];

    demos.forEach((task, index) => {
      const id = Date.now() + index; // +index evita IDs duplicados si Date.now() coincide
      renderTask(task.t, task.d, task.dt, task.c, id, id);
    });

    updateCounter();
    saveTasks();
  });


  // ---------------------------------------------------------------------------
  // EVENTOS: Navegación entre páginas
  // ---------------------------------------------------------------------------
  // Al avanzar o retroceder de página, simplemente incrementamos o decrementamos
  // currentPage y llamamos a updatePagination() para que recalcule todo.
  // Los botones se deshabilitan solos cuando llegamos a los extremos.
  // ---------------------------------------------------------------------------
  $(document).on("click", "#nextPage", function () {
    currentPage++;
    updatePagination();
  });

  $(document).on("click", "#prevPage", function () {
    currentPage--;
    updatePagination();
  });


  // ---------------------------------------------------------------------------
  // EVENTO: Botón "Borrar Todo"
  // ---------------------------------------------------------------------------
  // La función confirm() muestra un cuadro de diálogo nativo del navegador.
  // Es una solución sencilla para proteger contra borrados accidentales.
  // Si el usuario confirma, vaciamos la lista y limpiamos el localStorage.
  // ---------------------------------------------------------------------------
  $("#clearAll").click(function () {
    if (confirm("¿Borrar todo?")) {
      $("#taskList").empty(); // Elimina todos los <li> del DOM
      updateCounter();
      saveTasks(); // Guarda el array vacío, borrando lo que había
    }
  });


  // ---------------------------------------------------------------------------
  // MODO OSCURO
  // ---------------------------------------------------------------------------
  // Al pulsar el botón, añadimos o quitamos la clase "dark" del <body>.
  // Todo el aspecto visual del modo oscuro está controlado en el CSS mediante
  // el selector "body.dark": cuando esa clase existe, las variables CSS cambian
  // (fondo oscuro, textos claros...) y todo se adapta automáticamente.
  //
  // Guardamos la preferencia en localStorage para que se recuerde entre visitas.
  // Al cargar la página, leemos ese valor y aplicamos la clase si corresponde.
  // ---------------------------------------------------------------------------
  $(document).ready(function() {
    // Al arrancar, comprobamos si el usuario ya había elegido el modo oscuro
    if (localStorage.getItem("theme") === "dark") {
        $("body").addClass("dark");
    }

    $("#toggleDark").click(function() {
        $("body").toggleClass("dark");

        // Guardamos la preferencia: "dark" o "light"
        if ($("body").hasClass("dark")) {
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }
    });
  });


  // ---------------------------------------------------------------------------
  // ARRANQUE DE LA APLICACIÓN
  // ---------------------------------------------------------------------------
  // Esta es la última línea que se ejecuta: carga las tareas guardadas.
  // En este punto todos los listeners ya están registrados, así que todo
  // funciona correctamente desde el primer instante.
  // ---------------------------------------------------------------------------
  loadTasks();
});