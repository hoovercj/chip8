import { IChip8 } from './interfaces';
import { Chip8 } from './chip8';

// Emulator related variables
let chip8: IChip8;
let buffer: ArrayBuffer;
let keys: boolean[] = [];
let emulationLoop;
let ticksPerFrame = 10;
let beepFrequency = 400;

// Input elements
var selectInput: HTMLSelectElement;
var fileInput: HTMLInputElement;
var restartButton: HTMLButtonElement;

// Canvas elements
var canvas: HTMLCanvasElement;
var canvasContext: CanvasRenderingContext2D;
var canvasContainer: HTMLDivElement;

// Audio variables
var audioContext: AudioContext;
var oscillator: OscillatorNode;
var gain: GainNode;

// Emulation functions
function startEmulation(): void {
    stopEmulation();
    chip8 = new Chip8();
    chip8.loadRom(buffer);
    loopEmulation();
}

function tickEmulation() {
    chip8.setKeys(keys);
    chip8.emulateCycle();
}

function stopEmulation(): void {
    cancelAnimationFrame(emulationLoop);
}

// Perform emulation ticks at a specified rate.
// Draw the screen and update the timers at a rate of 60Hz
function loopEmulation(): void {
    for (var i = 0; i < ticksPerFrame; i++) {
        tickEmulation();
    }
    gain.gain.value = chip8.SoundTimer > 0 ? 1 : 0;
    chip8.updateTimers();
    drawCanvas();
    emulationLoop = requestAnimationFrame(loopEmulation);
}

function drawCanvas(): void {
    // TODO: offscreen canvas?
    var scaleFactor = getScaleFactor();
    canvasContext.fillRect(0, 0, canvasContainer.clientWidth, canvasContainer.clientHeight);
    chip8.Display.forEach((row, rowIndex) => {
        row.forEach((column, columnIndex) => {
            if (column) {
                canvasContext.clearRect(columnIndex * scaleFactor, rowIndex * scaleFactor, scaleFactor, scaleFactor);
            }
        });
    });
}

function loadSelectedRom(): void {
    var request = new XMLHttpRequest;
    var name = selectInput.value;
    request.onload = function () {
        if (request.response) {
            buffer = new Uint8Array(request.response);
            startEmulation();
        }
    }
    request.open("GET", "roms/" + name, true);
    request.responseType = "arraybuffer";
    request.send();
    selectInput.blur();
}

// Setup functions
function setupAudio(): void {
    if (oscillator)  {
        oscillator.stop();
    }
    audioContext = new AudioContext();
    oscillator = audioContext.createOscillator();
    oscillator.type = (<any> oscillator).TRIANGLE;
    oscillator.frequency.value = beepFrequency;
    oscillator.start(0);
    gain = audioContext.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
}

function setupInput(): void {
    keys = [];
    window.onkeydown=function(e){
        e = e || <KeyboardEvent> window.event;
        var key = keymap[String.fromCharCode(e.which).toUpperCase()];
        keys[key] = true;
    }

    window.onkeyup=function(e){
        e = e || <KeyboardEvent> window.event;
        var key = keymap[String.fromCharCode(e.which).toUpperCase()];
        keys[key] = false;
    }
}

function setupFileReader(): void {
    fileInput = <HTMLInputElement> document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onloadend = function(e) {
            buffer = reader.result;
            startEmulation();
        }
        reader.readAsArrayBuffer(file);
    });
}

function setupRomSelector(): void {
    selectInput = <HTMLSelectElement> document.getElementById('romSelector');
    selectInput.addEventListener('change', loadSelectedRom);
}

function setupGraphics(): void {
    canvasContainer = <HTMLDivElement> document.getElementById('canvasContainer');
    canvas = <HTMLCanvasElement> document.getElementById('chip8Canvas');
    canvasContext = canvas.getContext('2d');
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
}

function setupRestartButton(): void {
    restartButton = <HTMLButtonElement> document.getElementById('restartRom');
    restartButton.addEventListener('click', startEmulation);
}

function setCanvasSize() {
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
}

function getScaleFactor(): number {
    return canvasContainer.clientWidth / 64;
}

window.onload = function() {
    console.log('window.onload');
    setupInput();
    setupAudio();
    setupFileReader();
    setupRomSelector();
    setupRestartButton();
    setupGraphics();
    loadSelectedRom();
    startEmulation();
}

const keymap = {
    "1": 0x1,
    "2": 0x2,
    "3": 0x3,
    "4": 0xC,
    "Q": 0x4,
    "W": 0x5,
    "E": 0x6,
    "R": 0xD,
    "A": 0x7,
    "S": 0x8,
    "D": 0x9,
    "F": 0xE,
    "Z": 0xA,
    "X": 0x0,
    "C": 0xB,
    "V": 0xF
}