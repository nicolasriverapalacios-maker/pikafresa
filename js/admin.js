// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

const SUPABASE_URL =
    "https://qhhqiwhcbbnncnaonahc.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_iasGk-jqhvZFQLiRTPacqw_zNXpKtbO";

const supabaseAdmin =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// VARIABLES
// ==========================================

let vistaPedidosActual = "activos";

let pedidosHistorial = [];

let canalPedidos = null;

let audioContext = null;


// ==========================================
// SEGURIDAD HTML
// ==========================================

function escaparHTML(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ==========================================
// INICIAR SESIÓN
// ==========================================

async function iniciarSesion() {

    const email =
        document
            .getElementById("admin-email")
            .value
            .trim();

    const password =
        document
            .getElementById("admin-password")
            .value;

    const mensaje =
        document.getElementById(
            "mensaje-login"
        );

    const boton =
        document.getElementById(
            "boton-login"
        );


    if (
        email === "" ||
        password === ""
    ) {

        mensaje.textContent =
            "Completa el correo y la contraseña.";

        return;
    }


    boton.disabled = true;

    boton.textContent =
        "Ingresando...";

    mensaje.textContent = "";


    const { data, error } =
        await supabaseAdmin.auth
            .signInWithPassword({
                email: email,
                password: password
            });


    if (error) {

        console.error(
            "Error iniciando sesión:",
            error
        );

        mensaje.textContent =
            "Correo o contraseña incorrectos.";

        boton.disabled = false;

        boton.textContent =
            "Iniciar sesión";

        return;
    }


    const usuario =
        data.user;


    const {
        data: administrador,
        error: errorAdmin
    } =
        await supabaseAdmin
            .from("administradores")
            .select("usuario_id")
            .eq(
                "usuario_id",
                usuario.id
            )
            .maybeSingle();


    if (
        errorAdmin ||
        !administrador
    ) {

        console.error(
            "Error comprobando administrador:",
            errorAdmin
        );

        await supabaseAdmin.auth
            .signOut();

        mensaje.textContent =
            "Esta cuenta no tiene permisos de administrador.";

        boton.disabled = false;

        boton.textContent =
            "Iniciar sesión";

        return;
    }


    mostrarPanel();

    await cargarPedidos();


    boton.disabled = false;

    boton.textContent =
        "Iniciar sesión";
}


// ==========================================
// MOSTRAR PANEL
// ==========================================

function mostrarPanel() {

    document.getElementById(
        "login-admin"
    ).style.display = "none";


    document.getElementById(
        "panel-admin"
    ).style.display = "block";


    escucharPedidosNuevos();

    cargarResumenVentas();
}


// ==========================================
// CAMBIAR VISTA DE PEDIDOS
// ==========================================

function cambiarVistaPedidos(vista) {

    vistaPedidosActual =
        vista;


    document
        .getElementById(
            "btn-pedidos-activos"
        )
        .classList.toggle(
            "activo",
            vista === "activos"
        );


    document
        .getElementById(
            "btn-historial"
        )
        .classList.toggle(
            "activo",
            vista === "historial"
        );


    const controles =
        document.getElementById(
            "controles-historial"
        );


    if (
        vista === "historial"
    ) {

        controles.style.display =
            "flex";

    } else {

        controles.style.display =
            "none";
    }


    cargarPedidos();
}


// ==========================================
// CONTADOR PEDIDOS ACTIVOS
// ==========================================

async function actualizarContadorPedidos() {

    const { count, error } =
        await supabaseAdmin
            .from("pedidos")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .neq(
                "estado",
                "Entregado"
            );


    if (error) {

        console.error(
            "Error contando pedidos:",
            error
        );

        return;
    }


    const contador =
        document.getElementById(
            "contador-pedidos-activos"
        );


    if (contador) {

        contador.textContent =
            count ?? 0;
    }
}


// ==========================================
// RESUMEN DE VENTAS DE HOY
// ==========================================

async function cargarResumenVentas() {

    const ahora =
        new Date();


    const inicioHoy =
        new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            0,
            0,
            0,
            0
        );


    const finHoy =
        new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate() + 1,
            0,
            0,
            0,
            0
        );


    const { data, error } =
        await supabaseAdmin
            .from("pedidos")
            .select(
                "id, total"
            )
            .eq(
                "estado",
                "Entregado"
            )
            .gte(
                "fecha",
                inicioHoy.toISOString()
            )
            .lt(
                "fecha",
                finHoy.toISOString()
            );


    if (error) {

        console.error(
            "Error cargando resumen de ventas:",
            error
        );

        return;
    }


    const cantidadPedidos =
        data.length;


    const totalVentas =
        data.reduce(
            (
                acumulado,
                pedido
            ) => {

                return (
                    acumulado +
                    Number(
                        pedido.total
                    )
                );

            },
            0
        );


    const ticketPromedio =
        cantidadPedidos > 0
            ? totalVentas /
              cantidadPedidos
            : 0;


    document.getElementById(
        "ventas-hoy"
    ).textContent =
        `$${totalVentas.toFixed(2)}`;


    document.getElementById(
        "pedidos-hoy"
    ).textContent =
        cantidadPedidos;


    document.getElementById(
        "ticket-promedio"
    ).textContent =
        `$${ticketPromedio.toFixed(2)}`;
}


// ==========================================
// CARGAR PEDIDOS
// ==========================================

async function cargarPedidos() {

    actualizarContadorPedidos();

    const contenedor =
        document.getElementById(
            "lista-pedidos"
        );


    contenedor.innerHTML =
        "<p>Cargando pedidos...</p>";


    let consulta =
        supabaseAdmin
            .from("pedidos")
            .select(`
                *,
                detalle_pedido (*)
            `);


    if (
        vistaPedidosActual ===
        "activos"
    ) {

        consulta =
            consulta.neq(
                "estado",
                "Entregado"
            );

    } else {

        consulta =
            consulta.eq(
                "estado",
                "Entregado"
            );
    }


    const { data, error } =
        await consulta.order(
            "fecha",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Error cargando pedidos:",
            error
        );

        contenedor.innerHTML =
            "<p>No se pudieron cargar los pedidos.</p>";

        return;
    }


    if (
        vistaPedidosActual ===
        "historial"
    ) {

        pedidosHistorial =
            data;
    }


    mostrarPedidos(
        data
    );
}


// ==========================================
// MOSTRAR PEDIDOS
// ==========================================

function mostrarPedidos(
    listaPedidos
) {

    const contenedor =
        document.getElementById(
            "lista-pedidos"
        );


    if (
        !listaPedidos ||
        listaPedidos.length === 0
    ) {

        contenedor.innerHTML =
            vistaPedidosActual ===
            "historial"
                ? "<p>No se encontraron pedidos en el historial.</p>"
                : "<p>No hay pedidos activos.</p>";

        return;
    }


    contenedor.innerHTML =
        listaPedidos
            .map(pedido => {

                const fecha =
                    new Date(
                        pedido.fecha
                    ).toLocaleString(
                        "es-MX"
                    );


                const detalles =
                    Array.isArray(
                        pedido.detalle_pedido
                    )
                        ? pedido.detalle_pedido
                        : [];


                const productos =
                    detalles
                        .map(detalle => {

                            let extras = "";


                            if (
                                Array.isArray(
                                    detalle.extras
                                ) &&
                                detalle.extras.length > 0
                            ) {

                                extras =
                                    detalle.extras
                                        .map(
                                            extra => {

                                                return `
                                                    <div class="pedido-extra">
                                                        + ${escaparHTML(extra.nombre)}
                                                        ($${Number(extra.precio).toFixed(2)})
                                                    </div>
                                                `;
                                            }
                                        )
                                        .join("");
                            }


                            let sabritaIncluida =
                                "";


                            if (
                                detalle.sabrita_incluida
                            ) {

                                sabritaIncluida = `
                                    <div class="pedido-sabrita">
                                        Sabrita incluida:
                                        ${escaparHTML(
                                            detalle.sabrita_incluida
                                        )}
                                    </div>
                                `;
                            }


                            let sabritaExtra =
                                "";


                            if (
                                detalle.sabrita_extra
                            ) {

                                sabritaExtra = `
                                    <div class="pedido-sabrita">
                                        Sabor Sabrita extra:
                                        ${escaparHTML(
                                            detalle.sabrita_extra
                                        )}
                                    </div>
                                `;
                            }


                            return `
                                <div class="pedido-producto">

                                    <strong>
                                        ${Number(detalle.cantidad)}x
                                        ${escaparHTML(
                                            detalle.nombre_producto
                                        )}
                                    </strong>

                                    <span>
                                        $${Number(
                                            detalle.subtotal
                                        ).toFixed(2)}
                                    </span>

                                    ${sabritaIncluida}

                                    ${extras}

                                    ${sabritaExtra}

                                </div>
                            `;

                        })
                        .join("");


                let siguienteEstado =
                    null;

                let textoBoton =
                    "";


                if (
                    pedido.estado ===
                    "Pendiente"
                ) {

                    siguienteEstado =
                        "Aceptado";

                    textoBoton =
                        "Aceptar pedido";

                } else if (
                    pedido.estado ===
                    "Aceptado"
                ) {

                    siguienteEstado =
                        "Preparando";

                    textoBoton =
                        "Comenzar preparación";

                } else if (
                    pedido.estado ===
                    "Preparando"
                ) {

                    siguienteEstado =
                        "Listo";

                    textoBoton =
                        "Marcar como listo";

                } else if (
                    pedido.estado ===
                    "Listo"
                ) {

                    siguienteEstado =
                        "Entregado";

                    textoBoton =
                        "Marcar como entregado";
                }


                let botonAccion =
                    "";


                if (
                    siguienteEstado
                ) {

                    botonAccion = `
                        <button
                            class="boton-estado-pedido"
                            onclick="cambiarEstadoPedido(
                                ${Number(pedido.id)},
                                '${siguienteEstado}'
                            )"
                        >
                            ${textoBoton}
                        </button>
                    `;

                } else {

                    botonAccion = `
                        <div class="pedido-finalizado">
                            ✓ Pedido entregado
                        </div>
                    `;
                }


                return `

                    <article
                        class="pedido-admin estado-${pedido.estado.toLowerCase()}"
                        data-pedido-id="${Number(pedido.id)}"
                    >

                        <div class="pedido-cabecera">

                            <div>

                                <h3>
                                    ${escaparHTML(
                                        pedido.numero_pedido
                                    )}
                                </h3>

                                <span class="estado-pedido">
                                    ${escaparHTML(
                                        pedido.estado
                                    )}
                                </span>

                            </div>


                            <strong class="pedido-total">
                                $${Number(
                                    pedido.total
                                ).toFixed(2)}
                            </strong>

                        </div>


                        <div class="pedido-cliente">

                            <strong>
                                ${escaparHTML(
                                    pedido.nombre_cliente
                                )}
                            </strong>

                            <span>
                                ${escaparHTML(
                                    pedido.telefono
                                )}
                            </span>

                            <small>
                                ${escaparHTML(
                                    fecha
                                )}
                            </small>

                        </div>


                        <div class="pedido-productos">
                            ${productos}
                        </div>


                        <div class="pedido-acciones">
                            ${botonAccion}
                        </div>

                    </article>
                `;

            })
            .join("");
}


// ==========================================
// FILTRAR HISTORIAL
// ==========================================

function filtrarHistorial() {

    if (
        vistaPedidosActual !==
        "historial"
    ) {
        return;
    }


    const busqueda =
        document
            .getElementById(
                "buscar-historial"
            )
            .value
            .trim()
            .toLowerCase();


    const fechaSeleccionada =
        document
            .getElementById(
                "fecha-historial"
            )
            .value;


    const pedidosFiltrados =
        pedidosHistorial.filter(
            pedido => {

                const numeroPedido =
                    String(
                        pedido.numero_pedido ||
                        ""
                    ).toLowerCase();


                const nombre =
                    String(
                        pedido.nombre_cliente ||
                        ""
                    ).toLowerCase();


                const telefono =
                    String(
                        pedido.telefono ||
                        ""
                    );


                const coincideBusqueda =
                    !busqueda ||
                    numeroPedido.includes(
                        busqueda
                    ) ||
                    nombre.includes(
                        busqueda
                    ) ||
                    telefono.includes(
                        busqueda
                    );


                let coincideFecha =
                    true;


                if (
                    fechaSeleccionada
                ) {

                    const fechaPedido =
                        obtenerFechaLocalPedido(
                            pedido.fecha
                        );


                    coincideFecha =
                        fechaPedido ===
                        fechaSeleccionada;
                }


                return (
                    coincideBusqueda &&
                    coincideFecha
                );
            }
        );


    mostrarPedidos(
        pedidosFiltrados
    );
}


// ==========================================
// OBTENER FECHA LOCAL
// ==========================================

function obtenerFechaLocalPedido(
    fecha
) {

    const fechaObjeto =
        new Date(fecha);


    const año =
        fechaObjeto.getFullYear();


    const mes =
        String(
            fechaObjeto.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            fechaObjeto.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${año}-${mes}-${dia}`;
}


// ==========================================
// LIMPIAR FILTROS
// ==========================================

function limpiarFiltrosHistorial() {

    document.getElementById(
        "buscar-historial"
    ).value = "";


    document.getElementById(
        "fecha-historial"
    ).value = "";


    mostrarPedidos(
        pedidosHistorial
    );
}


// ==========================================
// CAMBIAR ESTADO DEL PEDIDO
// ==========================================

async function cambiarEstadoPedido(
    pedidoId,
    nuevoEstado
) {

    const { error } =
        await supabaseAdmin
            .from("pedidos")
            .update({
                estado: nuevoEstado
            })
            .eq(
                "id",
                pedidoId
            );


    if (error) {

        console.error(
            "Error cambiando estado:",
            error
        );

        alert(
            "No se pudo cambiar el estado del pedido."
        );
    }
}


// ==========================================
// CAMBIAR SECCIÓN
// ==========================================

async function mostrarSeccionAdmin(
    seccion,
    boton
) {

    document.getElementById(
        "seccion-pedidos"
    ).style.display = "none";


    document.getElementById(
        "seccion-productos"
    ).style.display = "none";


    document.getElementById(
        "seccion-extras-admin"
    ).style.display = "none";


    document.getElementById(
        "seccion-sabritas-admin"
    ).style.display = "none";


    document.getElementById(
        "seccion-estadisticas"
    ).style.display = "none";


    document.querySelectorAll(
        ".admin-menu button"
    ).forEach(
        botonMenu => {

            botonMenu.classList.remove(
                "admin-menu-activo"
            );
        }
    );


    if (boton) {

        boton.classList.add(
            "admin-menu-activo"
        );
    }


    if (
        seccion === "pedidos"
    ) {

        document.getElementById(
            "seccion-pedidos"
        ).style.display =
            "block";

        await cargarPedidos();

        await cargarResumenVentas();
    }


    if (
        seccion === "productos"
    ) {

        document.getElementById(
            "seccion-productos"
        ).style.display =
            "block";

        await cargarProductosAdmin();
    }


    if (
        seccion === "extras"
    ) {

        document.getElementById(
            "seccion-extras-admin"
        ).style.display =
            "block";

        await cargarExtrasAdmin();
    }


    if (
        seccion === "sabritas"
    ) {

        document.getElementById(
            "seccion-sabritas-admin"
        ).style.display =
            "block";

        await cargarSabritasAdmin();
    }


    if (
        seccion === "estadisticas"
    ) {

        document.getElementById(
            "seccion-estadisticas"
        ).style.display =
            "block";

        await cargarEstadisticas();
    }
}


// ==========================================
// CARGAR PRODUCTOS
// ==========================================

async function cargarProductosAdmin() {

    const contenedor =
        document.getElementById(
            "lista-productos-admin"
        );


    contenedor.innerHTML =
        "<p>Cargando productos...</p>";


    const { data, error } =
        await supabaseAdmin
            .from("productos")
            .select("*")
            .order("id");


    if (error) {

        console.error(
            "Error cargando productos:",
            error
        );

        contenedor.innerHTML =
            "<p>No se pudieron cargar los productos.</p>";

        return;
    }


    contenedor.innerHTML =
        data.map(producto => {

            return `

                <div class="producto-admin">

                    <div class="producto-admin-info">

                        <strong>
                            ${escaparHTML(
                                producto.nombre
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                producto.categoria
                            )}
                        </span>

                    </div>


                    <div class="producto-admin-controles">

                        <label>

                            Precio

                            <input
                                type="number"
                                id="precio-producto-${producto.id}"
                                value="${Number(producto.precio)}"
                                min="0"
                                step="1"
                            >

                        </label>


                        <label class="control-disponible">

                            <input
                                type="checkbox"
                                id="disponible-producto-${producto.id}"
                                ${
                                    producto.disponible
                                        ? "checked"
                                        : ""
                                }
                            >

                            Disponible

                        </label>


                        <button
                            onclick="guardarProducto(${producto.id})"
                            class="boton-guardar"
                        >
                            Guardar
                        </button>

                    </div>

                </div>
            `;

        }).join("");
}


// ==========================================
// GUARDAR PRODUCTO
// ==========================================

async function guardarProducto(
    productoId
) {

    const precio =
        Number(
            document.getElementById(
                `precio-producto-${productoId}`
            ).value
        );


    const disponible =
        document.getElementById(
            `disponible-producto-${productoId}`
        ).checked;


    if (
        !Number.isFinite(precio) ||
        precio < 0
    ) {

        alert(
            "Ingresa un precio válido."
        );

        return;
    }


    const { error } =
        await supabaseAdmin
            .from("productos")
            .update({

                precio: precio,

                disponible:
                    disponible,

                fecha_actualizacion:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                productoId
            );


    if (error) {

        console.error(
            "Error actualizando producto:",
            error
        );

        alert(
            "No se pudo guardar el producto."
        );

        return;
    }


    alert(
        "Producto actualizado correctamente."
    );

    await cargarProductosAdmin();
}


// ==========================================
// CARGAR EXTRAS
// ==========================================

async function cargarExtrasAdmin() {

    const contenedor =
        document.getElementById(
            "lista-extras-admin"
        );


    contenedor.innerHTML =
        "<p>Cargando extras...</p>";


    const { data, error } =
        await supabaseAdmin
            .from("extras")
            .select("*")
            .order("categoria")
            .order("id");


    if (error) {

        console.error(
            "Error cargando extras:",
            error
        );

        contenedor.innerHTML =
            "<p>No se pudieron cargar los extras.</p>";

        return;
    }


    contenedor.innerHTML =
        data.map(extra => {

            return `

                <div class="producto-admin">

                    <div class="producto-admin-info">

                        <strong>
                            + ${escaparHTML(
                                extra.nombre
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                extra.categoria
                            )}
                        </span>

                    </div>


                    <div class="producto-admin-controles">

                        <label>

                            Precio

                            <input
                                type="number"
                                id="precio-extra-${extra.id}"
                                value="${Number(extra.precio)}"
                                min="0"
                                step="1"
                            >

                        </label>


                        <label class="control-disponible">

                            <input
                                type="checkbox"
                                id="disponible-extra-${extra.id}"
                                ${
                                    extra.disponible
                                        ? "checked"
                                        : ""
                                }
                            >

                            Disponible

                        </label>


                        <button
                            class="boton-guardar"
                            onclick="guardarExtra(${extra.id})"
                        >
                            Guardar
                        </button>

                    </div>

                </div>
            `;

        }).join("");
}


// ==========================================
// GUARDAR EXTRA
// ==========================================

async function guardarExtra(
    extraId
) {

    const precio =
        Number(
            document.getElementById(
                `precio-extra-${extraId}`
            ).value
        );


    const disponible =
        document.getElementById(
            `disponible-extra-${extraId}`
        ).checked;


    if (
        !Number.isFinite(precio) ||
        precio < 0
    ) {

        alert(
            "Ingresa un precio válido."
        );

        return;
    }


    const { error } =
        await supabaseAdmin
            .from("extras")
            .update({
                precio: precio,
                disponible: disponible
            })
            .eq(
                "id",
                extraId
            );


    if (error) {

        console.error(
            "Error actualizando extra:",
            error
        );

        alert(
            "No se pudo actualizar el extra."
        );

        return;
    }


    alert(
        "Extra actualizado correctamente."
    );

    await cargarExtrasAdmin();
}


// ==========================================
// CARGAR SABRITAS
// ==========================================

async function cargarSabritasAdmin() {

    const contenedor =
        document.getElementById(
            "lista-sabritas-admin"
        );


    contenedor.innerHTML =
        "<p>Cargando sabores...</p>";


    const { data, error } =
        await supabaseAdmin
            .from("sabores_sabritas")
            .select("*")
            .order("id");


    if (error) {

        console.error(
            "Error cargando Sabritas:",
            error
        );

        contenedor.innerHTML =
            "<p>No se pudieron cargar los sabores.</p>";

        return;
    }


    contenedor.innerHTML =
        data.map(sabrita => {

            return `

                <div class="producto-admin">

                    <div class="producto-admin-info">

                        <strong>
                            ${escaparHTML(
                                sabrita.nombre
                            )}
                        </strong>

                        <span>
                            Sabor de Sabrita
                        </span>

                    </div>


                    <div class="producto-admin-controles">

                        <label class="control-disponible">

                            <input
                                type="checkbox"
                                id="disponible-sabrita-${sabrita.id}"
                                ${
                                    sabrita.disponible
                                        ? "checked"
                                        : ""
                                }
                            >

                            Disponible

                        </label>


                        <button
                            class="boton-guardar"
                            onclick="guardarSabrita(${sabrita.id})"
                        >
                            Guardar
                        </button>

                    </div>

                </div>
            `;

        }).join("");
}


// ==========================================
// GUARDAR SABRITA
// ==========================================

async function guardarSabrita(
    sabritaId
) {

    const disponible =
        document.getElementById(
            `disponible-sabrita-${sabritaId}`
        ).checked;


    const { error } =
        await supabaseAdmin
            .from("sabores_sabritas")
            .update({
                disponible:
                    disponible
            })
            .eq(
                "id",
                sabritaId
            );


    if (error) {

        console.error(
            "Error actualizando Sabrita:",
            error
        );

        alert(
            "No se pudo actualizar el sabor."
        );

        return;
    }


    alert(
        "Sabor actualizado correctamente."
    );

    await cargarSabritasAdmin();
}


// ==========================================
// ESTADÍSTICAS
// ==========================================

async function cargarEstadisticas() {

    const ahora =
        new Date();


    const inicioHoy =
        new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate()
        );


    // ======================================
    // INICIO DE SEMANA - LUNES
    // ======================================

    const inicioSemana =
        new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate()
        );


    const diaSemana =
        inicioSemana.getDay();


    const diasDesdeLunes =
        diaSemana === 0
            ? 6
            : diaSemana - 1;


    inicioSemana.setDate(
        inicioSemana.getDate() -
        diasDesdeLunes
    );


    // ======================================
    // INICIO DEL MES
    // ======================================

    const inicioMes =
        new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            1
        );


    const { data, error } =
        await supabaseAdmin
            .from("pedidos")
            .select(`
                id,
                total,
                fecha,
                detalle_pedido (
                    producto_id,
                    nombre_producto,
                    cantidad
                )
            `)
            .eq(
                "estado",
                "Entregado"
            )
            .gte(
                "fecha",
                inicioMes.toISOString()
            )
            .order(
                "fecha",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Error cargando estadísticas:",
            error
        );

        return;
    }


    let ventasHoy = 0;

    let ventasSemana = 0;

    let ventasMes = 0;


    const cantidadPedidos =
        data.length;


    const productosVendidos =
        {};


    data.forEach(
        pedido => {

            const fechaPedido =
                new Date(
                    pedido.fecha
                );


            const total =
                Number(
                    pedido.total
                );


            ventasMes +=
                total;


            if (
                fechaPedido >=
                inicioSemana
            ) {

                ventasSemana +=
                    total;
            }


            if (
                fechaPedido >=
                inicioHoy
            ) {

                ventasHoy +=
                    total;
            }


            const detalles =
                Array.isArray(
                    pedido.detalle_pedido
                )
                    ? pedido.detalle_pedido
                    : [];


            detalles.forEach(
                detalle => {

                    const nombre =
                        detalle.nombre_producto;


                    const cantidad =
                        Number(
                            detalle.cantidad
                        );


                    if (
                        !productosVendidos[
                            nombre
                        ]
                    ) {

                        productosVendidos[
                            nombre
                        ] = 0;
                    }


                    productosVendidos[
                        nombre
                    ] += cantidad;
                }
            );
        }
    );


    // ======================================
    // TICKET PROMEDIO
    // ======================================

    const ticketPromedio =
        cantidadPedidos > 0
            ? ventasMes /
              cantidadPedidos
            : 0;


    // ======================================
    // PRODUCTO MÁS VENDIDO
    // ======================================

    let productoMasVendido =
        "Sin datos";

    let mayorCantidad =
        0;


    Object.entries(
        productosVendidos
    ).forEach(
        (
            [
                nombre,
                cantidad
            ]
        ) => {

            if (
                cantidad >
                mayorCantidad
            ) {

                mayorCantidad =
                    cantidad;

                productoMasVendido =
                    nombre;
            }
        }
    );


    // ======================================
    // MOSTRAR DATOS
    // ======================================

    document.getElementById(
        "estadistica-hoy"
    ).textContent =
        `$${ventasHoy.toFixed(2)}`;


    document.getElementById(
        "estadistica-semana"
    ).textContent =
        `$${ventasSemana.toFixed(2)}`;


    document.getElementById(
        "estadistica-mes"
    ).textContent =
        `$${ventasMes.toFixed(2)}`;


    document.getElementById(
        "estadistica-pedidos"
    ).textContent =
        cantidadPedidos;


    document.getElementById(
        "estadistica-ticket"
    ).textContent =
        `$${ticketPromedio.toFixed(2)}`;


    document.getElementById(
        "estadistica-producto"
    ).textContent =
        productoMasVendido ===
        "Sin datos"
            ? "Sin datos"
            : `${productoMasVendido} (${mayorCantidad})`;


    crearGraficaVentas(
        data
    );
}


// ==========================================
// GRÁFICA DE ÚLTIMOS 7 DÍAS
// ==========================================

function crearGraficaVentas(
    pedidos
) {

    const contenedor =
        document.getElementById(
            "grafica-ventas"
        );


    const dias =
        [];


    const ahora =
        new Date();


    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const fecha =
            new Date(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate() - i
            );


        dias.push({

            fecha: fecha,

            clave:
                obtenerFechaLocalPedido(
                    fecha
                ),

            nombre:
                fecha.toLocaleDateString(
                    "es-MX",
                    {
                        weekday:
                            "short"
                    }
                ),

            total: 0

        });
    }


    pedidos.forEach(
        pedido => {

            const clavePedido =
                obtenerFechaLocalPedido(
                    pedido.fecha
                );


            const dia =
                dias.find(
                    item =>
                        item.clave ===
                        clavePedido
                );


            if (dia) {

                dia.total +=
                    Number(
                        pedido.total
                    );
            }
        }
    );


    const mayorVenta =
        Math.max(
            ...dias.map(
                dia =>
                    dia.total
            ),
            1
        );


    contenedor.innerHTML =
        dias.map(
            dia => {

                const porcentaje =
                    (
                        dia.total /
                        mayorVenta
                    ) * 100;


                return `

                    <div class="dia-grafica">

                        <div class="valor-grafica">
                            $${dia.total.toFixed(0)}
                        </div>


                        <div class="contenedor-barra">

                            <div
                                class="barra-venta"
                                style="height: ${porcentaje}%;"
                            >
                            </div>

                        </div>


                        <div class="nombre-dia">
                            ${escaparHTML(
                                dia.nombre
                            )}
                        </div>

                    </div>
                `;

            }
        ).join("");
}


// ==========================================
// REALTIME
// ==========================================

function escucharPedidosNuevos() {

    if (
        canalPedidos
    ) {
        return;
    }


    canalPedidos =
        supabaseAdmin
            .channel(
                "pedidos-admin"
            )

            // ==================================
            // NUEVO PEDIDO
            // ==================================

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "pedidos"
                },

                async payload => {

                    console.log(
                        "Nuevo pedido recibido:",
                        payload.new
                    );


                    // Solo recargar la lista si
                    // estamos viendo pedidos.

                    const seccionPedidos =
                        document.getElementById(
                            "seccion-pedidos"
                        );


                    if (
                        seccionPedidos.style.display !==
                        "none"
                    ) {

                        await cargarPedidos();
                    }


                    actualizarContadorPedidos();


                    mostrarNotificacionPedido(
                        payload.new
                    );


                    reproducirSonidoNuevoPedido();
                }
            )

            // ==================================
            // PEDIDO ACTUALIZADO
            // ==================================

            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "pedidos"
                },

                async payload => {

                    const pedido =
                        payload.new;


                    // Si estamos en historial y
                    // acaba de entregarse un pedido,
                    // recargamos el historial para
                    // que aparezca inmediatamente.

                    if (
                        vistaPedidosActual ===
                            "historial" &&
                        pedido.estado ===
                            "Entregado"
                    ) {

                        await cargarPedidos();

                    } else {

                        actualizarEstadoPedidoEnPantalla(
                            pedido
                        );
                    }


                    actualizarContadorPedidos();

                    cargarResumenVentas();


                    const estadisticas =
                        document.getElementById(
                            "seccion-estadisticas"
                        );


                    if (
                        estadisticas &&
                        estadisticas.style.display !==
                            "none"
                    ) {

                        cargarEstadisticas();
                    }
                }
            )

            .subscribe(
                estado => {

                    console.log(
                        "Estado tiempo real:",
                        estado
                    );
                }
            );
}


// ==========================================
// ACTUALIZAR TARJETA EN TIEMPO REAL
// ==========================================

function actualizarEstadoPedidoEnPantalla(
    pedido
) {

    if (
        vistaPedidosActual ===
            "activos" &&
        pedido.estado ===
            "Entregado"
    ) {

        const tarjeta =
            document.querySelector(
                `[data-pedido-id="${pedido.id}"]`
            );


        if (tarjeta) {

            tarjeta.remove();
        }


        return;
    }


    const tarjeta =
        document.querySelector(
            `[data-pedido-id="${pedido.id}"]`
        );


    if (!tarjeta) {

        return;
    }


    tarjeta.classList.remove(
        "estado-pendiente",
        "estado-aceptado",
        "estado-preparando",
        "estado-listo",
        "estado-entregado"
    );


    tarjeta.classList.add(
        `estado-${pedido.estado.toLowerCase()}`
    );


    const estadoTexto =
        tarjeta.querySelector(
            ".estado-pedido"
        );


    if (estadoTexto) {

        estadoTexto.textContent =
            pedido.estado;
    }


    const acciones =
        tarjeta.querySelector(
            ".pedido-acciones"
        );


    if (!acciones) {

        return;
    }


    let siguienteEstado =
        null;

    let textoBoton =
        "";


    if (
        pedido.estado ===
        "Pendiente"
    ) {

        siguienteEstado =
            "Aceptado";

        textoBoton =
            "Aceptar pedido";

    } else if (
        pedido.estado ===
        "Aceptado"
    ) {

        siguienteEstado =
            "Preparando";

        textoBoton =
            "Comenzar preparación";

    } else if (
        pedido.estado ===
        "Preparando"
    ) {

        siguienteEstado =
            "Listo";

        textoBoton =
            "Marcar como listo";

    } else if (
        pedido.estado ===
        "Listo"
    ) {

        siguienteEstado =
            "Entregado";

        textoBoton =
            "Marcar como entregado";
    }


    if (
        siguienteEstado
    ) {

        acciones.innerHTML = `

            <button
                class="boton-estado-pedido"
                onclick="cambiarEstadoPedido(
                    ${Number(pedido.id)},
                    '${siguienteEstado}'
                )"
            >
                ${textoBoton}
            </button>
        `;

    } else {

        acciones.innerHTML = `

            <div class="pedido-finalizado">
                ✓ Pedido entregado
            </div>
        `;
    }
}


// ==========================================
// NOTIFICACIÓN
// ==========================================

function mostrarNotificacionPedido(
    pedido
) {

    const notificacion =
        document.getElementById(
            "notificacion-pedido"
        );


    const texto =
        document.getElementById(
            "texto-notificacion-pedido"
        );


    texto.textContent =
        `${pedido.numero_pedido} - $${Number(
            pedido.total
        ).toFixed(2)}`;


    notificacion.classList.add(
        "visible"
    );


    setTimeout(
        () => {

            notificacion.classList.remove(
                "visible"
            );

        },
        5000
    );
}


// ==========================================
// AUDIO
// ==========================================

function activarAudio() {

    if (!audioContext) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();
    }


    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext.resume();
    }
}


function reproducirSonidoNuevoPedido() {

    if (!audioContext) {

        return;
    }


    const oscilador =
        audioContext
            .createOscillator();


    const volumen =
        audioContext
            .createGain();


    oscilador.connect(
        volumen
    );


    volumen.connect(
        audioContext.destination
    );


    oscilador.frequency
        .setValueAtTime(
            850,
            audioContext.currentTime
        );


    volumen.gain
        .setValueAtTime(
            0.3,
            audioContext.currentTime
        );


    volumen.gain
        .exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime +
                0.5
        );


    oscilador.start();


    oscilador.stop(
        audioContext.currentTime +
            0.5
    );
}


document.addEventListener(
    "click",
    activarAudio,
    {
        once: true
    }
);


// ==========================================
// CERRAR SESIÓN
// ==========================================

async function cerrarSesion() {

    if (
        canalPedidos
    ) {

        await supabaseAdmin
            .removeChannel(
                canalPedidos
            );

        canalPedidos =
            null;
    }


    await supabaseAdmin.auth
        .signOut();


    document.getElementById(
        "panel-admin"
    ).style.display =
        "none";


    document.getElementById(
        "login-admin"
    ).style.display =
        "flex";


    document.getElementById(
        "admin-password"
    ).value =
        "";


    document.getElementById(
        "mensaje-login"
    ).textContent =
        "";
}


// ==========================================
// COMPROBAR SESIÓN
// ==========================================

async function comprobarSesionAdmin() {

    const {
        data: {
            session
        },
        error
    } =
        await supabaseAdmin.auth
            .getSession();


    if (error) {

        console.error(
            "Error comprobando sesión:",
            error
        );

        return;
    }


    if (!session) {

        document.getElementById(
            "login-admin"
        ).style.display =
            "flex";


        document.getElementById(
            "panel-admin"
        ).style.display =
            "none";


        return;
    }


    const usuario =
        session.user;


    const {
        data: administrador,
        error: errorAdmin
    } =
        await supabaseAdmin
            .from("administradores")
            .select("usuario_id")
            .eq(
                "usuario_id",
                usuario.id
            )
            .maybeSingle();


    if (
        errorAdmin ||
        !administrador
    ) {

        await supabaseAdmin.auth
            .signOut();


        document.getElementById(
            "login-admin"
        ).style.display =
            "flex";


        document.getElementById(
            "panel-admin"
        ).style.display =
            "none";


        return;
    }


    mostrarPanel();

    await cargarPedidos();
}


// ==========================================
// INICIAR ADMIN
// ==========================================

comprobarSesionAdmin();