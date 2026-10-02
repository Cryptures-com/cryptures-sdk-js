import type { APIPromise } from '../../core/api-promise.js';
import { APIResource } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type { IpfsUploadOptions, IpfsUploadResponse, UploadableFile } from '../../types/blockchain.js';

function toBlob(file: UploadableFile, contentType: string | undefined): Blob {
  if (file instanceof Blob) return file;
  const bytes =
    file instanceof ArrayBuffer
      ? new Uint8Array(file)
      : new Uint8Array(file.buffer as ArrayBuffer, file.byteOffset, file.byteLength);
  return new Blob([bytes], contentType ? { type: contentType } : {});
}

/** IPFS storage. `client.blockchain.storage`. */
export class BlockchainStorage extends APIResource {
  /**
   * Uploads a file to IPFS and returns its CID (`storage.ipfs.upload`).
   * Sent as `multipart/form-data` with a single `file` field. Billed per
   * call, so **not retried automatically.**
   */
  uploadToIpfs(file: UploadableFile, params?: IpfsUploadOptions, options?: RequestOptions): APIPromise<IpfsUploadResponse> {
    const form = new FormData();
    const blob = toBlob(file, params?.contentType);
    const fileName = typeof File !== 'undefined' && file instanceof File ? file.name : undefined;
    form.append('file', blob, params?.filename ?? fileName ?? 'file');
    return this._client.request({ method: 'POST', path: '/api/v1/blockchain/storage/ipfs', formData: form, retryable: false }, options);
  }
}
