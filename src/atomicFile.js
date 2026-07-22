import { rename, rm, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const RETRYABLE_REPLACE_ERRORS = new Set(['EACCES', 'EBUSY', 'EPERM']);
let temporarySequence = 0;

export async function atomicWriteFile(filePath, content, options = {}) {
  temporarySequence += 1;
  const temporaryPath = `${filePath}.${process.pid}.${temporarySequence}.tmp`;
  const write = options.writeFile || writeFile;
  const remove = options.removeFile || rm;

  try {
    await write(temporaryPath, content, 'utf8');
    await replaceFileWithRetry(temporaryPath, filePath, options);
  } finally {
    await remove(temporaryPath, { force: true }).catch(() => {});
  }
}

export async function replaceFileWithRetry(sourcePath, destinationPath, {
  renameFile = rename,
  wait = delay,
  maxAttempts = 8,
  initialDelayMs = 25,
  maxDelayMs = 500
} = {}) {
  const attempts = Math.max(1, Number(maxAttempts || 1));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await renameFile(sourcePath, destinationPath);
      return;
    } catch (error) {
      if (!RETRYABLE_REPLACE_ERRORS.has(error.code) || attempt >= attempts) {
        throw error;
      }
      const waitMs = Math.min(
        Number(initialDelayMs || 0) * (2 ** (attempt - 1)),
        Number(maxDelayMs || 0)
      );
      await wait(waitMs);
    }
  }
}
