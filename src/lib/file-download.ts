export type DownloadProgressCallback = (percent: number) => void;

async function fetchBlobWithProgress(
  url: string,
  onProgress?: DownloadProgressCallback,
): Promise<{ blob: Blob; contentType: string | null }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type");
  const contentLength = res.headers.get("content-length");
  const total = contentLength ? Number(contentLength) : null;

  // No stream or no size = fallback
  if (!res.body || !total || Number.isNaN(total)) {
    const blob = await res.blob();
    onProgress?.(100);
    return { blob, contentType };
  }

  const reader = res.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
      loaded += value.byteLength;
      const percent = Math.min(100, Math.round((loaded / total) * 100));
      onProgress?.(percent);
    }
  }

  const blob = new Blob(chunks, { type: contentType || undefined });
  onProgress?.(100);
  return { blob, contentType };
}

export async function downloadFileFromUrl(
  url: string,
  filename: string,
  onProgress?: DownloadProgressCallback,
): Promise<{ objectUrl: string; blob: Blob; contentType: string | null }> {
  const { blob, contentType } = await fetchBlobWithProgress(url, onProgress);

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Revoke later to avoid breaking the immediate download
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

  return { objectUrl, blob, contentType };
}
