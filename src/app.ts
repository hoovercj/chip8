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
}

function stopEmulation(): void {
    console.log('Stop emulation');
    clearInterval(emulationLoop);
}

function tickEmulation() {
    console.log('Tick emulation');
    chip8.emulateCycle();
    window.requestAnimationFrame(drawCanvas);
    chip8.setKeys(keys);
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

var canvasContext;
function setupGraphics(): void {
    var canvas = <HTMLCanvasElement> document.getElementById('chip8Canvas'); // in your HTML this element appears as <canvas id="mycanvas"></canvas>
    canvasContext = canvas.getContext('2d');
}

function drawCanvas(): void {
    // TODO: offscreen canvas?
    canvasContext.fillRect(0, 0, 640, 320);
    console.log('Draw graphics');
    chip8.Display.forEach((row, rowIndex) => {
        row.forEach((column, columnIndex) => {
            if (column) {
                canvasContext.clearRect(columnIndex * 10, rowIndex * 10, 10, 10);
            }
        });
    });
}

window.onload = function() {
    console.log('window.onload');
    setupInput();
    setupFileReader();
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