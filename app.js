/* =========================================================
   ISIPad:V
   Personal MIDI Pad
   APP.JS — v0.6

   Compatible con:
   index.html + estilos.css actuales

   FUNCIONES
   ---------------------------------------------------------
   MIDI
   AUTO PAD
   PAD MANUAL
   PAD PRESETS
   SAMPLES
   AUDIO
   PERILLAS MIDI CC
   MEMORIAS
   MODO CLASE
   PIANO 88 TECLAS
   SUSTAIN
   DETECTOR DE ACORDES
   ACORDES 7 / 9 / 11 / 13 / ALTERADOS
   INVERSIONES
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURACIÓN GENERAL
========================================================= */

const VERSION = "0.6";

const STORAGE_KEY = "isipadv_memories_v6";

const PAD_IDS = [
    "pad1",
    "pad2",
    "pad3",
    "pad4",
    "pad5",
    "pad6",
    "pad7",
    "pad8"
];

const CONTROL_IDS = [
    "reverb",
    "eqLow",
    "eqMid",
    "eqHigh",
    "delay"
];


/* =========================================================
   ESTADO GLOBAL
========================================================= */

const state = {

    midi: {
        access: null,
        input: null,
        inputs: [],
        connected: false
    },

    midiLearn: {
        type: null,
        target: null
    },

    autoPad: {
        active: false,
        notes: new Set()
    },

    pads: {},

    controls: {},

    memories: {
        1: null,
        2: null,
        3: null
    },

    selectedPad: "pad1",

    contextPad: null,

    contextControl: null,

    contextMemory: null,

    audio: {
        context: null,
        master: null
    },

    piano: {
        active: new Set(),
        held: new Set(),
        sustained: new Set(),
        sustain: false
    },

    classMode: {
        visible: false,
        detached: false
    }

};


/* =========================================================
   PRESETS DE PADS
========================================================= */

const PAD_PRESETS = {

    kick: {
        name: "Kick Deep",
        detail: "KICK · Drums",
        type: "kick"
    },

    snare: {
        name: "Snare Tight",
        detail: "SNARE · Drums",
        type: "snare"
    },

    hihat: {
        name: "Hi-Hat Closed",
        detail: "HI-HAT · Drums",
        type: "hihat"
    },

    clap: {
        name: "Clap Studio",
        detail: "CLAP · Drums",
        type: "clap"
    },

    perc: {
        name: "Percussion",
        detail: "PERC · Drums",
        type: "perc"
    },

    tom: {
        name: "Tom Low",
        detail: "TOM · Drums",
        type: "tom"
    },

    crash: {
        name: "Crash",
        detail: "CRASH · Cymbal",
        type: "crash"
    },

    fx: {
        name: "FX Hit",
        detail: "FX · Effects",
        type: "fx"
    },

    empty: {
        name: "Vacío",
        detail: "Sin sonido",
        type: "empty"
    }

};


/* =========================================================
   PRESETS SYNTH
========================================================= */

const SYNTH_PRESETS = {

    grand: {
        name: "Grand Piano",
        detail: "Banco: Piano"
    },

    warmPad: {
        name: "Warm Pad",
        detail: "Banco: Pad cálido"
    },

    brightPad: {
        name: "Bright Pad",
        detail: "Banco: Pad brillante"
    },

    worship: {
        name: "Worship Keys",
        detail: "Banco: Worship Keys"
    },

    electric: {
        name: "Electric Piano",
        detail: "Banco: Electric Piano"
    },

    organ: {
        name: "Organ",
        detail: "Banco: Organ"
    },

    strings: {
        name: "Strings",
        detail: "Banco: Strings"
    },

    ambient: {
        name: "Ambient",
        detail: "Banco: Ambient"
    }

};


/* =========================================================
   INICIALIZAR ESTADO DE PADS
========================================================= */

function inicializarPads() {

    const defaults = [
        "kick",
        "snare",
        "hihat",
        "clap",
        "empty",
        "empty",
        "empty",
        "empty"
    ];

    PAD_IDS.forEach((padId, index) => {

        state.pads[padId] = {

            midiNote: null,

            preset: defaults[index],

            sampleUrl: null,

            sampleName: null

        };

    });

}


/* =========================================================
   INICIALIZAR PERILLAS
========================================================= */

function inicializarControles() {

    CONTROL_IDS.forEach(controlId => {

        state.controls[controlId] = {

            value: 0,

            cc: null

        };

    });

}


/* =========================================================
   DOM
========================================================= */

const $ = selector => document.querySelector(selector);

const $$ = selector => [
    ...document.querySelectorAll(selector)
];


/* =========================================================
   MONITOR
========================================================= */

function monitor(mensaje) {

    const monitorElement = $("#monitor-midi");

    if (!monitorElement) return;

    const hora = new Date().toLocaleTimeString(
        "es-CO",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

    const linea =
        `[${hora}] ${mensaje}`;

    const actual = monitorElement.textContent
        ? monitorElement.textContent
            .split("\n")
            .filter(Boolean)
        : [];

    actual.push(linea);

    while (actual.length > 35) {
        actual.shift();
    }

    monitorElement.textContent =
        actual.join("\n");

}


/* =========================================================
   ESTADO MIDI
========================================================= */

function establecerEstadoMIDI(
    texto,
    conectado = false
) {

    const estado = $("#estado-midi");

    if (!estado) return;

    estado.textContent = texto;

    estado.classList.toggle(
        "conectado",
        conectado
    );

    estado.classList.toggle(
        "desconectado",
        !conectado
    );

}


/* =========================================================
   NOMBRE DE NOTA
========================================================= */

function nombreNota(numero) {

    const nombres = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B"
    ];

    const nota = nombres[
        numero % 12
    ];

    const octava =
        Math.floor(numero / 12) - 1;

    return `${nota}${octava}`;

}


/* =========================================================
   NOMBRE DE PITCH CLASS
========================================================= */

function nombrePitchClass(pc) {

    const nombres = [
        "C",
        "C#",
        "D",
        "Eb",
        "E",
        "F",
        "F#",
        "G",
        "Ab",
        "A",
        "Bb",
        "B"
    ];

    return nombres[
        ((pc % 12) + 12) % 12
    ];

}


/* =========================================================
   WEB MIDI
========================================================= */

async function iniciarMIDI() {

    if (!navigator.requestMIDIAccess) {

        establecerEstadoMIDI(
            "MIDI no disponible",
            false
        );

        monitor(
            "Web MIDI no está disponible en este navegador."
        );

        return;

    }

    try {

        state.midi.access =
            await navigator.requestMIDIAccess({
                sysex: false
            });

        state.midi.access.onstatechange =
            manejarCambioMIDI;

        actualizarDispositivosMIDI();

        monitor(
            "Sistema MIDI inicializado."
        );

    } catch (error) {

        console.error(error);

        establecerEstadoMIDI(
            "Error MIDI",
            false
        );

        monitor(
            `Error iniciando MIDI: ${error.message}`
        );

    }

}


/* =========================================================
   ACTUALIZAR DISPOSITIVOS MIDI
========================================================= */

function actualizarDispositivosMIDI() {

    if (!state.midi.access) return;

    const selector =
        $("#dispositivos-midi");

    if (!selector) return;

    const inputs = [
        ...state.midi.access.inputs.values()
    ];

    state.midi.inputs = inputs;

    selector.innerHTML = "";

    const opcionInicial =
        document.createElement("option");

    opcionInicial.value = "";

    opcionInicial.textContent =
        inputs.length
            ? "Seleccionar dispositivo..."
            : "No hay dispositivos MIDI";

    selector.appendChild(
        opcionInicial
    );


    inputs.forEach(input => {

        const option =
            document.createElement("option");

        option.value = input.id;

        option.textContent =
            input.name ||
            `MIDI Input ${input.id}`;

        selector.appendChild(option);

    });


    if (inputs.length) {

        const actual = inputs.find(
            input =>
                state.midi.input &&
                input.id === state.midi.input.id
        );

        if (actual) {

            selector.value =
                actual.id;

        } else {

            conectarMIDIInput(
                inputs[0].id
            );

        }

    } else {

        state.midi.input = null;

        state.midi.connected = false;

        establecerEstadoMIDI(
            "MIDI esperando",
            false
        );

        const controlador =
            $("#controlador-detectado");

        if (controlador) {

            controlador.textContent =
                "Controlador: ninguno conectado";

        }

        actualizarEstadoAutoPad(
            "Auto Pad: esperando controlador",
            "normal"
        );

    }

}


/* =========================================================
   CONECTAR INPUT
========================================================= */

function conectarMIDIInput(id) {

    if (!state.midi.access) return;

    const input =
        state.midi.access.inputs.get(id);

    if (!input) return;


    if (state.midi.input) {

        state.midi.input.onmidimessage = null;

    }


    state.midi.input = input;

    state.midi.input.onmidimessage =
        manejarMensajeMIDI;

    state.midi.connected = true;


    establecerEstadoMIDI(
        "MIDI conectado",
        true
    );


    const controlador =
        $("#controlador-detectado");

    if (controlador) {

        controlador.innerHTML =
            `Controlador: <strong>${escaparHTML(
                input.name || "MIDI"
            )}</strong>`;

    }


    const selector =
        $("#dispositivos-midi");

    if (selector) {

        selector.value =
            input.id;

    }


    monitor(
        `Entrada conectada: ${input.name || input.id}`
    );


    actualizarEstadoAutoPad(
        state.autoPad.active
            ? "Auto Pad: toca los 8 pads"
            : obtenerEstadoAutoPadTexto(),
        state.autoPad.active
            ? "busqueda"
            : state.autoPad.notes.size >= 8
                ? "exito"
                : "normal"
    );

}


/* =========================================================
   CAMBIO DE DISPOSITIVO
========================================================= */

function manejarCambioMIDI(evento) {

    monitor(
        `MIDI: ${evento.port.name || "dispositivo"} · ${evento.port.state}`
    );

    actualizarDispositivosMIDI();

}


/* =========================================================
   MANEJAR MENSAJE MIDI
========================================================= */

function manejarMensajeMIDI(evento) {

    const data = evento.data;

    if (!data || data.length < 2) return;

    const estado =
        data[0] & 0xF0;

    const canal =
        (data[0] & 0x0F) + 1;

    const numero =
        data[1];

    const valor =
        data.length > 2
            ? data[2]
            : 0;


    switch (estado) {

        case 0x90:

            if (valor > 0) {

                manejarNoteOn(
                    numero,
                    valor,
                    canal
                );

            } else {

                manejarNoteOff(
                    numero,
                    canal
                );

            }

            break;


        case 0x80:

            manejarNoteOff(
                numero,
                canal
            );

            break;


        case 0xB0:

            manejarCC(
                numero,
                valor,
                canal
            );

            break;

    }

}


/* =========================================================
   NOTE ON
========================================================= */

function manejarNoteOn(
    numero,
    velocity,
    canal
) {

    const nombre =
        nombreNota(numero);


    actualizarInformacionNota(
        nombre,
        numero,
        velocity
    );


    monitor(
        `NOTE ON · ${nombre} · ${numero} · Vel ${velocity} · Ch ${canal}`
    );


    if (state.midiLearn.type === "pad") {

        aprenderPad(
            state.midiLearn.target,
            numero
        );

        return;

    }


    if (state.autoPad.active) {

        aprenderAutoPad(
            numero
        );

    }


    if (
        state.midiLearn.type === "cc"
    ) {

        return;

    }


    activarPadPorMIDI(
        numero,
        velocity
    );


    pianoNoteOn(
        numero
    );

}


/* =========================================================
   NOTE OFF
========================================================= */

function manejarNoteOff(
    numero,
    canal
) {

    monitor(
        `NOTE OFF · ${nombreNota(numero)} · ${numero} · Ch ${canal}`
    );


    liberarPadPorMIDI(
        numero
    );


    pianoNoteOff(
        numero
    );

}


/* =========================================================
   INFORMACIÓN DE NOTA
========================================================= */

function actualizarInformacionNota(
    nombre,
    numero,
    velocity
) {

    const nota =
        $("#nota-midi");

    const numeroElemento =
        $("#numero-midi");

    const velocidad =
        $("#velocidad-midi");


    if (nota) {
        nota.textContent = nombre;
    }

    if (numeroElemento) {
        numeroElemento.textContent = numero;
    }

    if (velocidad) {
        velocidad.textContent = velocity;
    }

}


/* =========================================================
   AUTO PAD
========================================================= */

function iniciarAutoPad() {

    state.autoPad.active = true;

    state.autoPad.notes.clear();


    PAD_IDS.forEach(padId => {

        state.pads[padId].midiNote = null;

    });


    actualizarTodosLosPads();


    actualizarEstadoAutoPad(
        "Auto Pad: toca los 8 pads del controlador",
        "busqueda"
    );


    monitor(
        "Auto Pad iniciado. Esperando 8 notas MIDI diferentes."
    );

}


/* =========================================================
   APRENDER AUTO PAD
========================================================= */

function aprenderAutoPad(numero) {

    if (!state.autoPad.active) return;


    if (
        state.autoPad.notes.has(numero)
    ) {

        return;

    }


    if (
        state.autoPad.notes.size >= PAD_IDS.length
    ) {

        state.autoPad.active = false;

        return;

    }


    state.autoPad.notes.add(numero);


    const index =
        state.autoPad.notes.size - 1;

    const padId =
        PAD_IDS[index];


    state.pads[padId].midiNote =
        numero;


    actualizarPad(
        padId
    );


    monitor(
        `Auto Pad · ${padId.toUpperCase()} = ${nombreNota(numero)} (${numero})`
    );


    const cantidad =
        state.autoPad.notes.size;


    if (
        cantidad >= PAD_IDS.length
    ) {

        state.autoPad.active = false;

        actualizarEstadoAutoPad(
            "Auto Pad: 8 pads detectados correctamente",
            "exito"
        );

        monitor(
            "Auto Pad finalizado."
        );

    } else {

        actualizarEstadoAutoPad(
            `Auto Pad: ${cantidad}/8 pads detectados · toca el siguiente`,
            "busqueda"
        );

    }

}


/* =========================================================
   ESTADO AUTO PAD
========================================================= */

function actualizarEstadoAutoPad(
    texto,
    estado
) {

    const elemento =
        $("#estado-auto-pad");

    const contenedor =
        document.querySelector(
            ".auto-pad-status"
        );


    if (elemento) {

        elemento.textContent =
            texto;

    }


    if (contenedor) {

        contenedor.classList.remove(
            "busqueda",
            "exito"
        );

        if (
            estado === "busqueda"
        ) {

            contenedor.classList.add(
                "busqueda"
            );

        }

        if (
            estado === "exito"
        ) {

            contenedor.classList.add(
                "exito"
            );

        }

    }

}


/* =========================================================
   TEXTO AUTO PAD
========================================================= */

function obtenerEstadoAutoPadTexto() {

    const cantidad =
        PAD_IDS.filter(
            id =>
                state.pads[id].midiNote !== null
        ).length;


    if (cantidad >= 8) {

        return "Auto Pad: 8 pads configurados";

    }


    if (cantidad > 0) {

        return `Auto Pad: ${cantidad}/8 pads configurados`;

    }


    return "Auto Pad: esperando configuración";

}


/* =========================================================
   ACTIVAR PAD POR MIDI
========================================================= */

function activarPadPorMIDI(
    numero,
    velocity
) {

    const padId =
        PAD_IDS.find(
            id =>
                state.pads[id].midiNote === numero
        );


    if (!padId) return;


    dispararPad(
        padId,
        velocity
    );

}


/* =========================================================
   LIBERAR PAD
========================================================= */

function liberarPadPorMIDI(
    numero
) {

    const padId =
        PAD_IDS.find(
            id =>
                state.pads[id].midiNote === numero
        );


    if (!padId) return;

    quitarEstadoVisualPad(
        padId
    );

}


/* =========================================================
   PAD MANUAL
========================================================= */

function aprenderPad(
    padId,
    numero
) {

    if (!padId) {

        cancelarLearnMIDI();

        return;

    }


    state.pads[padId].midiNote =
        numero;


    cancelarLearnMIDI();


    actualizarPad(
        padId
    );


    monitor(
        `${padId.toUpperCase()} asignado a ${nombreNota(numero)} (${numero})`
    );


    actualizarEstadoAutoPad(
        obtenerEstadoAutoPadTexto(),
        PAD_IDS.filter(
            id =>
                state.pads[id].midiNote !== null
        ).length >= 8
            ? "exito"
            : "normal"
    );

}


/* =========================================================
   DISPARAR PAD
========================================================= */

function dispararPad(
    padId,
    velocity = 100
) {

    const pad =
        state.pads[padId];

    if (!pad) return;


    const boton =
        document.querySelector(
            `.pad-config[data-pad-id="${padId}"] .drum-pad`
        );


    if (boton) {

        boton.classList.remove(
            "activo"
        );

        void boton.offsetWidth;

        boton.classList.add(
            "activo"
        );


        setTimeout(() => {

            boton.classList.remove(
                "activo"
            );

        }, 120);

    }


    reproducirSonidoPad(
        pad,
        velocity
    );

}


/* =========================================================
   SONIDO PAD
========================================================= */

function reproducirSonidoPad(
    pad,
    velocity
) {

    if (!pad) return;


    iniciarAudio();


    const volumen =
        Math.max(
            0.05,
            Math.min(
                1,
                velocity / 127
            )
        );


    if (pad.sampleUrl) {

        reproducirSample(
            pad.sampleUrl,
            volumen
        );

        return;

    }


    const preset =
        PAD_PRESETS[pad.preset];


    if (!preset) return;


    switch (preset.type) {

        case "kick":
            sonidoKick(volumen);
            break;

        case "snare":
            sonidoSnare(volumen);
            break;

        case "hihat":
            sonidoHiHat(volumen);
            break;

        case "clap":
            sonidoClap(volumen);
            break;

        case "perc":
            sonidoPerc(volumen);
            break;

        case "tom":
            sonidoTom(volumen);
            break;

        case "crash":
            sonidoCrash(volumen);
            break;

        case "fx":
            sonidoFX(volumen);
            break;

    }

}


/* =========================================================
   AUDIO CONTEXT
========================================================= */

function iniciarAudio() {

    if (state.audio.context) {

        if (
            state.audio.context.state ===
            "suspended"
        ) {

            state.audio.context.resume();

        }

        return;

    }


    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;


    if (!AudioContextClass) {

        monitor(
            "Web Audio no está disponible."
        );

        return;

    }


    const context =
        new AudioContextClass();


    const master =
        context.createGain();


    master.gain.value = 0.75;


    master.connect(
        context.destination
    );


    state.audio.context =
        context;

    state.audio.master =
        master;

}


/* =========================================================
   REPRODUCIR SAMPLE
========================================================= */

function reproducirSample(
    url,
    volumen
) {

    const audio =
        new Audio(url);

    audio.volume =
        Math.max(
            0,
            Math.min(
                1,
                volumen
            )
        );

    audio.currentTime = 0;

    audio.play().catch(
        () => {}
    );

}


/* =========================================================
   KICK
========================================================= */

function sonidoKick(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const osc =
        ctx.createOscillator();

    const gain =
        ctx.createGain();


    const ahora =
        ctx.currentTime;


    osc.type = "sine";


    osc.frequency.setValueAtTime(
        145,
        ahora
    );

    osc.frequency.exponentialRampToValueAtTime(
        48,
        ahora + 0.12
    );


    gain.gain.setValueAtTime(
        Math.max(
            0.001,
            volumen * 0.9
        ),
        ahora
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.45
    );


    osc.connect(gain);
    gain.connect(master);


    osc.start(ahora);
    osc.stop(ahora + 0.46);

}


/* =========================================================
   NOISE BUFFER
========================================================= */

function crearNoiseBuffer(
    duracion = 0.5
) {

    const ctx =
        state.audio.context;

    const buffer =
        ctx.createBuffer(
            1,
            ctx.sampleRate * duracion,
            ctx.sampleRate
        );


    const datos =
        buffer.getChannelData(0);


    for (
        let i = 0;
        i < datos.length;
        i++
    ) {

        datos[i] =
            Math.random() * 2 - 1;

    }


    return buffer;

}


/* =========================================================
   SNARE
========================================================= */

function sonidoSnare(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    const noise =
        ctx.createBufferSource();

    noise.buffer =
        crearNoiseBuffer(0.25);


    const filtro =
        ctx.createBiquadFilter();

    filtro.type =
        "highpass";

    filtro.frequency.value =
        1400;


    const gainNoise =
        ctx.createGain();


    gainNoise.gain.setValueAtTime(
        volumen * 0.65,
        ahora
    );

    gainNoise.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.22
    );


    noise
        .connect(filtro)
        .connect(gainNoise)
        .connect(master);


    noise.start(ahora);
    noise.stop(ahora + 0.24);


    const osc =
        ctx.createOscillator();

    const gainOsc =
        ctx.createGain();


    osc.type = "triangle";

    osc.frequency.value =
        180;


    gainOsc.gain.setValueAtTime(
        volumen * 0.25,
        ahora
    );

    gainOsc.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.13
    );


    osc
        .connect(gainOsc)
        .connect(master);


    osc.start(ahora);
    osc.stop(ahora + 0.14);

}


/* =========================================================
   HI-HAT
========================================================= */

function sonidoHiHat(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    const noise =
        ctx.createBufferSource();

    noise.buffer =
        crearNoiseBuffer(0.12);


    const filtro =
        ctx.createBiquadFilter();

    filtro.type =
        "highpass";

    filtro.frequency.value =
        6500;


    const gain =
        ctx.createGain();


    gain.gain.setValueAtTime(
        volumen * 0.32,
        ahora
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.09
    );


    noise
        .connect(filtro)
        .connect(gain)
        .connect(master);


    noise.start(ahora);
    noise.stop(ahora + 0.1);

}


/* =========================================================
   CLAP
========================================================= */

function sonidoClap(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    [0, 0.018, 0.036].forEach(
        offset => {

            const noise =
                ctx.createBufferSource();

            noise.buffer =
                crearNoiseBuffer(0.12);


            const filtro =
                ctx.createBiquadFilter();

            filtro.type =
                "bandpass";

            filtro.frequency.value =
                1800;


            const gain =
                ctx.createGain();


            const inicio =
                ahora + offset;


            gain.gain.setValueAtTime(
                volumen * 0.28,
                inicio
            );

            gain.gain.exponentialRampToValueAtTime(
                0.001,
                inicio + 0.08
            );


            noise
                .connect(filtro)
                .connect(gain)
                .connect(master);


            noise.start(inicio);
            noise.stop(inicio + 0.09);

        }
    );

}


/* =========================================================
   PERCUSIÓN
========================================================= */

function sonidoPerc(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    const osc =
        ctx.createOscillator();

    const gain =
        ctx.createGain();


    osc.type =
        "triangle";

    osc.frequency.setValueAtTime(
        260,
        ahora
    );

    osc.frequency.exponentialRampToValueAtTime(
        120,
        ahora + 0.13
    );


    gain.gain.setValueAtTime(
        volumen * 0.4,
        ahora
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.18
    );


    osc
        .connect(gain)
        .connect(master);


    osc.start(ahora);
    osc.stop(ahora + 0.2);

}


/* =========================================================
   TOM
========================================================= */

function sonidoTom(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    const osc =
        ctx.createOscillator();

    const gain =
        ctx.createGain();


    osc.type =
        "sine";


    osc.frequency.setValueAtTime(
        180,
        ahora
    );

    osc.frequency.exponentialRampToValueAtTime(
        85,
        ahora + 0.3
    );


    gain.gain.setValueAtTime(
        volumen * 0.55,
        ahora
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.4
    );


    osc
        .connect(gain)
        .connect(master);


    osc.start(ahora);
    osc.stop(ahora + 0.42);

}


/* =========================================================
   CRASH
========================================================= */

function sonidoCrash(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    const noise =
        ctx.createBufferSource();

    noise.buffer =
        crearNoiseBuffer(1.3);


    const filtro =
        ctx.createBiquadFilter();

    filtro.type =
        "highpass";

    filtro.frequency.value =
        4200;


    const gain =
        ctx.createGain();


    gain.gain.setValueAtTime(
        volumen * 0.3,
        ahora
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 1.1
    );


    noise
        .connect(filtro)
        .connect(gain)
        .connect(master);


    noise.start(ahora);
    noise.stop(ahora + 1.15);

}


/* =========================================================
   FX
========================================================= */

function sonidoFX(
    volumen
) {

    const ctx =
        state.audio.context;

    const master =
        state.audio.master;

    if (!ctx || !master) return;


    const ahora =
        ctx.currentTime;


    const osc =
        ctx.createOscillator();

    const gain =
        ctx.createGain();


    osc.type =
        "sawtooth";


    osc.frequency.setValueAtTime(
        180,
        ahora
    );

    osc.frequency.exponentialRampToValueAtTime(
        1000,
        ahora + 0.45
    );


    gain.gain.setValueAtTime(
        volumen * 0.18,
        ahora
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ahora + 0.55
    );


    osc
        .connect(gain)
        .connect(master);


    osc.start(ahora);
    osc.stop(ahora + 0.58);

}


/* =========================================================
   ACTUALIZAR PAD
========================================================= */

function actualizarPad(
    padId
) {

    const pad =
        state.pads[padId];

    if (!pad) return;


    const contenedor =
        document.querySelector(
            `.pad-config[data-pad-id="${padId}"]`
        );

    if (!contenedor) return;


    const asignacion =
        contenedor.querySelector(
            ".asignacion-pad"
        );


    const preset =
        PAD_PRESETS[pad.preset];


    let texto = "";


    if (pad.midiNote !== null) {

        texto =
            `MIDI: ${nombreNota(
                pad.midiNote
            )}`;

    } else {

        texto =
            "MIDI —";

    }


    if (pad.sampleName) {

        texto +=
            ` · ${pad.sampleName}`;

    } else if (preset) {

        texto +=
            ` · ${preset.name}`;

    }


    if (asignacion) {

        asignacion.textContent =
            texto;

    }


    actualizarDisplayPad(
        padId
    );

}


/* =========================================================
   ACTUALIZAR TODOS LOS PADS
========================================================= */

function actualizarTodosLosPads() {

    PAD_IDS.forEach(
        actualizarPad
    );

}


/* =========================================================
   DISPLAY PAD
========================================================= */

function actualizarDisplayPad(
    padId = state.selectedPad
) {

    const pad =
        state.pads[padId];

    if (!pad) return;


    const preset =
        PAD_PRESETS[pad.preset];


    const displayPreset =
        $("#display-pad-preset");

    const displayDetalle =
        $("#display-pad-detalle");

    const selector =
        $("#selector-pad-destino");


    if (selector) {

        selector.value =
            padId;

    }


    if (displayPreset) {

        displayPreset.textContent =
            pad.sampleName ||
            (
                preset
                    ? preset.name
                    : "Vacío"
            );

    }


    if (displayDetalle) {

        if (pad.midiNote !== null) {

            displayDetalle.textContent =
                `${preset?.detail || "Sin sonido"} · MIDI ${nombreNota(
                    pad.midiNote
                )}`;

        } else {

            displayDetalle.textContent =
                preset?.detail ||
                "Sin sonido";

        }

    }


    actualizarSelectorPresetDesdePad(
        padId
    );

}


/* =========================================================
   SELECTOR PRESET PAD
========================================================= */

function llenarSelectorPadPresets() {

    const selector =
        $("#selector-pad-preset");

    if (!selector) return;


    selector.innerHTML = "";


    Object.entries(
        PAD_PRESETS
    ).forEach(
        ([key, preset]) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                key;

            option.textContent =
                preset.name;

            selector.appendChild(
                option
            );

        }
    );


    actualizarSelectorPresetDesdePad(
        state.selectedPad
    );

}


/* =========================================================
   SINCRONIZAR SELECTOR PAD
========================================================= */

function actualizarSelectorPresetDesdePad(
    padId
) {

    const selector =
        $("#selector-pad-preset");

    if (!selector) return;


    const pad =
        state.pads[padId];

    if (!pad) return;


    selector.value =
        pad.preset || "empty";

}


/* =========================================================
   CAMBIAR PRESET PAD
========================================================= */

function cambiarPresetPad(
    padId,
    presetKey
) {

    const pad =
        state.pads[padId];

    if (!pad) return;


    if (!PAD_PRESETS[presetKey]) return;


    pad.preset =
        presetKey;

    pad.sampleUrl =
        null;

    pad.sampleName =
        null;


    actualizarPad(
        padId
    );


    monitor(
        `${padId.toUpperCase()} · preset: ${PAD_PRESETS[presetKey].name}`
    );

}


/* =========================================================
   QUITAR SONIDO
========================================================= */

function quitarSonidoPad(
    padId
) {

    const pad =
        state.pads[padId];

    if (!pad) return;


    pad.preset =
        "empty";

    pad.sampleUrl =
        null;

    pad.sampleName =
        null;


    actualizarPad(
        padId
    );


    monitor(
        `${padId.toUpperCase()} · sonido eliminado`
    );

}


/* =========================================================
   CARGAR SAMPLE
========================================================= */

function abrirSelectorSample() {

    const input =
        $("#input-sample-pad");

    if (!input) return;


    input.value = "";

    input.click();

}


/* =========================================================
   SAMPLE SELECCIONADO
========================================================= */

function manejarSampleSeleccionado(
    evento
) {

    const archivo =
        evento.target.files?.[0];

    const padId =
        state.contextPad;


    if (!archivo || !padId) return;


    const pad =
        state.pads[padId];

    if (!pad) return;


    if (pad.sampleUrl) {

        URL.revokeObjectURL(
            pad.sampleUrl
        );

    }


    const url =
        URL.createObjectURL(
            archivo
        );


    pad.sampleUrl =
        url;

    pad.sampleName =
        archivo.name;

    pad.preset =
        "empty";


    actualizarPad(
        padId
    );


    monitor(
        `${padId.toUpperCase()} · sample cargado: ${archivo.name}`
    );

}


/* =========================================================
   PERILLAS
========================================================= */

function inicializarPerillas() {

    CONTROL_IDS.forEach(
        controlId => {

            actualizarPerilla(
                controlId
            );

        }
    );

}


/* =========================================================
   ACTUALIZAR PERILLA
========================================================= */

function actualizarPerilla(
    controlId
) {

    const control =
        state.controls[controlId];

    if (!control) return;


    const contenedor =
        document.querySelector(
            `.perilla-contenedor[data-control="${controlId}"]`
        );

    if (!contenedor) return;


    const perilla =
        contenedor.querySelector(
            ".perilla"
        );

    const valor =
        contenedor.querySelector(
            ".valor-perilla"
        );

    const info =
        contenedor.querySelector(
            ".cc-info"
        );


    const porcentaje =
        Math.round(
            control.value / 127 * 100
        );


    if (valor) {

        valor.textContent =
            `${porcentaje}%`;

    }


    if (perilla) {

        const grados =
            -135 +
            (
                control.value / 127
            ) * 270;

        perilla.style.transform =
            `rotate(${grados}deg)`;

    }


    if (info) {

        info.textContent =
            control.cc === null
                ? "MIDI CC —"
                : `MIDI CC ${control.cc}`;

    }

}


/* =========================================================
   CAMBIAR VALOR PERILLA
========================================================= */

function establecerValorPerilla(
    controlId,
    valor
) {

    if (!state.controls[controlId])
        return;


    state.controls[controlId].value =
        Math.max(
            0,
            Math.min(
                127,
                Math.round(valor)
            )
        );


    actualizarPerilla(
        controlId
    );

}


/* =========================================================
   DRAG PERILLAS
========================================================= */

function configurarPerilla(
    contenedor
) {

    const controlId =
        contenedor.dataset.control;

    const perilla =
        contenedor.querySelector(
            ".perilla"
        );


    if (!controlId || !perilla)
        return;


    let activo = false;

    let ultimoY = 0;


    const comenzar = evento => {

        activo = true;

        ultimoY =
            obtenerY(evento);

        perilla.setPointerCapture?.(
            evento.pointerId
        );

        iniciarAudio();

    };


    const mover = evento => {

        if (!activo) return;


        const y =
            obtenerY(evento);


        const diferencia =
            ultimoY - y;


        if (
            Math.abs(diferencia) < 1
        ) {

            return;

        }


        ultimoY = y;


        establecerValorPerilla(
            controlId,
            state.controls[controlId].value +
            diferencia * 0.7
        );

    };


    const terminar = () => {

        activo = false;

    };


    perilla.addEventListener(
        "pointerdown",
        comenzar
    );

    perilla.addEventListener(
        "pointermove",
        mover
    );

    perilla.addEventListener(
        "pointerup",
        terminar
    );

    perilla.addEventListener(
        "pointercancel",
        terminar
    );


    perilla.addEventListener(
        "dblclick",
        () => {

            establecerValorPerilla(
                controlId,
                0
            );

        }
    );

}


function obtenerY(evento) {

    if (
        evento.touches &&
        evento.touches.length
    ) {

        return evento.touches[0].clientY;

    }

    return evento.clientY;

}


/* =========================================================
   MIDI CC
========================================================= */

function manejarCC(
    numero,
    valor,
    canal
) {

    monitor(
        `CC ${numero} · Valor ${valor} · Ch ${canal}`
    );


    if (
        state.midiLearn.type === "cc"
    ) {

        aprenderCC(
            state.midiLearn.target,
            numero
        );

        establecerValorPerilla(
            state.midiLearn.target,
            valor
        );

        return;

    }


    if (numero === 64) {

        manejarSustain(
            valor >= 64
        );

        return;

    }


    CONTROL_IDS.forEach(
        controlId => {

            const control =
                state.controls[controlId];

            if (
                control.cc === numero
            ) {

                establecerValorPerilla(
                    controlId,
                    valor
                );

            }

        }
    );

}


/* =========================================================
   APRENDER CC
========================================================= */

function aprenderCC(
    controlId,
    cc
) {

    if (!state.controls[controlId])
        return;


    state.controls[controlId].cc =
        cc;


    cancelarLearnMIDI();


    actualizarPerilla(
        controlId
    );


    monitor(
        `${controlId.toUpperCase()} asignado a MIDI CC ${cc}`
    );

}


/* =========================================================
   MODO LEARN
========================================================= */

function iniciarLearnPad(
    padId
) {

    state.midiLearn.type =
        "pad";

    state.midiLearn.target =
        padId;


    ocultarMenus();


    actualizarEstadoAutoPad(
        `Asignación manual: toca el pad para ${padId.toUpperCase()}`,
        "busqueda"
    );


    monitor(
        `Esperando MIDI para asignar ${padId.toUpperCase()}...`
    );

}


function iniciarLearnCC(
    controlId
) {

    state.midiLearn.type =
        "cc";

    state.midiLearn.target =
        controlId;


    ocultarMenus();


    monitor(
        `Mueve un controlador MIDI para asignar CC a ${controlId.toUpperCase()}...`
    );

}


function cancelarLearnMIDI() {

    state.midiLearn.type =
        null;

    state.midiLearn.target =
        null;


    actualizarEstadoAutoPad(
        obtenerEstadoAutoPadTexto(),
        PAD_IDS.filter(
            id =>
                state.pads[id].midiNote !== null
        ).length >= 8
            ? "exito"
            : "normal"
    );

}


/* =========================================================
   MODO CLASE
========================================================= */

function abrirModoClase() {

    const panel =
        $("#modo-clase");

    if (!panel) return;


    panel.hidden = false;

    state.classMode.visible =
        true;


    construirPiano();


    actualizarEstadoModoClase(
        "Modo Clase activo · Piano de 88 teclas"
    );


    monitor(
        "Modo Clase abierto."
    );

}


function cerrarModoClase() {

    const panel =
        $("#modo-clase");

    if (!panel) return;


    panel.hidden = true;

    state.classMode.visible =
        false;

}


function alternarModoClase() {

    if (
        state.classMode.visible
    ) {

        cerrarModoClase();

    } else {

        abrirModoClase();

    }

}


/* =========================================================
   PIANO 88 TECLAS
========================================================= */

function construirPiano() {

    const teclado =
        $("#teclado-clase");

    if (!teclado) return;


    teclado.innerHTML = "";


    const blancas = [];

    for (
        let midi = 21;
        midi <= 108;
        midi++
    ) {

        if (!esTeclaNegra(midi)) {

            blancas.push(midi);

        }

    }


    const cantidadBlancas =
        blancas.length;


    const anchoBlanca =
        100 / cantidadBlancas;


    blancas.forEach(
        (midi, index) => {

            const tecla =
                document.createElement(
                    "div"
                );


            tecla.className =
                "tecla-clase";


            if (
                midi % 12 === 0
            ) {

                tecla.classList.add(
                    "es-c"
                );

            }


            tecla.dataset.midi =
                midi;


            tecla.style.left =
                `${index * anchoBlanca}%`;


            tecla.style.width =
                `${anchoBlanca}%`;


            const etiqueta =
                document.createElement(
                    "span"
                );


            etiqueta.className =
                "etiqueta-tecla";


            etiqueta.textContent =
                nombreNota(midi);


            tecla.appendChild(
                etiqueta
            );


            teclado.appendChild(
                tecla
            );

        }
    );


    const posicionesNegras =
        calcularPosicionesNegras(
            blancas
        );


    posicionesNegras.forEach(
        posicion => {

            const tecla =
                document.createElement(
                    "div"
                );


            tecla.className =
                "tecla-negra-clase";


            tecla.dataset.midi =
                posicion.midi;


            tecla.style.left =
                `${posicion.left}%`;


            tecla.style.width =
                `${anchoBlanca * 0.62}%`;


            teclado.appendChild(
                tecla
            );

        }
    );


    actualizarVisualPiano();

}


/* =========================================================
   TECLA NEGRA
========================================================= */

function esTeclaNegra(
    midi
) {

    const pc =
        midi % 12;


    return [
        1,
        3,
        6,
        8,
        10
    ].includes(pc);

}


/* =========================================================
   POSICIONES TECLAS NEGRAS
========================================================= */

function calcularPosicionesNegras(
    blancas
) {

    const resultados = [];

    const total =
        blancas.length;

    const ancho =
        100 / total;


    blancas.forEach(
        (midi, index) => {

            const siguiente =
                midi + 1;


            if (
                siguiente > 108
            ) return;


            if (
                !esTeclaNegra(siguiente)
            ) return;


            resultados.push({

                midi: siguiente,

                left:
                    (
                        index + 1
                    ) *
                    ancho -
                    (
                        ancho * 0.31
                    )

            });

        }
    );


    return resultados;

}


/* =========================================================
   PIANO NOTE ON
========================================================= */

function pianoNoteOn(midi) {

    if (midi < 21 || midi > 108) {
        return;
    }

    state.piano.held.add(midi);

    state.piano.sustained.delete(midi);

    state.piano.active.add(midi);

    actualizarVisualPiano();

    actualizarAcorde();
}


function pianoNoteOff(midi) {

    if (midi < 21 || midi > 108) {
        return;
    }

    state.piano.held.delete(midi);


    if (state.piano.sustain) {

        state.piano.sustained.add(midi);

        state.piano.active.add(midi);

    } else {

        state.piano.sustained.delete(midi);

        state.piano.active.delete(midi);

    }


    actualizarVisualPiano();

    actualizarAcorde();
}


/* =========================================================
   PIANO NOTE OFF
========================================================= */

function pianoNoteOff(
    midi
) {

    state.piano.held.delete(
        midi
    );


    if (
        state.piano.sustain
    ) {

        state.piano.sustained.add(
            midi
        );

    } else {

        state.piano.active.delete(
            midi
        );

    }


    actualizarVisualPiano();

    actualizarAcorde();

}


/* =========================================================
   SUSTAIN
========================================================= */

function manejarSustain(
    activo
) {

    if (
        state.piano.sustain === activo
    ) {

        return;

    }


    state.piano.sustain =
        activo;


    const indicador =
        $("#sustain-clase");


    if (indicador) {

        indicador.classList.toggle(
            "activo",
            activo
        );


        const strong =
            indicador.querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                activo
                    ? "ON"
                    : "OFF";

        }

    }


    if (!activo) {

        state.piano.sustained.forEach(
            midi => {

                if (
                    !state.piano.held.has(
                        midi
                    )
                ) {

                    state.piano.active.delete(
                        midi
                    );

                }

            }
        );


        state.piano.sustained.clear();


        actualizarVisualPiano();

        actualizarAcorde();

    }


    monitor(
        `Sustain ${activo ? "ON" : "OFF"}`
    );

}


/* =========================================================
   VISUAL PIANO
========================================================= */

function actualizarVisualPiano() {

    const teclas =
        $$("#teclado-clase [data-midi]");


    teclas.forEach(
        tecla => {

            const midi =
                Number(
                    tecla.dataset.midi
                );


            tecla.classList.toggle(
                "activa",
                state.piano.active.has(
                    midi
                )
            );

        }
    );

}



/* ============================================================
   DETECTOR DE ACORDES
   ============================================================

   REGLAS:
   - C E G       = C
   - C E G Bb    = C7
   - C E G B     = Cmaj7
   - C E G D     = Cadd9
   - C E G Bb D  = C9
   - C E G B D   = Cmaj9
   - C E G Bb D F = C11
   - C E G B D F  = Cmaj11
   - C E G Bb D F A = C13
   - C E G B D F A  = Cmaj13

   Una extensión SOLO puede aparecer si la nota
   correspondiente está realmente presente.
   ============================================================ */


/* ------------------------------------------------------------
   NOMBRES DE LAS NOTAS
   ------------------------------------------------------------ */

const NOMBRES_NOTAS = [
    "C",
    "C#",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B"
];


/* ------------------------------------------------------------
   TIPOS DE ACORDE
   ------------------------------------------------------------ */

const CHORD_TYPES = [

    /* =========================
       TRÍADAS NATURALES
       ========================= */

    {
        id: "maj",
        nombre: "",
        intervalos: [0, 4, 7],
        prioridad: 100
    },

    {
        id: "min",
        nombre: "m",
        intervalos: [0, 3, 7],
        prioridad: 100
    },

    {
        id: "dim",
        nombre: "dim",
        intervalos: [0, 3, 6],
        prioridad: 99
    },

    {
        id: "aug",
        nombre: "aug",
        intervalos: [0, 4, 8],
        prioridad: 99
    },

    {
        id: "sus2",
        nombre: "sus2",
        intervalos: [0, 2, 7],
        prioridad: 98
    },

    {
        id: "sus4",
        nombre: "sus4",
        intervalos: [0, 5, 7],
        prioridad: 98
    },


    /* =========================
       SEXTAS
       ========================= */

    {
        id: "6",
        nombre: "6",
        intervalos: [0, 4, 7, 9],
        prioridad: 90
    },

    {
        id: "m6",
        nombre: "m6",
        intervalos: [0, 3, 7, 9],
        prioridad: 90
    },


    /* =========================
       SÉPTIMAS
       ========================= */

    {
        id: "7",
        nombre: "7",
        intervalos: [0, 4, 7, 10],
        prioridad: 95
    },

    {
        id: "maj7",
        nombre: "maj7",
        intervalos: [0, 4, 7, 11],
        prioridad: 95
    },

    {
        id: "m7",
        nombre: "m7",
        intervalos: [0, 3, 7, 10],
        prioridad: 95
    },

    {
        id: "mMaj7",
        nombre: "mMaj7",
        intervalos: [0, 3, 7, 11],
        prioridad: 94
    },

    {
        id: "dim7",
        nombre: "dim7",
        intervalos: [0, 3, 6, 9],
        prioridad: 94
    },

    {
        id: "m7b5",
        nombre: "m7b5",
        intervalos: [0, 3, 6, 10],
        prioridad: 94
    },


    /* =========================
       ADD9
       ========================= */

    {
        id: "add9",
        nombre: "add9",
        intervalos: [0, 4, 7, 2],
        prioridad: 80
    },

    {
        id: "madd9",
        nombre: "madd9",
        intervalos: [0, 3, 7, 2],
        prioridad: 80
    },


    /* =========================
       NOVENAS
       ========================= */

    {
        id: "9",
        nombre: "9",
        intervalos: [0, 4, 7, 10, 2],
        prioridad: 85
    },

    {
        id: "maj9",
        nombre: "maj9",
        intervalos: [0, 4, 7, 11, 2],
        prioridad: 85
    },

    {
        id: "m9",
        nombre: "m9",
        intervalos: [0, 3, 7, 10, 2],
        prioridad: 85
    },

    {
        id: "mMaj9",
        nombre: "mMaj9",
        intervalos: [0, 3, 7, 11, 2],
        prioridad: 84
    },


    /* =========================
       ONCENAS
       ========================= */

    {
        id: "11",
        nombre: "11",
        intervalos: [0, 4, 7, 10, 2, 5],
        prioridad: 75
    },

    {
        id: "maj11",
        nombre: "maj11",
        intervalos: [0, 4, 7, 11, 2, 5],
        prioridad: 75
    },

    {
        id: "m11",
        nombre: "m11",
        intervalos: [0, 3, 7, 10, 2, 5],
        prioridad: 75
    },


    /* =========================
       TRECEAVAS
       ========================= */

    {
        id: "13",
        nombre: "13",
        intervalos: [0, 4, 7, 10, 2, 5, 9],
        prioridad: 70
    },

    {
        id: "maj13",
        nombre: "maj13",
        intervalos: [0, 4, 7, 11, 2, 5, 9],
        prioridad: 70
    },

    {
        id: "m13",
        nombre: "m13",
        intervalos: [0, 3, 7, 10, 2, 5, 9],
        prioridad: 70
    },


    /* =========================
       ALTERADOS
       ========================= */

    {
        id: "7b5",
        nombre: "7b5",
        intervalos: [0, 4, 6, 10],
        prioridad: 60
    },

    {
        id: "7#5",
        nombre: "7#5",
        intervalos: [0, 4, 8, 10],
        prioridad: 60
    },

    {
        id: "7b9",
        nombre: "7b9",
        intervalos: [0, 4, 7, 10, 1],
        prioridad: 60
    },

    {
        id: "7#9",
        nombre: "7#9",
        intervalos: [0, 4, 7, 10, 3],
        prioridad: 60
    },

    {
        id: "7#11",
        nombre: "7#11",
        intervalos: [0, 4, 7, 10, 6],
        prioridad: 60
    },

    {
        id: "7b13",
        nombre: "7b13",
        intervalos: [0, 4, 7, 10, 8],
        prioridad: 60
    },

    {
        id: "7b9#11",
        nombre: "7b9#11",
        intervalos: [0, 4, 7, 10, 1, 6],
        prioridad: 55
    },

    {
        id: "7b9b13",
        nombre: "7b9b13",
        intervalos: [0, 4, 7, 10, 1, 8],
        prioridad: 55
    },

    {
        id: "7#9#11",
        nombre: "7#9#11",
        intervalos: [0, 4, 7, 10, 3, 6],
        prioridad: 55
    }
];


/* ------------------------------------------------------------
   OBTENER NOTAS ACTIVAS
   ------------------------------------------------------------ */

function obtenerNotasPiano() {

    const notas = new Set();

    if (!state.piano) {
        return [];
    }

    if (state.piano.held) {

        state.piano.held.forEach(nota => {
            notas.add(nota);
        });

    }

    if (state.piano.sustained) {

        state.piano.sustained.forEach(nota => {
            notas.add(nota);
        });

    }

    return [...notas].sort((a, b) => a - b);
}


/* ------------------------------------------------------------
   CONVERTIR NOTAS MIDI A CLASES DE PITCH
   ------------------------------------------------------------ */

function obtenerPitchClasses(notas) {

    return [...new Set(
        notas.map(nota => nota % 12)
    )].sort((a, b) => a - b);

}


/* ------------------------------------------------------------
   COMPARAR DOS ARRAYS
   ------------------------------------------------------------ */

function arraysIguales(a, b) {

    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {

        if (a[i] !== b[i]) {
            return false;
        }

    }

    return true;
}


/* ------------------------------------------------------------
   DETECTAR ACORDE
   ------------------------------------------------------------ */

function detectarAcorde(notas) {

    if (!notas || notas.length === 0) {
        return null;
    }


    /* --------------------------------------------------------
       Eliminamos duplicados de la misma nota.
       Ejemplo:

       C3 E3 G3 C4

       se analiza como:

       C E G
       -------------------------------------------------------- */

    const pitchClasses = obtenerPitchClasses(notas);


    /*
       Necesitamos mínimo 2 notas para empezar a intentar
       reconocer algo.
    */

    if (pitchClasses.length < 2) {
        return null;
    }


    const candidatos = [];


    /* --------------------------------------------------------
       PROBAR CADA NOTA COMO POSIBLE FUNDAMENTAL
       -------------------------------------------------------- */

    for (const root of pitchClasses) {

        for (const tipo of CHORD_TYPES) {

            const esperados = tipo.intervalos
                .map(intervalo => (root + intervalo) % 12)
                .sort((a, b) => a - b);


            /*
               MUY IMPORTANTE:

               El conjunto tocado debe ser EXACTAMENTE
               el conjunto del acorde.

               Esto evita:

               C E G

               → Cadd9

               porque Cadd9 necesita D.
            */

            if (!arraysIguales(pitchClasses, esperados)) {
                continue;
            }


            /* ------------------------------------------------
               CALCULAR BAJO REAL
               ------------------------------------------------ */

            const bajo = notas[0];

            const pitchBajo = bajo % 12;


            /* ------------------------------------------------
               PRIORIDAD

               Las formas básicas tienen prioridad sobre
               extensiones.
               ------------------------------------------------ */

            let puntuacion = tipo.prioridad;


            /*
               Si la fundamental está en el bajo,
               damos prioridad.
            */

            if (pitchBajo === root) {
                puntuacion += 20;
            }


            /*
               Más notas = acorde más completo.
            */

            puntuacion += pitchClasses.length;


            candidatos.push({

                root,

                tipo,

                bajo: pitchBajo,

                puntuacion

            });

        }

    }


    /* --------------------------------------------------------
       SI NO ENCONTRAMOS NINGÚN ACORDE
       -------------------------------------------------------- */

    if (candidatos.length === 0) {
        return null;
    }


    /* --------------------------------------------------------
       ORDENAR CANDIDATOS
       -------------------------------------------------------- */

    candidatos.sort((a, b) => {

        if (b.puntuacion !== a.puntuacion) {
            return b.puntuacion - a.puntuacion;
        }


        /*
           Si hay empate, preferimos el acorde cuya
           fundamental está en el bajo.
        */

        const aBajo = a.bajo === a.root ? 1 : 0;
        const bBajo = b.bajo === b.root ? 1 : 0;

        return bBajo - aBajo;

    });


    const mejor = candidatos[0];


    return {

        root: mejor.root,

        tipo: mejor.tipo,

        bajo: mejor.bajo,

        notas: notas

    };

}


/* ------------------------------------------------------------
   FORMATEAR NOMBRE DEL ACORDE
   ------------------------------------------------------------ */

function formatearAcorde(acorde) {

    if (!acorde) {
        return "—";
    }


    const nombreRaiz = NOMBRES_NOTAS[acorde.root];

    let nombre = nombreRaiz + acorde.tipo.nombre;


    /*
       ACORDE INVERTIDO

       Ejemplo:

       E4 G4 C5

       El acorde es C/E.
    */

    if (
        acorde.bajo !== acorde.root
    ) {

        const nombreBajo = NOMBRES_NOTAS[acorde.bajo];

        nombre += "/" + nombreBajo;

    }


    return nombre;

}


/* ------------------------------------------------------------
   ACTUALIZAR DISPLAY DEL ACORDE
   ------------------------------------------------------------ */

function actualizarAcorde() {

    if (!state.classMode) {
        return;
    }


    const notas = obtenerNotasPiano();


    const elementoAcorde =
        document.getElementById("acorde-clase");


    const elementoNotas =
        document.getElementById("notas-clase");


    if (!elementoAcorde) {
        return;
    }


    if (notas.length === 0) {

        elementoAcorde.textContent = "—";

        if (elementoNotas) {
            elementoNotas.textContent = "Sin notas";
        }

        return;

    }


    const acorde = detectarAcorde(notas);


    if (!acorde) {

        elementoAcorde.textContent = "—";

    } else {

        elementoAcorde.textContent =
            formatearAcorde(acorde);

    }


    if (elementoNotas) {

        const nombres = notas.map(nota => {

            const nombre =
                NOMBRES_NOTAS[nota % 12];

            const octava =
                Math.floor(nota / 12) - 1;

            return `${nombre}${octava}`;

        });

        elementoNotas.textContent =
            nombres.join(" · ");

    }

}


/* =========================================================
   ESTADO MODO CLASE
========================================================= */

function actualizarEstadoModoClase(
    texto
) {

    const estado =
        $("#estado-modo-clase");

    if (!estado) return;

    estado.textContent =
        texto;

}


/* =========================================================
   DESPRENDER PIANO
========================================================= */

function alternarPianoDesprendido() {

    const panel =
        $("#modo-clase");

    const boton =
        $("#boton-desprender-piano");

    if (!panel) return;


    state.classMode.detached =
        !state.classMode.detached;


    panel.classList.toggle(
        "desprendido",
        state.classMode.detached
    );


    if (boton) {

        boton.textContent =
            state.classMode.detached
                ? "↙ INTEGRAR PIANO"
                : "↗ DESPRENDER PIANO";

    }


    if (
        state.classMode.detached
    ) {

        iniciarArrastrePiano();

    }


    actualizarEstadoModoClase(
        state.classMode.detached
            ? "Modo Clase desprendido · Piano flotante"
            : "Modo Clase integrado · Piano de 88 teclas"
    );

}


/* =========================================================
   ARRASTRE PIANO
========================================================= */

function iniciarArrastrePiano() {

    const panel =
        $("#modo-clase");

    const cabecera =
        panel?.querySelector(
            ".modo-clase-cabecera"
        );


    if (!panel || !cabecera)
        return;


    if (
        cabecera.dataset.dragReady
    ) {

        return;

    }


    cabecera.dataset.dragReady =
        "true";


    let arrastrando = false;

    let offsetX = 0;

    let offsetY = 0;


    cabecera.addEventListener(
        "pointerdown",
        evento => {

            if (
                evento.target.closest(
                    "button"
                )
            ) {

                return;

            }


            if (
                !state.classMode.detached
            ) {

                return;

            }


            arrastrando = true;


            const rect =
                panel.getBoundingClientRect();


            offsetX =
                evento.clientX -
                rect.left;


            offsetY =
                evento.clientY -
                rect.top;


            cabecera.setPointerCapture?.(
                evento.pointerId
            );

        }
    );


    cabecera.addEventListener(
        "pointermove",
        evento => {

            if (!arrastrando)
                return;


            const ancho =
                panel.offsetWidth;


            panel.style.left =
                `${evento.clientX - offsetX}px`;

            panel.style.top =
                `${evento.clientY - offsetY}px`;

            panel.style.transform =
                "none";

        }
    );


    cabecera.addEventListener(
        "pointerup",
        () => {

            arrastrando = false;

        }
    );


    cabecera.addEventListener(
        "pointercancel",
        () => {

            arrastrando = false;

        }
    );

}


/* =========================================================
   MEMORIAS
========================================================= */

function cargarMemorias() {

    let guardadas = null;


    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (raw) {

            guardadas =
                JSON.parse(raw);

        }

    } catch (error) {

        console.warn(
            "No se pudieron leer memorias",
            error
        );

    }


    if (!guardadas)
        return;


    [1, 2, 3].forEach(
        numero => {

            if (
                guardadas[numero]
            ) {

                state.memories[numero] =
                    guardadas[numero];

            }

        }
    );


    actualizarBotonesMemoria();

}


/* =========================================================
   GUARDAR MEMORIAS STORAGE
========================================================= */

function guardarMemoriasStorage() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                state.memories
            )
        );

    } catch (error) {

        console.warn(
            "No se pudieron guardar memorias",
            error
        );

    }

}


/* =========================================================
   CREAR SNAPSHOT
========================================================= */

function crearSnapshot() {

    return {

        version: VERSION,

        pads:
            structuredClone(
                state.pads
            ),

        controls:
            structuredClone(
                state.controls
            ),

        selectedPad:
            state.selectedPad,

        padPreset:
            $("#selector-pad-preset")
                ?.value ||
            null,

        daw:
            $("#selector-daw")
                ?.value ||
            null,

        synthPreset:
            $("#selector-synth-preset")
                ?.value ||
            null

    };

}


/* =========================================================
   GUARDAR MEMORIA
========================================================= */

function guardarMemoria(
    numero
) {

    state.memories[numero] =
        crearSnapshot();


    guardarMemoriasStorage();

    actualizarBotonesMemoria();


    monitor(
        `MEMORY ${String(numero).padStart(2, "0")} guardada.`
    );

}


/* =========================================================
   CARGAR MEMORIA
========================================================= */

function cargarMemoria(
    numero
) {

    const memoria =
        state.memories[numero];

    if (!memoria) {

        monitor(
            `MEMORY ${String(numero).padStart(2, "0")} está vacía.`
        );

        return;

    }


    if (memoria.pads) {

        Object.keys(
            memoria.pads
        ).forEach(
            padId => {

                if (
                    state.pads[padId]
                ) {

                    const guardado =
                        memoria.pads[padId];


                    /*
                       Los samples locales no
                       se pueden reconstruir
                       después de recargar
                       la página.

                       Conservamos la referencia
                       solamente si sigue siendo
                       válida durante la sesión.
                    */

                    state.pads[padId] = {

                        ...state.pads[padId],

                        midiNote:
                            guardado.midiNote,

                        preset:
                            guardado.preset,

                        sampleUrl:
                            state.pads[padId]
                                .sampleUrl,

                        sampleName:
                            guardado.sampleName

                    };

                }

            }
        );

    }


    if (memoria.controls) {

        CONTROL_IDS.forEach(
            controlId => {

                if (
                    memoria.controls[
                        controlId
                    ]
                ) {

                    state.controls[
                        controlId
                    ] = {

                        ...memoria.controls[
                            controlId
                        ]

                    };

                }

            }
        );

    }


    if (
        memoria.selectedPad &&
        state.pads[memoria.selectedPad]
    ) {

        state.selectedPad =
            memoria.selectedPad;

    }


    if (
        memoria.daw
    ) {

        const daw =
            $("#selector-daw");

        if (daw) {

            daw.value =
                memoria.daw;

            actualizarDAW();

        }

    }


    if (
        memoria.synthPreset
    ) {

        const synth =
            $("#selector-synth-preset");

        if (synth) {

            synth.value =
                memoria.synthPreset;

            actualizarSynth();

        }

    }


    actualizarTodosLosPads();

    inicializarPerillas();


    monitor(
        `MEMORY ${String(numero).padStart(2, "0")} cargada.`
    );

}


/* =========================================================
   ELIMINAR MEMORIA
========================================================= */

function eliminarMemoria(
    numero
) {

    state.memories[numero] =
        null;


    guardarMemoriasStorage();

    actualizarBotonesMemoria();


    monitor(
        `MEMORY ${String(numero).padStart(2, "0")} eliminada.`
    );

}


/* =========================================================
   BOTONES MEMORIA
========================================================= */

function actualizarBotonesMemoria() {

    $$(".boton-memoria").forEach(
        boton => {

            const numero =
                Number(
                    boton.dataset.memoria
                );


            boton.classList.toggle(
                "guardada",
                Boolean(
                    state.memories[numero]
                )
            );

        }
    );

}


/* =========================================================
   SELECTOR SYNTH
========================================================= */

function llenarSelectorSynth() {

    const selector =
        $("#selector-synth-preset");

    if (!selector) return;


    selector.innerHTML = "";


    Object.entries(
        SYNTH_PRESETS
    ).forEach(
        ([key, preset]) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                key;

            option.textContent =
                preset.name;

            selector.appendChild(
                option
            );

        }
    );


    selector.value =
        "grand";


    actualizarSynth();

}


/* =========================================================
   ACTUALIZAR SYNTH
========================================================= */

function actualizarSynth() {

    const selector =
        $("#selector-synth-preset");

    const display =
        $("#display-synth-preset");

    const detalle =
        $("#display-synth-detalle");


    if (!selector) return;


    const preset =
        SYNTH_PRESETS[
            selector.value
        ];


    if (!preset) return;


    if (display) {

        display.textContent =
            preset.name;

    }


    if (detalle) {

        detalle.textContent =
            preset.detail;

    }


    monitor(
        `Synth preset: ${preset.name}`
    );

}


/* =========================================================
   DAW
========================================================= */

function actualizarDAW() {

    const selector =
        $("#selector-daw");

    const display =
        $("#display-pad-daw");


    if (!selector) return;


    const valor =
        selector.value ||
        "No detectado";


    if (display) {

        display.textContent =
            `DAW: ${valor.toUpperCase()}`;

    }


    monitor(
        `DAW seleccionado: ${valor}`
    );

}


/* =========================================================
   MENÚS CONTEXTUALES
========================================================= */

function ocultarMenus() {

    $$(".menu-contextual")
        .forEach(
            menu =>
                menu.classList.remove(
                    "visible"
                )
        );

}


function mostrarMenu(
    menu,
    x,
    y
) {

    if (!menu) return;


    menu.classList.add(
        "visible"
    );


    const ancho =
        menu.offsetWidth;

    const alto =
        menu.offsetHeight;


    const posX =
        Math.min(
            x,
            window.innerWidth -
            ancho -
            8
        );


    const posY =
        Math.min(
            y,
            window.innerHeight -
            alto -
            8
        );


    menu.style.left =
        `${Math.max(
            5,
            posX
        )}px`;


    menu.style.top =
        `${Math.max(
            5,
            posY
        )}px`;

}


/* =========================================================
   MENÚ PAD
========================================================= */

function abrirMenuPad(
    evento,
    padId
) {

    evento.preventDefault();


    state.contextPad =
        padId;


    state.selectedPad =
        padId;


    actualizarDisplayPad(
        padId
    );


    ocultarMenus();


    mostrarMenu(
        $("#menu-pad"),
        evento.clientX,
        evento.clientY
    );

}


/* =========================================================
   MENÚ PERILLA
========================================================= */

function abrirMenuPerilla(
    evento,
    controlId
) {

    evento.preventDefault();


    state.contextControl =
        controlId;


    ocultarMenus();


    mostrarMenu(
        $("#menu-perilla"),
        evento.clientX,
        evento.clientY
    );

}


/* =========================================================
   MENÚ MEMORIA
========================================================= */

function abrirMenuMemoria(
    evento,
    numero
) {

    evento.preventDefault();


    state.contextMemory =
        numero;


    ocultarMenus();


    mostrarMenu(
        $("#menu-memoria"),
        evento.clientX,
        evento.clientY
    );

}


/* =========================================================
   EVENTOS PADS
========================================================= */

function configurarPads() {

    $$(".pad-config")
        .forEach(
            contenedor => {

                const padId =
                    contenedor.dataset.padId;


                const boton =
                    contenedor.querySelector(
                        ".drum-pad"
                    );


                if (!padId || !boton)
                    return;


                boton.addEventListener(
                    "click",
                    () => {

                        state.selectedPad =
                            padId;


                        actualizarDisplayPad(
                            padId
                        );


                        dispararPad(
                            padId,
                            100
                        );

                    }
                );


                contenedor.addEventListener(
                    "contextmenu",
                    evento => {

                        abrirMenuPad(
                            evento,
                            padId
                        );

                    }
                );

            }
        );

}


/* =========================================================
   EVENTOS PERILLAS
========================================================= */

function configurarPerillas() {

    $$(".perilla-contenedor")
        .forEach(
            contenedor => {

                configurarPerilla(
                    contenedor
                );


                contenedor.addEventListener(
                    "contextmenu",
                    evento => {

                        abrirMenuPerilla(
                            evento,
                            contenedor.dataset.control
                        );

                    }
                );

            }
        );

}


/* =========================================================
   EVENTOS MEMORIAS
========================================================= */

function configurarMemorias() {

    $$(".boton-memoria")
        .forEach(
            boton => {

                const numero =
                    Number(
                        boton.dataset.memoria
                    );


                boton.addEventListener(
                    "click",
                    () => {

                        cargarMemoria(
                            numero
                        );

                    }
                );


                boton.addEventListener(
                    "contextmenu",
                    evento => {

                        abrirMenuMemoria(
                            evento,
                            numero
                        );

                    }
                );

            }
        );

}


/* =========================================================
   EVENTOS GLOBALES
========================================================= */

function configurarEventos() {

    const selectorMIDI =
        $("#dispositivos-midi");


    if (selectorMIDI) {

        selectorMIDI.addEventListener(
            "change",
            evento => {

                const id =
                    evento.target.value;


                if (id) {

                    conectarMIDIInput(
                        id
                    );

                }

            }
        );

    }


    const redetectar =
        $("#boton-redetectar-pads");


    if (redetectar) {

        redetectar.addEventListener(
            "click",
            iniciarAutoPad
        );

    }


    const selectorPad =
        $("#selector-pad-preset");


    if (selectorPad) {

        selectorPad.addEventListener(
            "change",
            evento => {

                cambiarPresetPad(
                    state.selectedPad,
                    evento.target.value
                );

            }
        );

    }


    const selectorDestino =
        $("#selector-pad-destino");


    if (selectorDestino) {

        selectorDestino.addEventListener(
            "change",
            evento => {

                state.selectedPad =
                    evento.target.value;


                actualizarDisplayPad(
                    state.selectedPad
                );

            }
        );

    }


    const selectorSynth =
        $("#selector-synth-preset");


    if (selectorSynth) {

        selectorSynth.addEventListener(
            "change",
            actualizarSynth
        );

    }


    const selectorDAW =
        $("#selector-daw");


    if (selectorDAW) {

        selectorDAW.addEventListener(
            "change",
            actualizarDAW
        );

    }


    const abrirClase =
        $("#boton-abrir-modo-clase");


    if (abrirClase) {

        abrirClase.addEventListener(
            "click",
            abrirModoClase
        );

    }


    const botonClase =
        $("#boton-modo-clase");


    if (botonClase) {

        botonClase.addEventListener(
            "click",
            alternarModoClase
        );

    }


    const desprender =
        $("#boton-desprender-piano");


    if (desprender) {

        desprender.addEventListener(
            "click",
            alternarPianoDesprendido
        );

    }


    const inputSample =
        $("#input-sample-pad");


    if (inputSample) {

        inputSample.addEventListener(
            "change",
            manejarSampleSeleccionado
        );

    }


    const asignarCC =
        $("#opcion-asignar-midi");


    if (asignarCC) {

        asignarCC.addEventListener(
            "click",
            () => {

                if (
                    state.contextControl
                ) {

                    iniciarLearnCC(
                        state.contextControl
                    );

                }

            }
        );

    }


    const asignarPad =
        $("#opcion-asignar-pad-midi");


    if (asignarPad) {

        asignarPad.addEventListener(
            "click",
            () => {

                if (
                    state.contextPad
                ) {

                    iniciarLearnPad(
                        state.contextPad
                    );

                }

            }
        );

    }


    const asignarPreset =
        $("#opcion-asignar-preset-pad");


    if (asignarPreset) {

        asignarPreset.addEventListener(
            "click",
            () => {

                if (
                    state.contextPad
                ) {

                    const selector =
                        $("#selector-pad-preset");


                    cambiarPresetPad(
                        state.contextPad,
                        selector?.value ||
                        "empty"
                    );

                }

                ocultarMenus();

            }
        );

    }


    const cargarSample =
        $("#opcion-cargar-sample");


    if (cargarSample) {

        cargarSample.addEventListener(
            "click",
            () => {

                abrirSelectorSample();

                ocultarMenus();

            }
        );

    }


    const quitarSonido =
        $("#opcion-quitar-sonido");


    if (quitarSonido) {

        quitarSonido.addEventListener(
            "click",
            () => {

                if (
                    state.contextPad
                ) {

                    quitarSonidoPad(
                        state.contextPad
                    );

                }

                ocultarMenus();

            }
        );

    }


    const guardarMem =
        $("#opcion-guardar-memoria");


    if (guardarMem) {

        guardarMem.addEventListener(
            "click",
            () => {

                if (
                    state.contextMemory
                ) {

                    guardarMemoria(
                        state.contextMemory
                    );

                }

                ocultarMenus();

            }
        );

    }


    const eliminarMem =
        $("#opcion-eliminar-memoria");


    if (eliminarMem) {

        eliminarMem.addEventListener(
            "click",
            () => {

                if (
                    state.contextMemory
                ) {

                    eliminarMemoria(
                        state.contextMemory
                    );

                }

                ocultarMenus();

            }
        );

    }


    document.addEventListener(
        "click",
        evento => {

            if (
                !evento.target.closest(
                    ".menu-contextual"
                )
            ) {

                ocultarMenus();

            }

        }
    );


    document.addEventListener(
        "contextmenu",
        evento => {

            if (
                !evento.target.closest(
                    ".pad-config"
                ) &&
                !evento.target.closest(
                    ".perilla-contenedor"
                ) &&
                !evento.target.closest(
                    ".boton-memoria"
                )
            ) {

                ocultarMenus();

            }

        }
    );

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escaparHTML(
    texto
) {

    return String(texto)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   LIBERAR TECLAS AL CAMBIAR PESTAÑA
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            state.piano.held.clear();

            if (
                !state.piano.sustain
            ) {

                state.piano.active.clear();

                actualizarVisualPiano();

                actualizarAcorde();

            }

        }

    }
);


/* =========================================================
   INICIO
========================================================= */

async function iniciarAplicacion() {

    inicializarPads();

    inicializarControles();


    llenarSelectorPadPresets();

    llenarSelectorSynth();


    cargarMemorias();


    actualizarTodosLosPads();

    inicializarPerillas();

    actualizarDAW();


    configurarPads();

    configurarPerillas();

    configurarMemorias();

    configurarEventos();


    actualizarEstadoAutoPad(
        "Auto Pad: esperando controlador",
        "normal"
    );


    monitor(
        `ISIPad:V ${VERSION} iniciado correctamente.`
    );


    await iniciarMIDI();

}


/* =========================================================
   EJECUTAR
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarAplicacion
    );

} else {

    iniciarAplicacion();

}