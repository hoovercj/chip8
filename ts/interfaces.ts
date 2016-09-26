export interface IChip8 {
    getDisplay(): number[][];
    setKeys(keys: boolean[]): void;

    initialize(): void;
    loadRom(buffer: ArrayBuffer): void;
    emulateCycle(): void;
}