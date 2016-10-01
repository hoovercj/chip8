export interface IChip8 {
    // Getters for internal state
    Opcode: number;
    Memory: Uint8Array;
    V: Uint8Array;
    I: number;
    ProgramCounter: number;
    Display: number[][];
    DelayTimer: number;
    SoundTimer: number;
    Stack: number[];
    AwaitingKey: boolean;

    // Methods for interacting with chip8
    initialize(): void;
    loadRom(buffer: ArrayBuffer): void;
    emulateCycle(): void;
    setKeys(keys: boolean[]): void;
    updateTimers(): void;

    // Testability Methods
    // setOpcodeFromMemory(): void;
    performOpcode(): void;
}