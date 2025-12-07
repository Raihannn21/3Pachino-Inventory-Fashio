declare module 'esc-pos-encoder' {
  export default class EscPosEncoder {
    constructor();
    initialize(): this;
    align(alignment: 'left' | 'center' | 'right'): this;
    bold(enabled: boolean): this;
    size(size: 'small' | 'normal' | 'large'): this;
    line(text: string): this;
    newline(): this;
    cut(type: 'full' | 'partial'): this;
    encode(): Uint8Array;
  }
}
