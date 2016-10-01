// Test code adapted from the tests by Rodrigo Navarro (https://github.com/reu/chip8.js/blob/master/test/cpu.test.js)
'use strict';

import expect = require('expect.js');
import { IChip8 } from '../src/interfaces';
import { Chip8Spec } from '../src/Chip8Spec'
import { Chip8 } from '../src/chip8';

describe('Chip8', () => {

    var chip8: IChip8;

    beforeEach(() => {
        chip8 = new Chip8();
    });
    describe("#initialization", function () {

        it("has a program counter initialized with 0x200", function () {
            expect(chip8.ProgramCounter).to.be(0x200);
        });

        it("has 4096 bytes", function () {
            expect(chip8.Memory).to.have.length(4096);
        });

        it("has 16 8-bit data registers named from v0 to vF", function () {
            expect(chip8.V).to.have.length(16);
            expect(chip8.V.BYTES_PER_ELEMENT).to.equal(1);
        });
    });

    describe("#cycle", function () {

        it("performs the correct opcode", function () {
            chip8.ProgramCounter = 5;
            chip8.Memory[5] = 0xAA;
            chip8.Memory[6] = 0xBB;
            chip8.emulateCycle();
            // chip8.setOpcodeFromMemory();
            expect(chip8.Opcode).to.equal(0xAABB);
        });

        context("when paused", function () {
            beforeEach(function () {
                chip8.AwaitingKey = true;
            });

            it("doesn't perform any opcode", function () {
                chip8.ProgramCounter = 5;
                chip8.Memory[5] = 0xAA;
                chip8.Memory[6] = 0xBB;
                chip8.emulateCycle();
                expect(chip8.ProgramCounter).to.be(5);
                expect(chip8.Opcode).to.be(0xAABB);
            });

            it("doesn't update the timers", function () {
                chip8.SoundTimer = 1;
                chip8.DelayTimer = 1;
                chip8.emulateCycle();
                expect(chip8.SoundTimer).to.be(1);
                expect(chip8.DelayTimer).to.be(1);
            });
        });
    });

    describe("#loadProgram", function () {
        it("loads the rom data into memory starting at address 0x200", function () {
            var rom = new Uint8Array([0x1, 0x2, 0x3]);
            chip8.loadRom(rom.buffer);
            expect(chip8.Memory[0x200]).to.equal(1);
            expect(chip8.Memory[0x201]).to.equal(2);
            expect(chip8.Memory[0x202]).to.equal(3);
        });
    });

    describe("#perform(opcode)", function () {
        // Shared examples
        var shouldIncrementProgramCounter = function (opcode) {
            it("increments the program counter by two", function () {
                chip8.ProgramCounter = 10;
                chip8.Opcode = opcode;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(12);
            });
        }

        var shouldNotIncrementProgramCounter = function (opcode) {
            it("doesn't increment the program counter", function () {
                chip8.ProgramCounter = 10;
                chip8.Opcode = opcode;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(10);
            });
        }

        context("0x00E0", function () {
            it("clears the screen", function () {
                chip8.Opcode = 0x00E0;
                chip8.Display = [[1, 2, 3]]
                chip8.performOpcode;
                chip8.Display = [[]];
            });

            shouldIncrementProgramCounter(0x00E0);
        });

        context("0x00EE returns from a subroutine", function () {
            it("sets the program counter to the stored stack", function () {
                chip8.Stack = [10, 20, 30];
                chip8.Opcode = 0x00EE;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(30);
            });
        });

        context("0x1NNN", function () {
            it("jumps to address NNN", function () {
                chip8.Opcode = 0x1445;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(0x0445);
            });
        });

        context("0x2NNN", function () {
            it("calls subroutine at NNN", function () {
                chip8.Opcode = 0x2678;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(0x0678);
            });

            it("stores the current program counter on the stack", function () {
                var currentPc = chip8.ProgramCounter = 10;
                chip8.Opcode = 0x2333;
                chip8.performOpcode();
                expect(chip8.Stack).to.contain(currentPc + 2);
            });
        });

        context("0x3XNN", function () {
            it("skips the next instruction if VX equals NN", function () {
                chip8.ProgramCounter = 10;
                chip8.V[5] = 0x0003;
                chip8.Opcode = 0x3503;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(14);
            });

            it("runs the next instruction if VX doesn't equal NN", function () {
                chip8.ProgramCounter = 10;
                chip8.V[5] = 0x0003;
                chip8.Opcode = 0x3504;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(12);
            });
        });

        context("0x4XNN", function () {
            it("skips the next instruction if VX doesn't equal NN", function () {
                chip8.ProgramCounter = 10;
                chip8.V[5] = 0x0003;
                chip8.Opcode = 0x4504;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(14);
            });

            it("runs the next instruction if VX equals NN", function () {
                chip8.ProgramCounter = 10;
                chip8.V[5] = 0x0003;
                chip8.Opcode = 0x4503;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(12);
            });
        });

        context("0x5XY0", function () {
            it("skips the next instruction if VX equals VY", function () {
                chip8.ProgramCounter = 10;
                chip8.V[4] = 3;
                chip8.V[5] = 3;
                chip8.Opcode = 0x5450;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(14);
            });

            it("runs the next instruction if VX equals VY", function () {
                chip8.ProgramCounter = 10;
                chip8.V[4] = 3;
                chip8.V[5] = 4;
                chip8.Opcode = 0x5450;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(12);
            });
        });

        context("0x6XNN", function () {
            it("sets VX to NN", function () {
                chip8.Opcode = 0x6321;
                chip8.performOpcode();
                expect(chip8.V[3]).to.equal(0x0021);
            });

            shouldIncrementProgramCounter(0x6321);
        });

        context("0x7XNN", function () {
            it("adds NN to VX", function () {
                chip8.V[5] = 0x0004;
                chip8.Opcode = 0x7505;
                chip8.performOpcode();
                expect(chip8.V[5]).to.equal(0x0009);
            });

            shouldIncrementProgramCounter(0x7321);
        });

        context("0x8XY0", function () {
            it("sets VX to the value of VY", function () {
                var vx = chip8.V[1] = 1;
                var vy = chip8.V[2] = 2;

                chip8.Opcode = 0x8120;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(vy);
            });

            shouldIncrementProgramCounter(0x8120);
        });

        context("0x8XY1", function () {
            it("sets VX to VX or VY", function () {
                var vx, vy;

                vx = chip8.V[1] = 0;
                vy = chip8.V[2] = 2;
                chip8.Opcode = 0x8121;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(vy);

                vx = chip8.V[1] = 3;
                vy = chip8.V[2] = 2;
                chip8.Opcode = 0x8121;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(vx);
            });

            shouldIncrementProgramCounter(0x8001);
        });

        context("0x8XY2", function () {
            it("sets VX to VX and VY", function () {
                var vx = chip8.V[1] = 0;
                var vy = chip8.V[2] = 2;
                chip8.Opcode = 0x8122;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(0);

                vx = chip8.V[1] = 2;
                vy = chip8.V[2] = 2;
                chip8.Opcode = 0x8122;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(2);
            });

            shouldIncrementProgramCounter(0x8002);
        });

        context("0x8XY3", function () {
            it("sets VX to VX xor VY", function () {
                var vx, vy;

                vx = chip8.V[1] = 1;
                vy = chip8.V[2] = 1;
                chip8.Opcode = 0x8123;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(0);

                vx = chip8.V[1] = 0;
                vy = chip8.V[2] = 0;
                chip8.Opcode = 0x8123;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(0);

                vx = chip8.V[1] = 1;
                vy = chip8.V[2] = 0;
                chip8.Opcode = 0x8123;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(1);
            });

            shouldIncrementProgramCounter(0x8003);
        });

        context("0x8XY4", function () {
            it("adds VY to VX", function () {
                chip8.V[1] = 3;
                chip8.V[2] = 4;
                chip8.Opcode = 0x8124;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(7);
            });

            it("sets VF to 1 when there is a carry", function () {
                chip8.V[1] = 0xFF;
                chip8.V[2] = 0x01;
                chip8.V[0xF] = 0;
                chip8.Opcode = 0x8124;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(0);
                expect(chip8.V[0xF]).to.equal(1);
            });

            it("sets VF to 0 when there isn't a carry", function () {
                chip8.V[1] = 0xFE;
                chip8.V[2] = 0x01;
                chip8.V[0xF] = 1;
                chip8.Opcode = 0x8124;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(0xFF);
                expect(chip8.V[0xF]).to.equal(0);
            });

            shouldIncrementProgramCounter(0x8004);
        });

        context("0x8XY5", function () {
            it("subtracts VY from VX", function () {
                chip8.V[1] = 5;
                chip8.V[2] = 4;
                chip8.Opcode = 0x8125;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(1);
            });

            it("sets VF to 0 when there is a borrow", function () {
                chip8.V[1] = 5;
                chip8.V[2] = 6;
                chip8.V[0xF] = 1;
                chip8.Opcode = 0x8125;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(0xFF);
                expect(chip8.V[0xF]).to.equal(0);
            });

            it("sets VF to 1 when there isn't a borrow", function () {
                chip8.V[1] = 5;
                chip8.V[2] = 3;
                chip8.V[0xF] = 0;
                chip8.Opcode = 0x8125;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(2);
                expect(chip8.V[0xF]).to.equal(1);
            });

            shouldIncrementProgramCounter(0x8005);
        });

        context("0x8XY6", function () {
            it("shifts VX right by one", function () {
                chip8.V[1] = 8;
                chip8.Opcode = 0x8116;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(4);
            });

            it("sets VF to the value of the least significant bit of VX before the shift", function () {
                chip8.V[1] = 8;
                chip8.V[0xF] = 1;
                chip8.Opcode = 0x8116;
                chip8.performOpcode();
                expect(chip8.V[0xF]).to.equal(0);

                chip8.V[1] = 9;
                chip8.V[0xF] = 0;
                chip8.Opcode = 0x8116;
                chip8.performOpcode();
                expect(chip8.V[0xF]).to.equal(1);
            });

            shouldIncrementProgramCounter(0x8006);
        });

        context("0x8XY7", function () {
            it("sets VX to VY minus VX", function () {
                chip8.V[1] = 8;
                chip8.V[2] = 10;
                chip8.Opcode = 0x8127;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(2);
            });

            it("sets VF to 0 when there is a borrow", function () {
                chip8.V[1] = 11;
                chip8.V[2] = 10;
                chip8.V[0xF] = 1;
                chip8.Opcode = 0x8127;
                chip8.performOpcode();
                expect(chip8.V[0xF]).to.equal(0);
                expect(chip8.V[1]).to.equal(0xFF);
            });

            it("sets VF to 1 when there isn't a borrow", function () {
                chip8.V[1] = 10;
                chip8.V[2] = 10;
                chip8.V[0xF] = 0;
                chip8.Opcode = 0x8127;
                chip8.performOpcode();
                expect(chip8.V[0xF]).to.equal(1);
                expect(chip8.V[1]).to.equal(0);
            });

            shouldIncrementProgramCounter(0x8127);
        });

        context("0x8XYE", function () {
            it("shifts VX left by one", function () {
                chip8.V[1] = 8;
                chip8.Opcode = 0x811E;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(16);
            });

            it("sets VF to the value of the most significant bit of VX before the shift", function () {
                chip8.V[1] = 0x08;
                chip8.V[0xF] = 1;
                chip8.Opcode = 0x811E;
                chip8.performOpcode();
                expect(chip8.V[0xF]).to.equal(0);

                chip8.V[1] = 0x88;
                chip8.V[0xF] = 0;
                chip8.Opcode = 0x811E;
                chip8.performOpcode();
                // Seems like a bug to me. Could be a feature?
                // expect(chip8.V[0xF]).to.equal(0x80);
                expect(chip8.V[0xF]).to.equal(1);
            });

            shouldIncrementProgramCounter(0x800E);
        });

        context("0x9XY0", function () {
            it("skips the next instruction if VX doesn't equal VY", function () {
                chip8.V[1] = 0;
                chip8.V[2] = 1;
                chip8.ProgramCounter = 0;
                chip8.Opcode = 0x9120;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(4);

                chip8.V[1] = 1;
                chip8.V[2] = 1;
                chip8.ProgramCounter = 0;
                chip8.Opcode = 0x9120;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(2);
            });
        });

        context("0xANNN", function () {
            it("sets I to address NNN", function () {
                chip8.Opcode = 0xA123;
                chip8.performOpcode();
                expect(chip8.I).to.equal(0x0123);
            });

            shouldIncrementProgramCounter(0xA123);
        });

        context("0xBNNN", function () {
            it("jumps to address NNN plus V0", function () {
                chip8.V[0] = 0x01;
                chip8.Opcode = 0xB001;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(0x0002);
            });
        });

        context("0xCXNN", function () {
            var originalRandom;

            before(function () {
                var originalRandom = Math.random;
            });

            after(function () {
                Math.random = originalRandom;
            });

            it("sets VX to a random number and NN", function () {
                // Stubing out Math.random
                Math.random = function () { return 1 };

                chip8.Opcode = 0xC102;
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(2);
            });

            shouldIncrementProgramCounter(0xC102);
        });

        context("0xDXYN", function () {
            beforeEach(function () {
                chip8.I = 0;

                for (var i = 0; i < 16; i++) {
                    for (var j = 0; j < 16; j++) {
                        chip8.Memory[i + j] = 0x80;
                    }
                }
            });

            // it("draws a sprite at coordinate (VX, VY)", function (done) {
            //     var count = 0;

            //     chip8.Display.setPixel = function (x, y) {
            //         if (count == 0) {
            //             expect(x).to.equal(5);
            //             expect(y).to.equal(8);

            //             done();
            //             count++;
            //         }
            //     }

            //     chip8.V[1] = 5;
            //     chip8.V[2] = 8;

            //     chip8.Opcode = 0xD122;
            //     chip8.performOpcode();
            // });

            // it("draws a sprite with width of 8 pixels", function () {
            //     var xs = [];

            //     chip8.Display.setPixel = function (x, y) {
            //         xs.push(x);

            //         if (xs.length == 8) {
            //             var width = xs[xs.length - 1] - xs[0];
            //             expect(width).to.equal(8);
            //             done();
            //         }
            //     }

            //     chip8.V[1] = 5;
            //     chip8.V[2] = 6;

            //     chip8.Opcode = 0xD121;
            //     chip8.performOpcode();
            // });

            // it("draws a sprite with height of N pixels", function () {
            //     var ys = [];

            //     chip8.Display.setPixel = function (x, y) {
            //         ys.push(y);

            //         if (ys.length == 3 * 8) {
            //             var height = ys[ys.length - 1] - ys[0];
            //             expect(height).to.equal(3);
            //             done();
            //         }
            //     }

            //     chip8.V[1] = 5;
            //     chip8.V[2] = 6;

            //     chip8.Opcode = 0xD123;
            //     chip8.performOpcode();
            // });

            // it("sets VF to 1 if any screen pixels are flipped from set to unset when the sprite is drawn", function () {
            //     chip8.Display.setPixel = function () { return true }
            //     chip8.Opcode = 0xD121;
            //     chip8.performOpcode();
            // });

            // it("sets VF to 0 if no screen pixels are flipped from set to unset when the sprite is drawn", function () {
            //     chip8.Display.setPixel = function () { return false }
            //     chip8.Opcode = 0xD121;
            //     chip8.performOpcode();
            // });

            // shouldIncrementProgramCounter(0xD121);
        });

        context("0xEX9E", function () {
            it("skips the next instruction if the key stored in VX is pressed", function () {
                chip8.ProgramCounter = 0;
                chip8.V[1] = 5;
                var keys = [];
                keys[5] = true;
                chip8.setKeys(keys);

                chip8.Opcode = 0xE19E;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(4);
            });

            it("doesn't skip the next instruction if the key stored in VX is not pressed", function () {
                chip8.ProgramCounter = 0;
                chip8.V[2] = 6;
                chip8.setKeys([]);

                chip8.Opcode = 0xE29E;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(2);
            });
        });

        context("0xEXA1", function () {
            it("skips the next instruction if the key stored in VX isn't pressed", function () {
                chip8.ProgramCounter = 0;
                chip8.V[3] = 7;
                chip8.setKeys([]);

                chip8.Opcode = 0xE3A1;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(4);
            });

            it("doesn't skip the next instruction if the key stored in VX is pressed", function () {
                chip8.ProgramCounter = 0;
                chip8.V[4] = 8;
                var keys = [];
                keys[8] = true;
                chip8.setKeys(keys);

                chip8.Opcode = 0xE4A1;
                chip8.performOpcode();
                expect(chip8.ProgramCounter).to.equal(2);
            });
        });

        context("0xFX07", function () {
            it("sets VX to the value of the delay timer", function () {
                chip8.DelayTimer = 20;
                chip8.Opcode = 0xF207;
                chip8.performOpcode();
                expect(chip8.V[2]).to.equal(20);
            });

            shouldIncrementProgramCounter(0xF207);
        });

        context("0xFX0A", function () {
            it("pauses the emulation until a key is pressed", function () {
                chip8.Opcode = 0xF10A;
                chip8.performOpcode();
                expect(chip8.AwaitingKey).to.be(true);
                chip8.setKeys([true]);
                chip8.performOpcode();
                expect(chip8.AwaitingKey).to.be(false);
            });

            it("stores the pressed key in VX", function () {
                chip8.Opcode = 0xF10A;
                chip8.AwaitingKey = true;
                var keys = [];
                keys[5] = true;
                chip8.setKeys(keys);
                chip8.performOpcode();
                expect(chip8.V[1]).to.equal(5);
            });
        });

        context("0xFX15", function () {
            it("sets the delay timer to VX", function () {
                chip8.DelayTimer = 0;
                chip8.V[2] = 5;
                chip8.Opcode = 0xF215;
                chip8.performOpcode();
                expect(chip8.DelayTimer).to.equal(5);
            });

            shouldIncrementProgramCounter(0xF215);
        });

        context("0xFX18", function () {
            it("sets the sound timer to VX", function () {
                chip8.SoundTimer = 0;
                chip8.V[3] = 6;
                chip8.Opcode = 0xF318;
                chip8.performOpcode();
                expect(chip8.SoundTimer).to.equal(6);
            });

            shouldIncrementProgramCounter(0xF318);
        });

        context("0xFX1E", function () {
            it("adds VX to I", function () {
                chip8.I = 5;
                chip8.V[1] = 3;
                chip8.Opcode = 0xF11E;
                chip8.performOpcode();
                expect(chip8.I).to.equal(8);
            });

            shouldIncrementProgramCounter(0xF11E);
        });

        context("0xFX29", function () {
            it("sets the I to location of the sprite for the character in VX", function () {
                chip8.V[1] = 1;
                chip8.I = 0;
                chip8.Opcode = 0xF129;
                chip8.performOpcode();
                expect(chip8.I).to.equal(85);
            });

            shouldIncrementProgramCounter(0xF129);
        });

        context("0xFX33", function () {
            it("stores the BCD representation of VX in memory starting at I", function () {
                chip8.I = 0;
                chip8.V[1] = 198;
                chip8.Opcode = 0xF133;
                chip8.performOpcode();
                expect(chip8.Memory[0]).to.equal(1);
                expect(chip8.Memory[1]).to.equal(9);
                expect(chip8.Memory[2]).to.equal(8);
            });

            shouldIncrementProgramCounter(0xF133);
        });

        context("0xFX55", function () {
            it("stores V0 to VX in memory starting at address I", function () {
                chip8.V[0x0] = 0x00;
                chip8.V[0x1] = 0x10;
                chip8.V[0x2] = 0x20;
                chip8.V[0x3] = 0x30;

                chip8.I = 5;
                chip8.Opcode = 0xF355;
                chip8.performOpcode();

                expect(chip8.Memory[0x0 + 5]).to.equal(0x00);
                expect(chip8.Memory[0x1 + 5]).to.equal(0x10);
                expect(chip8.Memory[0x2 + 5]).to.equal(0x20);
                expect(chip8.Memory[0x3 + 5]).to.equal(0x30);
            });

            shouldIncrementProgramCounter(0xF355);
        });

        context("0xFX65", function () {
            it("fills V0 to VX with values from memory starting at address I", function () {
                chip8.I = 6;

                chip8.Memory[6 + 0x0] = 0x00;
                chip8.Memory[6 + 0x1] = 0x10;
                chip8.Memory[6 + 0x2] = 0x20;
                chip8.Memory[6 + 0x3] = 0x30;

                chip8.Opcode = 0xF365;
                chip8.performOpcode();

                expect(chip8.V[0x0]).to.equal(0x00);
                expect(chip8.V[0x1]).to.equal(0x10);
                expect(chip8.V[0x2]).to.equal(0x20);
                expect(chip8.V[0x3]).to.equal(0x30);
            });

            shouldIncrementProgramCounter(0xF365);
        });
    });
});
