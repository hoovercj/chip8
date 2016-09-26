'use strict';

import { IChip8 } from './interfaces';
import { Chip8Spec } from './Chip8Spec'

export class Chip8 implements IChip8{

    private opcode: number;
    private memory: Uint8Array;

    // 8-bit CPU registers: V0-VE + VF for carry.
    private V: Uint8Array;

    // Index register I and program counter which can have a value from 0x000 to 0xFFF
    private I: number;
    private programCounter: number;

    // The systems memory map:
    // 0x000-0x1FF - Chip 8 interpreter (contains font set in emu)
    // 0x050-0x0A0 - Used for the built in 4x5 pixel font set (0-F)
    // 0x200-0xFFF - Program ROM and work RAM

    private display: number[][];
    private delayTimer: number;
    private soundTimer: number;
    private stack: number[];

    // Finally, the Chip 8 has a HEX based keypad (0x0-0xF), you can use an array to store the current state of the key.
    private keys: boolean[];
    private awaitingKey: boolean;

    private x: number;
    private y: number;
    private n: number;
    private nnn: number;
    private kk: number;

    public getDisplay(): number[][] {
        return this.display;
    }

    public setKeys(keys: boolean[]): void {
        this.keys = keys;
    }

    initialize(): void {
        // Initialize registers and memory once
        this.programCounter     = 0x200;  // Program counter starts at 0x200
        this.opcode = 0;      // Reset current opcode
        this.I      = 0;      // Reset index register
        // Clear display
        this.initializeDisplay();
        // Clear stack
        this.stack = [];
        // Clear registers V0-VF
        this.V = new Uint8Array(16);
        // Clear memory
        this.memory = new Uint8Array(4096);
        // Load fontset
        for(var i = 0; i < Chip8Spec.FONTSET.length; i++) {
            this.memory[80 + i] = Chip8Spec.FONTSET[i];
        }
        // Clear timers
        this.soundTimer = 0;
        this.delayTimer = 0;
    }


    loadRom(buffer: ArrayBuffer) {
        let bufferView = new Uint8Array(buffer);
        //console.log(`Loading ${buffer.byteLength} buffer into emulator`);
        for(let i = 0; i < bufferView.length; ++i) {
            this.memory[Chip8Spec.PC_START + i] = bufferView[i];
        }
    }

    // Fetch Opcode
    // Decode Opcode
    // Execute Opcode
    emulateCycle(): void {
        console.group('Emulate Cycle');
        this.opcode = this.memory[this.programCounter] << 8 | this.memory[this.programCounter + 1];
        //console.log(`ProgramCounter: ${this.programCounter}`);
        //console.log(`Opcode: ${this.opcode.toString(16)}`);
        if (!this.awaitingKey) {
            this.programCounter += 2;
        } else {
            // if opcode 0xF00A is awaiting keys, don't increment and re-execute instruction
            //console.log('Awaiting key...');
        }

        this.x = this.getX();
        this.y = this.getY();
        this.nnn = this.getNNN();
        this.kk = this.getKK();
        this.n = this.getN();

        // Decode opcode
        switch(this.opcode & 0xF000)
        {    
            // Some opcodes //
            case 0x0000:
                switch(this.opcode & 0x000F)
                {
                    case 0x0000: // 0x00E0: Clears the screen.
                        //console.log('// 0x00E0: Clears the screen.');
                        this.initializeDisplay();
                        break;
                    case 0x000E: // 0x00EE: Returns from subroutine.
                        // The interpreter sets the program counter to the address at the top of the stack, then subtracts 1 from the stack pointer.
                        //console.log('0x00EE: Returns from subroutine.');
                        if (this.stack.length > 0) {
                            this.programCounter = this.stack.pop();
                        } else {
                            throw new Error('Attempting to pop an empty stack.');
                        }
                        break;
                    default:
                        console.error("Unknown opcode [0x0000]: 0x%X\n", this.opcode);
                        break;
                }
                break;
            case 0x1000: // 1NNN: Jump to location nnn.
                // The interpreter sets the program counter to nnn.
                //console.log(`1NNN: Jump to location ${this.nnn}.`);
                this.programCounter = this.getNNN();
                break;
            case 0x2000: // 2NNN: Call subroutine at nnn.
                // The interpreter increments the stack pointer, then puts the current PC on the top of the stack. The PC is then set to nnn.
                //console.log(`2NNN: Call subroutine at ${this.nnn}.`);
                this.stack.push(this.programCounter);
                this.programCounter = this.getNNN();
                break;
            case 0x3000: // 3XKK: Skip next instruction if Vx = kk.
                //The interpreter compares register Vx to kk, and if they are equal, increments the program counter by 2.
                //console.log(`3XKK: Skip next instruction if Vx = kk.`);
                //console.log(`${this.V[this.x]} == ${this.kk}`)
                if (this.V[this.x] == this.kk) {
                    this.programCounter += 2;
                }
                break;
            case 0x4000: // 4XKK: Skip next instruction if Vx != kk.
                // The interpreter compares register Vx to kk, and if they are not equal, increments the program counter by 2.
                //console.log(`4XKK: Skip next instruction if Vx != kk.`);
                //console.log(`${this.V[this.x]} != ${this.kk}`)
                if (this.V[this.x] != this.kk) {
                    this.programCounter += 2;
                }
                break;
            case 0x5000: // 5xy0: Skip next instruction if Vx = Vy.
                // The interpreter compares register Vx to register Vy, and if they are equal, increments the program counter by 2.
                //console.log(`5xy0: Skip next instruction if Vx = Vy.`);
                //console.log(`${this.V[this.x]} == ${this.V[this.y]}`);
                if (this.V[this.x] == this.V[this.y]) {
                    this.programCounter += 2;
                }
                break;
            case 0x6000: // 6xkk: Set Vx = kk.
                // The interpreter puts the value kk into register Vx.
                //console.log('6xkk: Set Vx = kk.');
                //console.log(`V${this.x} = ${this.kk}`);
                this.V[this.x] = this.kk;
                break;
            case 0x7000: // 7xkk: Set Vx = Vx + kk.
                // Adds the value kk to the value of register Vx, then stores the result in Vx.
                //console.log('7xkk: Set Vx = Vx + kk.');
                //console.log(`V${this.x} = ${this.V[this.x]} + ${this.kk} = ${this.V[this.x] + this.kk}`);
                this.V[this.x] += this.kk & 0x00FF;
                break;
            case 0x8000: // 8XYN:
                switch (this.opcode & 0x00F) 
                {
                    case 0x0000: // 8XY0: Set Vx = Vy.
                        // Stores the value of register Vy in register Vx.
                        //console.log('8XY0: Set Vx = Vy.');
                        //console.log(`V${this.x} = V${this.y} = ${this.V[this.y]}`);
                        this.V[this.x] = this.V[this.y];
                        break;
                    case 0x0001: // 8XY1: Set Vx = Vx OR Vy.
                        // Performs a bitwise OR on the values of Vx and Vy, then stores the result in Vx. A bitwise OR compares the corrseponding bits from two values, and if either bit is 1, then the same bit in the result is also 1. Otherwise, it is 0.
                        //console.log('8XY1: Set Vx = Vx OR Vy.');
                        //console.log(`V${this.x} = ${this.V[this.x]} OR ${this.V[this.y]} = ${this.V[this.x] | this.V[this.y]}`);
                        this.V[this.x] |= this.V[this.y];
                        break;
                    case 0x0002: // 8XY2: Set Vx = Vx AND Vy.
                        // Performs a bitwise AND on the values of Vx and Vy, then stores the result in Vx. A bitwise AND compares the corrseponding bits from two values, and if both bits are 1, then the same bit in the result is also 1. Otherwise, it is 0.
                        //console.log('8XY2: Set Vx = Vx AND Vy.');
                        //console.log(`V${this.x} = ${this.V[this.x]} | ${this.V[this.y]} = ${this.V[this.x] | this.V[this.y]}`)
                        this.V[this.x] &= this.V[this.y];
                        break;
                    case 0x0003: // 8XY3: Set Vx = Vx XOR Vy.
                        // Performs a bitwise exclusive OR on the values of Vx and Vy, then stores the result in Vx. An exclusive OR compares the corrseponding bits from two values, and if the bits are not both the same, then the corresponding bit in the result is set to 1. Otherwise, it is 0. 
                        //console.log('8XY3: Set Vx = Vx XOR Vy.');
                        //console.log(`V${this.x} = ${this.V[this.x]} ^ ${this.V[this.y]} = ${this.V[this.x] ^ this.V[this.y]}`)
                        this.V[this.x] ^= this.V[this.y];
                        break;
                    case 0x0004: // 8XY4: Set Vx = Vx + Vy, set VF = carry.
                        // The values of Vx and Vy are added together. If the result is greater than 8 bits (i.e., > 255,) VF is set to 1, otherwise 0. Only the lowest 8 bits of the result are kept, and stored in Vx.
                        //console.log('8XY4: Set Vx = Vx + Vy, set VF = carry.');
                        //console.log(`V${this.x} = ${this.V[this.x]} + ${this.V[this.y]} = ${this.V[this.x] + this.V[this.y]}`);
                        var intermediate = this.V[this.x] + this.V[this.y];
                        this.V[0xF] = intermediate > 0xFF ? 1 : 0;
                        this.V[this.x] = intermediate & 0xFF;
                        break;
                    case 0x0005: // 8XY5: Set Vx = Vx - Vy, set VF = NOT borrow.
                        // If Vx > Vy, then VF is set to 1, otherwise 0. Then Vy is subtracted from Vx, and the results stored in Vx.
                        //console.log('8XY5: Set Vx = Vx - Vy, set VF = NOT borrow.');
                        //console.log(`V${this.x} = ${this.V[this.x]} > ${this.V[this.y]} = ${this.V[this.x] > this.V[this.y]}`);

                        var intermediate = this.V[this.x] - this.V[this.y];
                        if (intermediate < 0) {
                            this.V[0xF] = 1
                            this.V[this.x] = intermediate + 256;
                        } else {
                            this.V[0xF] = 0;
                            this.V[this.x] = intermediate;
                        }
                        break;
                    case 0x0006: // 8XY6: Set Vx = Vx SHR 1.
                        // If the least-significant bit of Vx is 1, then VF is set to 1, otherwise 0. Then Vx is divided by 2.
                        //console.log('8XY6: Set Vx = Vx SHR 1.');
                        this.V[0xF] = this.V[this.x] & 0x0001;
                        this.V[this.x] >>= 2;
                        //console.log(`V${this.x} = ${this.V[this.x]}, VF = ${this.V[0xF]}`);
                        break;
                    case 0x0007: // 8XY7: Set Vx = Vy - Vx, set VF = NOT borrow.
                        // If Vy > Vx, then VF is set to 1, otherwise 0. Then Vx is subtracted from Vy, and the results stored in Vx.
                        //console.log('8XY7: Set Vx = Vy - Vx, set VF = NOT borrow.');
                        //console.log(`V${this.x} = ${this.V[this.y]} > ${this.V[this.x]} = ${this.V[this.y] > this.V[this.x]}`);
                        var intermediate = this.V[this.y] - this.V[this.x];
                        if (intermediate < 0) {
                            this.V[0xF] = 1
                            this.V[this.x] = intermediate + 256;
                        } else {
                            this.V[0xF] = 0;
                            this.V[this.x] = intermediate;
                        }
                        break;
                    case 0x000E: // 8XYE: Set Vx = Vx SHL 1.
                        // If the most-significant bit of Vx is 1, then VF is set to 1, otherwise to 0. Then Vx is multiplied by 2.
                        //console.log('8XYE: Set Vx = Vx SHL 1.');
                        this.V[0xF] = this.V[this.y] & 0x80 ? 1 : 0;
                        this.V[this.x] = (this.V[this.x] << 2) & 0xFF;
                        break;
                    default:
                        console.error("Unknown opcode [0x0000]: 0x%X\n", this.opcode);
                        break;
                }
                break;
            case 0x9000: // 9xy0: Skip next instruction if Vx != Vy.
                // The values of Vx and Vy are compared, and if they are not equal, the program counter is increased by 2.
                //console.log('9xy0: Skip next instruction if Vx != Vy.');
                //console.log(`9xy0: Skip next instruction if ${this.V[this.x]} != ${this.V[this.x]}.`);
                if (this.V[this.x] != this.V[this.y]) {
                    this.programCounter += 2;
                }
                break;
            case 0xA000: // ANNN: Set I = nnn.
                // The value of register I is set to nnn.
                //console.log('ANNN: Set I = nnn.');
                //console.log(`ANNN: Set I = ${this.nnn}.`);
                this.I = this.nnn;
                break;
            case 0xB000: // BNNN: Jump to location nnn + V0.
                // The program counter is set to nnn plus the value of V0.
                //console.log('BNNN: Jump to location nnn + V0.');
                //console.log(`BNNN: Jump to location ${this.nnn} + ${this.V[0]} = ${this.nnn + this.V[0]}.`);
                this.programCounter = this.nnn + this.V[0];
                break;
            case 0xC000: // Cxkk: Set Vx = random byte AND kk.
                // The interpreter generates a random number from 0 to 255, which is then ANDed with the value kk. The results are stored in Vx. See instruction 8xy2 for more information on AND.
                //console.log('Cxkk: Set Vx = random byte AND kk.');
                var rand = Math.round(Math.random() * 255);
                //console.log(`${this.V[this.x]} = ${rand} AND ${this.kk} = ${rand & this.kk}.`);
                this.V[this.x] = rand & this.kk;
                break;
            case 0xD000: // Dxyn: Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
                // The interpreter reads n bytes from memory, starting at the address stored in I. These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). Sprites are XORed onto the existing screen. If this causes any pixels to be erased, VF is set to 1, otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, it wraps around to the opposite side of the screen. See instruction 8xy3 for more information on XOR, and section 2.4, Display, for more information on the Chip-8 screen and sprites.
                //console.log('Dxyn: Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.');
                var sprite = this.memory.slice(this.I, this.I + this.n);
                var vx = this.V[this.x];
                var vy = this.V[this.y];

                // log sprite
                // sprite.forEach(byte => console.log(byte.toString(2)));

                var collision = 0;
                for(var i = 0; i < sprite.byteLength; i++) {
                    for(var j = 0; j < 8; j++) {
                        var k = 1 << (7 - j);
                        var spritePixel = sprite[i] & k ? 1 : 0;
                        var currentY = (vy + i) % Chip8Spec.DISPLAY_HEIGHT;
                        var currentX = (vx + j) % Chip8Spec.DISPLAY_WIDTH;
                        var oldPixel = this.display[currentY][currentX];
                        var newPixel = spritePixel ^ oldPixel;
                        this.display[currentY][currentX] = newPixel;
                        
                        if (oldPixel & spritePixel) {
                            collision = 1;
                        }
                    }
                }
                this.V[0xF] = collision;
                //console.log(`Display ${this.n}-byte sprite from ${this.I} at (${this.V[this.x]}, ${this.V[this.y]}), set VF = ${collision}.`);
                break;
            case 0xE000: // EX??:
                switch (this.opcode & 0x00FF)
                {
                    case 0x009E: // Ex9E: Skip next instruction if key with the value of Vx is pressed.
                        // Checks the keyboard, and if the key corresponding to the value of Vx is currently in the down position, PC is increased by 2.
                        //console.log(`Ex9E: Skip next instruction if key with the value of Vx (${this.V[this.x]}) is pressed.`);
                        var key = this.V[this.x];
                        if (this.keys[key]) {
                            //console.log(`${key} is pressed. Skip`);
                            this.programCounter += 2;
                        } else {
                            //console.log(`${key} is NOT pressed. DON'T skip`);
                        }
                        break;
                    case 0x00A1: // ExA1: Skip next instruction if key with the value of Vx is not pressed.
                        // Checks the keyboard, and if the key corresponding to the value of Vx is currently in the up position, PC is increased by 2.
                        //console.log(`ExA1: Skip next instruction if key with the value of Vx (${this.V[this.x]}) is not pressed.`);
                        var key = this.V[this.x];
                        if (this.keys[key]) {
                            //console.log(`${key} is pressed. DON'T skip`);
                        } else {
                            //console.log(`${key} is NOT pressed. Skip`);
                            this.programCounter += 2;
                        }
                        break
                    default:
                        console.error("Unknown opcode [0x0000]: 0x%X\n", this.opcode);
                        break;
                }
                break;
            case 0xF000: // FX??:
                switch (this.opcode & 0x00FF)
                {
                    case 0x0007: // Fx07: Set Vx = delay timer value.
                        // The value of DT is placed into Vx.
                        //console.log('Fx07: Set Vx = delay timer value.');
                        //console.log(`V${this.x} = ${this.delayTimer}`);
                        this.V[this.x] = this.delayTimer;
                        break;
                    case 0x000A: // Fx0A: Wait for a key press, store the value of the key in Vx.
                        // All execution stops until a key is pressed, then the value of that key is stored in Vx.
                        //console.log('Fx0A: Wait for a key press, store the value of the key in Vx.');
                        if (!this.awaitingKey) {
                            this.awaitingKey = true;
                            return;
                        }

                        this.keys.forEach((key, index) => {
                            if (key) {
                                this.V[this.x] = index;
                            }
                            this.awaitingKey = false;
                        });
                        break;
                    case 0x0015: // Fx15: Set delay timer = Vx.
                        // DT is set equal to the value of Vx.
                        //console.log(`Fx15: Set delay timer = Vx = ${this.V[this.x]}`);
                        this.delayTimer = this.V[this.x];
                        break;
                    case 0x0018: // Fx18: Set sound timer = Vx.
                        // ST is set equal to the value of Vx.
                        //console.log(`Fx18: Set sound timer = Vx = ${this.V[this.x]}`);
                        this.soundTimer = this.V[this.x];
                        break;
                    case 0x001E: // Fx1E: Set I = I + Vx.
                        // The values of I and Vx are added, and the results are stored in I.
                        //console.log('Fx1E: Set I = I + Vx.');
                        var vx = this.V[this.x];
                        var i = vx + this.I;
                        this.I = i & 0x0FFF; // TODO: do i need to truncate in case of overflow?
                        //console.log(`I = ${i} + ${vx}`);
                        break;
                    case 0x0029: // Fx29: Set I = location of sprite for digit Vx.
                        // The value of I is set to the location for the hexadecimal sprite corresponding to the value of Vx. See section 2.4, Display, for more information on the Chip-8 hexadecimal font.
                        //console.log('Fx29: Set I = location of sprite for digit Vx.');
                        //console.log(`x = ${this.x}, Vx = ${this.V[this.x]}`);
                        //console.log(`I = ${Chip8Spec.GET_CHAR_LOCATION(this.V[this.x])}`);
                        this.I = Chip8Spec.GET_CHAR_LOCATION(this.V[this.x]);
                        break;
                    case 0x0033: // Fx33: Store BCD representation of Vx in memory locations I, I+1, and I+2.
                        // The interpreter takes the decimal value of Vx, and places the hundreds digit in memory at location in I, the tens digit at location I+1, and the ones digit at location I+2.
                        //console.log('Fx33: Store BCD representation of Vx in memory locations I, I+1, and I+2.');
                        var vx = this.V[this.x];
                        var vx_hundred = Math.floor((vx % 1000) /  100);
                        var vx_ten = Math.floor((vx % 100) /  10);
                        var vx_one = vx % 10;
                        //console.log(`memory[${this.I}] = V${this.x} == ${vx}: ${vx_hundred}, ${vx_ten}, ${vx_one}`);
                        this.memory[this.I] = vx_hundred;
                        this.memory[this.I + 1] = vx_ten;
                        this.memory[this.I + 2] = vx_one;
                        break;
                    case 0x0055: // Fx55: Store registers V0 through Vx in memory starting at location I.
                        // The interpreter copies the values of registers V0 through Vx into memory, starting at the address in I.
                        //console.log('Fx55: Store registers V0 through Vx in memory starting at location I.');
                        for (var i = 0; i <= this.x; i++) {
                            this.memory[this.I + i] = this.V[i];
                        }
                        break;
                    case 0x0065: // Fx65: Read registers V0 through Vx from memory starting at location I.
                        // The interpreter reads values from memory starting at location I into registers V0 through Vx.
                        //console.log(`Fx65: Read registers V0 through Vx (V${this.x}) from memory starting at location I.`);
                        for (var i = 0; i <= this.x; i++) {
                            this.V[i] = this.memory[this.I + i];
                        }
                        break;
                    default:
                        console.error("Unknown opcode [0x0000]: 0x%X\n", this.opcode);
                        break;
                }
                break;
        }  
        
        // Update timers
        if(this.delayTimer > 0) {
            this.delayTimer--;
        }
        if(this.soundTimer > 0) {
            if(this.soundTimer == 1) {
                //console.log("BEEP!\n");
            }
            this.soundTimer--;
        }
        console.groupEnd();
    }

    private getX(): number {
        return (this.opcode & 0x0F00) >> 8;
    }

    private getY(): number {
        return (this.opcode & 0x00F0) >> 4;
    }

    private getNNN(): number {
        return this.opcode & 0x0FFF
    }

    private getKK(): number {
        return this.opcode & 0x00FF;
    }

    private getN(): number {
        return this.opcode & 0x000F;
    }

    private initializeDisplay(): void {
        console.info('Initialize display');
        this.display = [];
        for(var y = 0; y < Chip8Spec.DISPLAY_HEIGHT; y++) {
            this.display.push([]);
            for (var x = 0; x < Chip8Spec.DISPLAY_WIDTH; x++) {
                this.display[y].push(0);
            }
        }
    }
}