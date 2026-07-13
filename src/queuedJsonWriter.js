import { rename, rm, writeFile } from 'node:fs/promises';

let temporarySequence = 0;

export class QueuedJsonWriter {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  write(value) {
    const content = `${JSON.stringify(value, null, 2)}\n`;
    const operation = this.queue
      .catch(() => null)
      .then(() => atomicWrite(this.filePath, content));
    this.queue = operation;
    return operation;
  }

  async flush() {
    await this.queue;
  }
}

async function atomicWrite(filePath, content) {
  temporarySequence += 1;
  const temporaryPath = `${filePath}.${process.pid}.${temporarySequence}.tmp`;
  try {
    await writeFile(temporaryPath, content, 'utf8');
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}
