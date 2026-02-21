/**
 * Local Image Store
 *
 * Persists images to the device filesystem for offline access using expo-file-system.
 * Images are stored in documentDirectory/offline-images/ and can be uploaded
 * later when connectivity is restored.
 */

import * as FileSystem from "expo-file-system";

const OFFLINE_IMAGES_DIR = `${FileSystem.documentDirectory}offline-images/`;

/**
 * Ensure the offline images directory exists
 */
async function ensureDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_IMAGES_DIR, {
      intermediates: true,
    });
  }
}

/**
 * Save an image from a temporary URI (e.g., from image picker) to persistent
 * offline storage. Returns the new persistent URI.
 *
 * @param tempUri - The temporary file URI from expo-image-picker or camera
 * @param filename - Optional filename. If omitted, a unique name is generated.
 * @returns The persistent file URI in documentDirectory
 */
export async function saveImageLocally(
  tempUri: string,
  filename?: string,
): Promise<string> {
  await ensureDir();

  const name = filename ?? `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  // Preserve extension from original URI
  const extension = tempUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const destUri = `${OFFLINE_IMAGES_DIR}${name}.${extension}`;

  await FileSystem.copyAsync({
    from: tempUri,
    to: destUri,
  });

  return destUri;
}

/**
 * Read an image as a base64 string (useful for uploading)
 */
export async function readImageAsBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Delete a locally stored image after successful upload
 */
export async function deleteLocalImage(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

/**
 * Delete all offline images (e.g., after logout or full sync)
 */
export async function clearAllLocalImages(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGES_DIR);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(OFFLINE_IMAGES_DIR, { idempotent: true });
  }
}

/**
 * Get the total size of locally stored images in bytes
 */
export async function getLocalImagesSize(): Promise<number> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGES_DIR);
  if (!dirInfo.exists) return 0;

  const files = await FileSystem.readDirectoryAsync(OFFLINE_IMAGES_DIR);
  let totalSize = 0;

  for (const file of files) {
    const fileInfo = await FileSystem.getInfoAsync(`${OFFLINE_IMAGES_DIR}${file}`);
    if (fileInfo.exists && "size" in fileInfo) {
      totalSize += fileInfo.size ?? 0;
    }
  }

  return totalSize;
}

/**
 * List all locally stored image URIs
 */
export async function listLocalImages(): Promise<string[]> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGES_DIR);
  if (!dirInfo.exists) return [];

  const files = await FileSystem.readDirectoryAsync(OFFLINE_IMAGES_DIR);
  return files.map((f) => `${OFFLINE_IMAGES_DIR}${f}`);
}
