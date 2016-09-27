# Type8 - A Chip8 Emulator written in Typescript
WIP.

For fun :-)

### How to run:
- Serve (I use `http-server`)
- Navigate to display.html
- Load one of the included ROMs

### How to modify:
- npm install
- pack it up with `webpack`
- Run according to instructions above

### How to run tests:
- npm install
- npm test

### TODO:
[X] Expose memory, registers, program counter, etc. as part of the interface
[X] Write tests for the opcodes
[] Clean up comments
[] Make logging configurable. I want to be able to debug issues but not have to scroll three days between opcodes

### References
- [How to write an emulator](http://www.multigesture.net/articles/how-to-write-an-emulator-chip-8-interpreter/)
- [Cowgod's Chip8 reference](http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#font)