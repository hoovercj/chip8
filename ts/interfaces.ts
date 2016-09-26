export interface IChip8 {
    getDisplay(): number[][];
    getDrawFlag(): boolean;
    setDrawFlag(flag: boolean): void;
    setKeys(keys: boolean[]): void;

    initialize(): void;
    loadRom(buffer: ArrayBuffer): void;
    emulateCycle(): void;
}