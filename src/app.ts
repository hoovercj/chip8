import { IChip8 } from './interfaces';
import { Chip8 } from './chip8';

let chip8: IChip8;
let buffer: ArrayBuffer;
let keys: boolean[] = [];
let emulationLoop;

let delay = 0;

function setDelay(newDelay: number): void {
    delay = newDelay;
}

function startEmulation(): void {
    console.log('Start Emulation');
    chip8 = new Chip8();
    chip8.loadRom(buffer);
    tickEmulation();
    animate();
}

function animate(): void {
    drawCanvas();
    requestAnimationFrame(animate);
}

function stopEmulation(): void {
    console.log('Stop emulation');
    clearInterval(emulationLoop);
}

function tickEmulation() {
    console.log('Tick emulation');
    chip8.setKeys(keys);
    chip8.emulateCycle();
    emulationLoop = setTimeout(tickEmulation, delay);
}

function setupInput(): void {
    console.log('Setup input');
    keys = [];
    window.onkeydown=function(e){
        e = e || <KeyboardEvent> window.event;
        var key = keymap[String.fromCharCode(e.which).toUpperCase()];
        keys[key] = true;
        console.log(`Key down: ${e.key}`);
    }

    window.onkeyup=function(e){
        e = e || <KeyboardEvent> window.event;
        var key = keymap[String.fromCharCode(e.which).toUpperCase()];
        keys[key] = false;
        console.log(`Key up: ${e.key}`);
    }
}


function setupFileReader(): void {
    var fileInput = <HTMLInputElement> document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        console.log('File selected');
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onloadend = function(e) {
            console.log('File loaded');
            buffer = reader.result;
            stopEmulation();
            startEmulation();
        }
        reader.readAsArrayBuffer(file);
    });
}

function setupRomSelector(): void {
    var selectInput = <HTMLSelectElement> document.getElementById('romSelector');
    selectInput.addEventListener('change', function(e) {
        loadRom(selectInput.value);
    });
}

function loadRom(name: string): void {
      var request = new XMLHttpRequest;
      request.onload = function() {
        if (request.response) {
          buffer = new Uint8Array(request.response);
          stopEmulation();
          startEmulation();
        }
      }
      request.open("GET", "roms/" + name, true);
      request.responseType = "arraybuffer";
      request.send();
    }

var canvas: HTMLCanvasElement;
var canvasContext: CanvasRenderingContext2D;
var canvasContainer: HTMLDivElement;
function setupGraphics(): void {
    canvasContainer = <HTMLDivElement> document.getElementById('canvasContainer');
    canvas = <HTMLCanvasElement> document.getElementById('chip8Canvas'); // in your HTML this element appears as <canvas id="mycanvas"></canvas>
    canvasContext = canvas.getContext('2d');
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
}

function setCanvasSize() {
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
}

function drawCanvas(): void {
    // TODO: offscreen canvas?
    var scaleFactor = getScaleFactor();
    canvasContext.fillRect(0, 0, canvasContainer.clientWidth, canvasContainer.clientHeight);
    console.log('Draw graphics');
    chip8.Display.forEach((row, rowIndex) => {
        row.forEach((column, columnIndex) => {
            if (column) {
                canvasContext.clearRect(columnIndex * scaleFactor, rowIndex * scaleFactor, scaleFactor, scaleFactor);
            }
        });
    });
}

function getScaleFactor(): number {
    return canvasContainer.clientWidth / 64;
}

window.onload = function() {
    console.log('window.onload');
    setupInput();
    setupFileReader();
    setupRomSelector();
    setupGraphics();
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