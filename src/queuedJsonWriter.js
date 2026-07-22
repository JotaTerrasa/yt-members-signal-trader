import { atomicWriteFile } from './atomicFile.js';

export class QueuedJsonWriter {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  write(value) {
    const content = `${JSON.stringify(value, null, 2)}\n`;
    const operation = this.queue
      .catch(() => null)
      .then(() => atomicWriteFile(this.filePath, content));
    this.queue = operation;
    return operation;
  }

  async flush() {
    await this.queue;
  }
}
