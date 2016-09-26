import { IChip8 } from './interfaces';
import { Chip8 } from './chip8';

let chip8: IChip8 = new Chip8();
let buffer: ArrayBuffer;
let keys: boolean[] = [];
let emulationLoop;

let delay = 16;

function setDelay(newDelay: number): void {
    delay = newDelay;
}

function startEmulation(): void {
    // alert(`Hi! Buffer is ${buffer.byteLength} bytes long.`);
    // Set up render system and register input callbacks
    // setupGraphics();
    console.log('Start Emulation');
    // Initialize the Chip8 system and load the game into the memory  
    chip8.initialize();
    chip8.loadRom(buffer);
    
    // Emulation loop
    tickEmulation();
}

function stopEmulation(): void {
    console.log('Stop emulation');
    clearInterval(emulationLoop);
}

function tickEmulation() {
    console.log('Tick emulation');
    // Emulate one cycle
    chip8.emulateCycle();

    // If the draw flag is set, update the screen
    if(chip8.getDrawFlag()) {
        drawGraphics();
    }

    // Store key press state (Press and Release)
    chip8.setKeys(keys);
    emulationLoop = setTimeout(tickEmulation, delay);
}

function drawGraphics(): void {
    requestAnimationFrame(() => {
        console.log('Draw graphics');
        chip8.getDisplay().forEach((row, rowIndex) => {
            row.forEach((column, columnIndex) => {
                var pixel = document.querySelector(`.row[data="${rowIndex}"] .pixel[data="${columnIndex}"]`);
                if (column) {
                    // console.log('column: ' + columnIndex + ' row: ' + rowIndex);
                    pixel.classList.add('white');
                } else {
                    pixel.classList.remove('white');
                }
            });
        });
        chip8.setDrawFlag(false);
    });
}

function setupInput(): void {
    console.log('Setup input');
    keys = [];
    window.onkeydown=function(e){
        e = e || <KeyboardEvent> window.event;
        var key = keycodes[e.keyCode];
        console.log(`Key down: ${key}`);
        keys[key] = true;
    }

    window.onkeyup=function(e){
        e = e || <KeyboardEvent> window.event;
        var key = keycodes[e.keyCode];
        console.log(`Key up: ${key}`);
        keys[key] = false;
    }
}

function setupFileReader() {
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

window.onload = function() {
    console.log('window.onload');
    setupInput();
    setupFileReader();
}

const keycodes = {
    49: 0, // 1
    50: 1, // 2
    51: 2, // 3
    54: 3, // 4

    81: 4, // Q
    87: 5, // W
    89: 6, // E
    82: 7, // R

    65: 8, // A
    83: 9, // S
    68: 10, // D
    70: 11, // F

    90: 12, // Z
    88: 13, // X
    67: 15, // C
    86: 15, // V
}