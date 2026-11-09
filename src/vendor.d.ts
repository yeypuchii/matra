// Types for dependencies that ship no types. Only the parts that matra uses.

declare module 'wawoff2/decompress.js' {
  /** Decode WOFF2 bytes to TTF or OTF bytes. Rejects when the bytes are not valid WOFF2. */
  export default function decompress(data: Uint8Array): Promise<Uint8Array>;
}

declare module 'wawoff2/compress.js' {
  /** Encode TTF or OTF bytes as WOFF2. */
  export default function compress(data: Uint8Array): Promise<Uint8Array>;
}

declare module 'linebreak' {
  export class Break {
    /** The UTF-16 offset where the next line may start. */
    position: number;
    /** True for a mandatory break (after a newline). */
    required: boolean;
  }
  export class LineBreaker {
    constructor(text: string);
    /** The next break opportunity, or null after the end of the text. */
    nextBreak(): Break | null;
  }
}
