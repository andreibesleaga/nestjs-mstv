import {
  StorageAdapter,
  UploadOptions,
  StreamUploadOptions,
  StreamDownloadOptions,
} from '../storage.types';
import { PassThrough } from 'stream';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';

export class AzureBlobStorageAdapter implements StorageAdapter {
  private readonly containerName: string;
  private readonly blobService: BlobServiceClient;
  private readonly sharedKeyCred?: StorageSharedKeyCredential;

  constructor() {
    this.containerName = process.env.AZURE_BLOB_CONTAINER || '';
    const conn =
      process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_BLOB_CONNECTION_STRING;
    if (conn) {
      this.blobService = BlobServiceClient.fromConnectionString(conn);
    } else {
      // Support account/key auth
      const accountName = process.env.AZURE_STORAGE_ACCOUNT || process.env.AZURE_ACCOUNT_NAME;
      const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || process.env.AZURE_ACCOUNT_KEY;
      if (!accountName || !accountKey) {
        throw new Error('Azure storage credentials missing');
      }
      this.sharedKeyCred = new StorageSharedKeyCredential(accountName, accountKey);
      const url = `https://${accountName}.blob.core.windows.net`;
      this.blobService = new BlobServiceClient(url, this.sharedKeyCred);
    }
  }

  private container() {
    return this.blobService.getContainerClient(this.containerName);
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: UploadOptions
  ): Promise<{ key: string }> {
    const block = this.container().getBlockBlobClient(key);
    const body =
      typeof data === 'string'
        ? Buffer.from(data)
        : Buffer.isBuffer(data)
          ? data
          : Buffer.from(data);
    await block.uploadData(body, { blobHTTPHeaders: { blobContentType: options?.contentType } });
    return { key };
  }

  async download(key: string): Promise<Buffer> {
    const block = this.container().getBlockBlobClient(key);
    const dl = await block.download();
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      dl.readableStreamBody
        ?.on('data', (d: Buffer) => chunks.push(d))
        .on('error', reject)
        .on('end', () => resolve());
    });
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    const block = this.container().getBlockBlobClient(key);
    await block.deleteIfExists();
  }

  async exists(key: string): Promise<boolean> {
    const block = this.container().getBlockBlobClient(key);
    return await block.exists();
  }

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    for await (const item of this.container().listBlobsFlat({ prefix })) {
      if (item.name) keys.push(item.name);
    }
    return keys;
  }

  async getSignedUrl(
    key: string,
    operation: 'get' | 'put' | 'delete',
    expiresInSeconds = 900
  ): Promise<string> {
    // Prefer SDK's generateSasUrl when available on client, otherwise build SAS
    const block = this.container().getBlockBlobClient(key);
    if (typeof (block as any).generateSasUrl === 'function') {
      return await (block as any).generateSasUrl({
        expiresOn: new Date(Date.now() + expiresInSeconds * 1000),
      });
    }
    if (!this.sharedKeyCred) {
      throw new Error('Shared key credentials required for SAS generation');
    }
    const accountName = (this.blobService as any).accountName;
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse(
          operation === 'get' ? 'r' : operation === 'put' ? 'cwr' : 'd'
        ),
        protocol: SASProtocol.Https,
        expiresOn: new Date(
          Date.now() + Math.max(1, Math.min(7 * 24 * 3600, expiresInSeconds)) * 1000
        ),
      },
      this.sharedKeyCred
    ).toString();
    return `https://${accountName}.blob.core.windows.net/${this.containerName}/${encodeURIComponent(key)}?${sas}`;
  }

  async uploadStream(
    key: string,
    input: NodeJS.ReadableStream,
    options?: StreamUploadOptions
  ): Promise<{ key: string }> {
    const block = this.container().getBlockBlobClient(key);
    let body: NodeJS.ReadableStream = input;
    if (options?.transforms?.length) {
      for (const t of options.transforms) body = body.pipe(t);
    }
    // Azure SDK has uploadStream, but we can also pipe to a PassThrough and use uploadStream
    const pass = new PassThrough();
    body.pipe(pass);
    await block.uploadStream(pass, 4 * 1024 * 1024, 5, {
      blobHTTPHeaders: { blobContentType: options?.contentType },
    });
    return { key };
  }

  async downloadStream(
    key: string,
    options?: StreamDownloadOptions
  ): Promise<NodeJS.ReadableStream> {
    const block = this.container().getBlockBlobClient(key);
    const resp = await block.download();
    let stream: NodeJS.ReadableStream = resp.readableStreamBody as NodeJS.ReadableStream;
    if (options?.transforms?.length) {
      for (const t of options.transforms) stream = stream.pipe(t);
    }
    return stream;
  }
}
