/* =========================================
   CONEXIÓN CON SUPABASE
========================================= */

const SUPABASE_URL =
    "https://qhhqiwhcbbnncnaonahc.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_iasGk-jqhvZFQLiRTPacqw_zNXpKtbO";

const supabaseCliente =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );
    
/* =========================================
   PRODUCTOS
========================================= */

let productos = [];


/* =========================================
   EXTRAS
========================================= */

let extrasCremas = [];
let extrasElotes = [];


/* =========================================
   SABRITAS
========================================= */

let saboresSabritas = [];


/* =========================================
   VARIABLES
========================================= */

let carrito = [];

let productoSeleccionado = null;

let cantidadSeleccionada = 1;

async function cargarProductosDesdeSupabase() {

    const { data, error } =
        await supabaseCliente
            .from("productos")
            .select("*")
            .eq("disponible", true)
            .order("id");


    if (error) {

        console.error(
            "Error cargando productos:",
            error
        );

        document.getElementById(
            "productos"
        ).innerHTML = `
            <p>
                No se pudo cargar el menú.
                Intenta nuevamente.
            </p>
        `;

        return;
    }


    productos = data.map(producto => {

        let emoji = "🍽️";


        if (producto.categoria === "cremas") {
            emoji = "🍓";
        }

        if (producto.categoria === "elotes") {
            emoji = "🌽";
        }

        if (producto.categoria === "esquites") {
            emoji = "🥣";
        }

        if (producto.categoria === "bebidas") {
            emoji = "🥤";
        }


        return {
    id: producto.id,
    nombre: producto.nombre,
    precio: Number(producto.precio),
    categoria: producto.categoria,
    emoji,
    incluyeSabrita: producto.incluye_sabrita,
    permiteExtras: producto.permite_extras
};

    });


    mostrarProductos(productos);

}

async function cargarExtrasDesdeSupabase() {

    const { data, error } =
        await supabaseCliente
            .from("extras")
            .select("*")
            .eq("disponible", true)
            .order("id");


    if (error) {

        console.error(
            "Error cargando extras:",
            error
        );

        return;
    }


    extrasCremas = data
        .filter(extra =>
            extra.categoria === "cremas"
        )
        .map(extra => ({
            nombre: extra.nombre,
            precio: Number(extra.precio)
        }));


    extrasElotes = data
        .filter(extra =>
            extra.categoria === "elotes"
        )
        .map(extra => ({
            nombre: extra.nombre,
            precio: Number(extra.precio)
        }));


    console.log(
        "Extras cargados:",
        extrasCremas,
        extrasElotes
    );

}

async function cargarSabritasDesdeSupabase() {

    const { data, error } =
        await supabaseCliente
            .from("sabores_sabritas")
            .select("*")
            .order("id");


    if (error) {

        console.error(
            "Error cargando sabores de Sabritas:",
            error
        );

        return;
    }


    saboresSabritas = data.map(sabor => ({

        id: sabor.id,

        nombre: sabor.nombre,

        disponible: sabor.disponible

    }));


    console.log(
        "Sabritas cargadas:",
        saboresSabritas
    );

}

/* =========================================
   MOSTRAR PRODUCTOS
========================================= */

function fotoProducto(producto) {
    const nombre = producto.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (nombre.includes("grenuda")) return "grenuda.png";
    if (nombre.includes("marranada")) return "marranada.jpeg";
    if (nombre.includes("atascado")) return "atascado.jpeg";
    if (nombre.includes("cheelote")) return "cheelote.jpeg";
    if (nombre.includes("esquite")) return "esquite.jpeg";
    if (nombre.includes("fresa") && producto.categoria === "cremas") return "fresas-con-crema.jpeg";
    if (nombre.includes("pepsi")) return "pepsi.png";
    return null;
}

function imagenProducto(producto) {
    const foto = fotoProducto(producto);
    const categoria = ["cremas", "elotes", "esquites", "bebidas"].includes(producto.categoria) ? producto.categoria : "elotes";
    const clase = foto ? "foto-producto foto-" + foto.split(".")[0] : "ilustracion-producto";
    return '<img class="' + clase + '" src="img/' + (foto || "antojo-" + categoria + ".svg") + '" alt="" loading="lazy" width="550" height="687">';
}

function mostrarProductos(lista) {

    const contenedor =
        document.getElementById("productos");

    contenedor.innerHTML = "";


    lista.forEach(producto => {

        contenedor.innerHTML += `

            <article class="producto">

                <div class="producto-imagen">
                    ${imagenProducto(producto)}
                </div>


                <div class="producto-info">

                    <span class="producto-categoria">
                        ${producto.categoria}
                    </span>


                    <h3>
                        ${producto.nombre}
                    </h3>


                    <div class="producto-abajo">

                        <span class="precio">
                            $${producto.precio}
                        </span>


                        <button
                            class="agregar" aria-label="Personalizar producto"
                            onclick="abrirProducto(${producto.id})"
                        >
                            +
                        </button>

                    </div>

                </div>

            </article>

        `;

    });

}


/* =========================================
   FILTRAR PRODUCTOS
========================================= */

function filtrarProductos(categoria, boton) {

    document
        .querySelectorAll(".categoria")
        .forEach(botonCategoria => {

            botonCategoria.classList.remove("activa");

        });


    boton.classList.add("activa");


    if (categoria === "todos") {

        mostrarProductos(productos);

        return;

    }


    const productosFiltrados =
        productos.filter(

            producto =>
                producto.categoria === categoria

        );


    mostrarProductos(productosFiltrados);

}


/* =========================================
   ABRIR PRODUCTO
========================================= */

function abrirProducto(id) {

    productoSeleccionado =
        productos.find(
            producto =>
                producto.id === id
        );


    if (!productoSeleccionado) {
        return;
    }


    cantidadSeleccionada = 1;


    document.getElementById(
        "modal-emoji"
    ).innerHTML =
        imagenProducto(productoSeleccionado);


    document.getElementById(
        "modal-nombre"
    ).textContent =
        productoSeleccionado.nombre;


    document.getElementById(
        "modal-precio-base"
    ).textContent =
        `$${productoSeleccionado.precio}`;


    document.getElementById(
        "cantidad-modal"
    ).textContent = 1;


    // ======================================
    // EXTRAS
    // ======================================

    const seccionExtras =
        document.getElementById(
            "seccion-extras"
        );


    if (
        productoSeleccionado.permiteExtras === false
    ) {

        // Este producto NO permite extras

        seccionExtras.style.display = "none";

        document.getElementById(
            "lista-extras"
        ).innerHTML = "";

    } else {

        // Este producto SÍ permite extras

        seccionExtras.style.display = "block";

        cargarExtras();

    }


    // ======================================
    // SABRITAS
    // ======================================

    configurarSabritas();


    // ======================================
    // CALCULAR TOTAL
    // ======================================

    calcularTotalModal();


    // ======================================
    // ABRIR MODAL
    // ======================================

    document
        .getElementById("fondo-modal")
        .classList.add("visible");


    document
        .getElementById("modal-producto")
        .classList.add("visible");

}


/* =========================================
   CARGAR EXTRAS
========================================= */

function cargarExtras() {

    const lista =
        document.getElementById("lista-extras");


    const seccion =
        document.getElementById("seccion-extras");


    lista.innerHTML = "";


    let extras = [];


    if (productoSeleccionado.categoria === "cremas") {

        extras = extrasCremas;

    }


    if (productoSeleccionado.categoria === "elotes") {

        extras = extrasElotes;

    }


    if (extras.length === 0) {

        seccion.style.display = "none";

        return;

    }


    seccion.style.display = "block";


    extras.forEach(extra => {


        /* =========================
           CREMAS
           SOLO UN EXTRA
        ========================= */

        if (productoSeleccionado.categoria === "cremas") {

            lista.innerHTML += `

                <label class="extra-opcion">

                    <div class="extra-info">

                        <input
                            type="radio"
                            name="extra-crema"
                            class="extra-radio"
                            data-nombre="${extra.nombre}"
                            data-precio="${extra.precio}"
                            onchange="cambioExtra()"
                        >

                        <span>
                            ${extra.nombre}
                        </span>

                    </div>


                    <span class="extra-precio">
                        +$${extra.precio}
                    </span>

                </label>

            `;

        }


        /* =========================
           ELOTES
           VARIOS EXTRAS
        ========================= */

        if (productoSeleccionado.categoria === "elotes") {

            lista.innerHTML += `

                <label class="extra-opcion">

                    <div class="extra-info">

                        <input
                            type="checkbox"
                            class="extra-checkbox"
                            data-nombre="${extra.nombre}"
                            data-precio="${extra.precio}"
                            onchange="cambioExtra()"
                        >

                        <span>
                            ${extra.nombre}
                        </span>

                    </div>


                    <span class="extra-precio">
                        +$${extra.precio}
                    </span>

                </label>

            `;

        }

    });

}


/* =========================================
   CAMBIO DE EXTRA
========================================= */

function cambioExtra() {

    calcularTotalModal();


    const seccionSabritaExtra =
        document.getElementById(
            "seccion-sabrita-extra"
        );


    const checkboxSabrita =
        Array.from(

            document.querySelectorAll(
                ".extra-checkbox"
            )

        ).find(

            extra =>
                extra.dataset.nombre === "Sabrita"

        );


    /*
        Si seleccionó el extra Sabrita,
        mostramos los sabores.
    */

    if (
        checkboxSabrita &&
        checkboxSabrita.checked
    ) {

        seccionSabritaExtra.style.display =
            "block";


        cargarSabritas(
            "lista-sabrita-extra",
            "sabrita-extra"
        );

    } else {

        seccionSabritaExtra.style.display =
            "none";


        document.getElementById(
            "lista-sabrita-extra"
        ).innerHTML = "";

    }

}


/* =========================================
   CARGAR SABRITAS
========================================= */

function cargarSabritas(
    contenedorId,
    nombreRadio
) {

    const contenedor =
        document.getElementById(contenedorId);


    contenedor.innerHTML = "";


    saboresSabritas.forEach(sabrita => {

        const label =
            document.createElement("label");


        if (sabrita.disponible) {

            label.className =
                "extra-opcion";

        } else {

            label.className =
                "extra-opcion sabrita-agotada";

        }


        label.innerHTML = `

            <div class="extra-info">

                <input
                    type="radio"
                    name="${nombreRadio}"
                    value="${sabrita.nombre}"
                    ${sabrita.disponible ? "" : "disabled"}
                >

                <span>
                    ${sabrita.nombre}
                </span>

            </div>


            ${
                sabrita.disponible

                    ? ""

                    : `
                        <small class="etiqueta-agotado">
                            AGOTADO
                        </small>
                    `
            }

        `;


        contenedor.appendChild(label);

    });

}


/* =========================================
   CONFIGURAR SABRITA INCLUIDA
========================================= */

function configurarSabritas() {

    const seccionIncluida =
        document.getElementById(
            "seccion-sabrita-incluida"
        );


    const seccionExtra =
        document.getElementById(
            "seccion-sabrita-extra"
        );


    seccionIncluida.style.display =
        "none";


    seccionExtra.style.display =
        "none";


    document.getElementById(
        "lista-sabrita-incluida"
    ).innerHTML = "";


    document.getElementById(
        "lista-sabrita-extra"
    ).innerHTML = "";


    /*
        Solamente aparece si el producto
        tiene incluyeSabrita: true
    */

    if (
        productoSeleccionado.incluyeSabrita === true
    ) {

        seccionIncluida.style.display =
            "block";


        cargarSabritas(
            "lista-sabrita-incluida",
            "sabrita-incluida"
        );

    }

}


/* =========================================
   CAMBIAR CANTIDAD DEL MODAL
========================================= */

function cambiarCantidadModal(cambio) {

    cantidadSeleccionada += cambio;


    if (cantidadSeleccionada < 1) {

        cantidadSeleccionada = 1;

    }


    document.getElementById(
        "cantidad-modal"
    ).textContent =
        cantidadSeleccionada;


    calcularTotalModal();

}


/* =========================================
   OBTENER EXTRAS SELECCIONADOS
========================================= */

function obtenerExtrasSeleccionados() {

    const extras = [];


    /* EXTRA DE CREMAS */

    const extraCrema =
        document.querySelector(
            ".extra-radio:checked"
        );


    if (extraCrema) {

        extras.push({

            nombre:
                extraCrema.dataset.nombre,

            precio:
                Number(
                    extraCrema.dataset.precio
                )

        });

    }


    /* EXTRAS DE ELOTES */

    const extrasElote =
        document.querySelectorAll(
            ".extra-checkbox:checked"
        );


    extrasElote.forEach(extra => {

        extras.push({

            nombre:
                extra.dataset.nombre,

            precio:
                Number(
                    extra.dataset.precio
                )

        });

    });


    return extras;

}


/* =========================================
   CALCULAR TOTAL DEL MODAL
========================================= */

function calcularTotalModal() {

    if (!productoSeleccionado) {

        return;

    }


    const extras =
        obtenerExtrasSeleccionados();


    const totalExtras =
        extras.reduce(

            (total, extra) =>
                total + extra.precio,

            0

        );


    const precioUnidad =
        productoSeleccionado.precio +
        totalExtras;


    const total =
        precioUnidad *
        cantidadSeleccionada;


    document.getElementById(
        "total-modal"
    ).textContent =
        `$${total}`;

}


/* =========================================
   CONFIRMAR PRODUCTO
========================================= */

function confirmarProducto() {

    if (!productoSeleccionado) {

        return;

    }


    /* ================================
       SABRITA INCLUIDA
    ================================= */

    let sabritaIncluida = null;


    if (
        productoSeleccionado.incluyeSabrita === true
    ) {

        const seleccionIncluida =
            document.querySelector(
                'input[name="sabrita-incluida"]:checked'
            );


        if (!seleccionIncluida) {

            alert(
                "Selecciona el sabor de la Sabrita incluida."
            );

            return;

        }


        sabritaIncluida =
            seleccionIncluida.value;

    }


    /* ================================
       EXTRAS
    ================================= */

    const extras =
        obtenerExtrasSeleccionados();


    /* ================================
       REVISAR SI PIDIÓ SABRITA EXTRA
    ================================= */

    const tieneSabritaExtra =
        extras.some(

            extra =>
                extra.nombre === "Sabrita"

        );


    let sabritaExtra = null;


    if (tieneSabritaExtra) {

        const seleccionExtra =
            document.querySelector(
                'input[name="sabrita-extra"]:checked'
            );


        if (!seleccionExtra) {

            alert(
                "Selecciona el sabor de la Sabrita extra."
            );

            return;

        }


        sabritaExtra =
            seleccionExtra.value;

    }


    /* ================================
       CALCULAR PRECIO
    ================================= */

    const totalExtras =
        extras.reduce(

            (total, extra) =>
                total + extra.precio,

            0

        );


    const precioUnidad =
        productoSeleccionado.precio +
        totalExtras;


    /* ================================
       GUARDAR EN CARRITO
    ================================= */

    carrito.push({

        idCarrito:
            Date.now() +
            Math.floor(Math.random() * 1000),

        id:
            productoSeleccionado.id,

        nombre:
            productoSeleccionado.nombre,

        precioBase:
            productoSeleccionado.precio,

        precio:
            precioUnidad,

        cantidad:
            cantidadSeleccionada,

        extras:
            extras,

        sabritaIncluida:
            sabritaIncluida,

        sabritaExtra:
            sabritaExtra

    });


    actualizarCarrito();

    cerrarModal();

    mostrarCarrito();

}


/* =========================================
   CERRAR MODAL
========================================= */

function cerrarModal() {

    document
        .getElementById("fondo-modal")
        .classList.remove("visible");


    document
        .getElementById("modal-producto")
        .classList.remove("visible");


    productoSeleccionado = null;

    cantidadSeleccionada = 1;

}


/* =========================================
   ACTUALIZAR CARRITO
========================================= */

function actualizarCarrito() {

    const contenedor =
        document.getElementById(
            "productos-carrito"
        );


    const contador =
        document.getElementById(
            "contador-carrito"
        );


    const totalElemento =
        document.getElementById(
            "total"
        );


    contenedor.innerHTML = "";


    /* CARRITO VACÍO */

    if (carrito.length === 0) {

        contenedor.innerHTML = `

            <div class="carrito-vacio">

                <p>
                    Tu carrito está vacío.
                </p>

                <span>
                    Agrega algo rico del menú 🍓
                </span>

            </div>

        `;

    }


    /* MOSTRAR PRODUCTOS */

    carrito.forEach(producto => {

        let detalles = "";


        /* SABRITA INCLUIDA */

        if (producto.sabritaIncluida) {

            detalles += `

                <span>
                    Sabrita incluida:
                    ${producto.sabritaIncluida}
                </span>

                <br>

            `;

        }


        /* EXTRAS */

        if (
            producto.extras &&
            producto.extras.length > 0
        ) {

            producto.extras.forEach(extra => {

                detalles += `

                    <span>
                        + ${extra.nombre}
                        (+$${extra.precio})
                    </span>

                    <br>

                `;

            });

        }


        /* SABRITA EXTRA */

        if (producto.sabritaExtra) {

            detalles += `

                <span>
                    Sabor Sabrita extra:
                    ${producto.sabritaExtra}
                </span>

                <br>

            `;

        }


        contenedor.innerHTML += `

            <div class="item-carrito">

                <div>

                    <h4>
                        ${producto.nombre}
                    </h4>


                    <small>
                        ${detalles}
                    </small>


                    <p>
                        $${producto.precio * producto.cantidad}
                    </p>

                </div>


                <div class="controles-cantidad">

                    <button
                        onclick="cambiarCantidadCarrito(
                            ${producto.idCarrito},
                            -1
                        )"
                    >
                        −
                    </button>


                    <span>
                        ${producto.cantidad}
                    </span>


                    <button
                        onclick="cambiarCantidadCarrito(
                            ${producto.idCarrito},
                            1
                        )"
                    >
                        +
                    </button>

                </div>

            </div>

        `;

    });


    /* CANTIDAD TOTAL */

    const cantidadTotal =
        carrito.reduce(

            (total, producto) =>
                total + producto.cantidad,

            0

        );


    /* PRECIO TOTAL */

    const total =
        carrito.reduce(

            (total, producto) =>

                total +
                (
                    producto.precio *
                    producto.cantidad
                ),

            0

        );


    contador.textContent =
        cantidadTotal;


    totalElemento.textContent =
        `$${total}`;

}


/* =========================================
   CAMBIAR CANTIDAD EN CARRITO
========================================= */

function cambiarCantidadCarrito(
    idCarrito,
    cambio
) {

    const producto =
        carrito.find(

            producto =>
                producto.idCarrito === idCarrito

        );


    if (!producto) {

        return;

    }


    producto.cantidad += cambio;


    if (producto.cantidad <= 0) {

        carrito =
            carrito.filter(

                producto =>
                    producto.idCarrito !== idCarrito

            );

    }


    actualizarCarrito();

}


/* =========================================
   MOSTRAR CARRITO
========================================= */

function mostrarCarrito() {

    document
        .getElementById("carrito")
        .classList.add("visible");


    document
        .getElementById("fondo-carrito")
        .classList.add("visible");

}


/* =========================================
   CERRAR CARRITO
========================================= */

function cerrarCarrito() {

    document
        .getElementById("carrito")
        .classList.remove("visible");


    document
        .getElementById("fondo-carrito")
        .classList.remove("visible");

}


/* =========================================
   REALIZAR PEDIDO
========================================= */

function realizarPedido() {

    if (carrito.length === 0) {

        alert(
            "Primero agrega productos a tu pedido."
        );

        return;
    }


    const total = carrito.reduce(

        (acumulado, producto) =>

            acumulado +
            (
                producto.precio *
                producto.cantidad
            ),

        0
    );


    document.getElementById(
        "total-confirmacion"
    ).textContent = `$${total}`;


    cerrarCarrito();


    document.getElementById(
        "fondo-cliente"
    ).classList.add("visible");


    document.getElementById(
        "modal-cliente"
    ).classList.add("visible");

}

function cerrarFormularioCliente() {

    document.getElementById(
        "fondo-cliente"
    ).classList.remove("visible");


    document.getElementById(
        "modal-cliente"
    ).classList.remove("visible");

}


/* =========================================
   CONFIRMAR PEDIDO
========================================= */
const WHATSAPP_PIKAFRESA = "529983018627";
async function confirmarPedido() {

    const nombre = document
        .getElementById("nombre-cliente")
        .value
        .trim();

    const telefono = document
        .getElementById("telefono-cliente")
        .value
        .trim();


    /* =========================
       VALIDAR NOMBRE
    ========================= */

    if (nombre.length < 2) {

        alert("Ingresa un nombre válido.");

        return;
    }


    /* =========================
       VALIDAR TELÉFONO
    ========================= */

    if (!/^[0-9]{10}$/.test(telefono)) {

        alert(
            "Ingresa un número de WhatsApp de 10 dígitos."
        );

        return;
    }


    if (carrito.length === 0) {

        alert("Tu carrito está vacío.");

        return;
    }


    /* =========================
       PREPARAR PRODUCTOS
    ========================= */

    const productosPedido = carrito.map(producto => {

        return {

            id: producto.id,

            cantidad: producto.cantidad,

            extras: producto.extras.map(extra => {

                /*
                    IMPORTANTE:
                    no enviamos el precio del extra.
                    Solo enviamos su nombre.
                */

                return {
                    nombre: extra.nombre
                };

            }),

            sabritaIncluida:
                producto.sabritaIncluida,

            sabritaExtra:
                producto.sabritaExtra

        };

    });


    console.log(
        "Enviando pedido:",
        productosPedido
    );


    /* =========================
       ENVIAR A SUPABASE
    ========================= */

    const { data, error } =
        await supabaseCliente.rpc(
            "crear_pedido",
            {

                p_nombre_cliente:
                    nombre,

                p_telefono:
                    telefono,

                p_productos:
                    productosPedido

            }
        );


    /* =========================
       ERROR
    ========================= */

    if (error) {

        console.error(
            "Error al crear pedido:",
            error
        );

        alert(
            "No se pudo crear el pedido.\n\n" +
            error.message
        );

        return;
    }


    /* =========================
       PEDIDO CREADO
    ========================= */

    console.log(
        "Pedido creado:",
        data
    );


    console.log("Pedido creado:", data);


// ==========================================
// CREAR RESUMEN PARA WHATSAPP
// ==========================================

let mensajeWhatsApp =
    `Hola, realicé un pedido en Pikafresa.\n\n`;

mensajeWhatsApp +=
    `Pedido: ${data.numero_pedido}\n`;

mensajeWhatsApp +=
    `Cliente: ${nombre}\n`;

mensajeWhatsApp +=
    `WhatsApp: ${telefono}\n\n`;

mensajeWhatsApp +=
    `PRODUCTOS:\n`;


// Recorrer productos del carrito

carrito.forEach(producto => {

    mensajeWhatsApp +=
        `\n${producto.cantidad}x ${producto.nombre}\n`;


    // Extras

    if (
        producto.extras &&
        producto.extras.length > 0
    ) {

        producto.extras.forEach(extra => {

            mensajeWhatsApp +=
                `+ ${extra.nombre}\n`;

        });

    }


    // Sabrita incluida

    if (producto.sabritaIncluida) {

        mensajeWhatsApp +=
            `Sabrita incluida: ${producto.sabritaIncluida}\n`;

    }


    // Sabrita extra

    if (producto.sabritaExtra) {

        mensajeWhatsApp +=
            `Sabrita extra: ${producto.sabritaExtra}\n`;

    }

});


mensajeWhatsApp +=
    `\nTOTAL OFICIAL: $${data.total}`;

mensajeWhatsApp +=
    `\nPedido: ${data.numero_pedido}`;

mensajeWhatsApp +=
    `\n\nEl pedido ya fue registrado.`;


// ==========================================
// CREAR ENLACE DE WHATSAPP
// ==========================================

const enlaceWhatsApp =
    `https://wa.me/${WHATSAPP_PIKAFRESA}?text=${
        encodeURIComponent(mensajeWhatsApp)
    }`;


// ==========================================
// LIMPIAR CARRITO
// ==========================================

carrito = [];

actualizarCarrito();

cerrarFormularioCliente();


document.getElementById(
    "nombre-cliente"
).value = "";

document.getElementById(
    "telefono-cliente"
).value = "";


// ==========================================
// ABRIR WHATSAPP
// ==========================================

window.location.href = enlaceWhatsApp;

}

/* =========================================
   INICIAR PÁGINA
========================================= */

async function iniciarAplicacion() {

    await cargarProductosDesdeSupabase();

    await cargarExtrasDesdeSupabase();

    await cargarSabritasDesdeSupabase();

}   

iniciarAplicacion();