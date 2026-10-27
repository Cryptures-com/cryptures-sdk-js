import type { UploadableFile } from '../types/blockchain.js';

/** Wraps raw bytes (or a `Blob`/`File`) as a `Blob`, applying `contentType` to raw bytes only. */
export function toBlob(file: UploadableFile, contentType: string | undefined): Blob {
  if (file instanceof Blob) return file;
  const bytes =
    file instanceof ArrayBuffer
      ? new Uint8Array(file)
      : new Uint8Array(file.buffer as ArrayBuffer, file.byteOffset, file.byteLength);
  return new Blob([bytes], contentType ? { type: contentType } : {});
}
