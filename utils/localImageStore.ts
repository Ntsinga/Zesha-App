/**
 * Local Image Store
 *
 * Persists images to the device filesystem for offline access using expo-file-system.
 * Images are stored in the document directory under offline-images/ and can be uploaded
 * later when connectivity is restored.
 */

import { Directory, File, Paths } from "expo-file-system";

const OFFLINE_IMAGES_DIR = new Directory(Paths.document, "offline-images");

/**
 * Ensure the offline images directory exists
 */
async function ensureDir(): Promise<void> {
  if (!OFFLINE_IMAGES_DIR.exists) {
    OFFLINE_IMAGES_DIR.create({
      idempotent: true,
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
 * @returns The persistent file URI in the document directory
 */
export async function saveImageLocally(
  tempUri: string,
  filename?: string,
): Promise<string> {
  await ensureDir();

  const name = filename ?? `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  // Preserve extension from original URI
  const extension = tempUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const sourceFile = new File(tempUri);
  const destinationFile = new File(OFFLINE_IMAGES_DIR, `${name}.${extension}`);

  sourceFile.copy(destinationFile);

  return destinationFile.uri;
}

/**
 * Read an image as a base64 string (useful for uploading)
 */
export async function readImageAsBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

/**
 * Delete a locally stored image after successful upload
 */
export async function deleteLocalImage(uri: string): Promise<void> {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}

/**
 * Delete all offline images (e.g., after logout or full sync)
 */
export async function clearAllLocalImages(): Promise<void> {
  if (OFFLINE_IMAGES_DIR.exists) {
    OFFLINE_IMAGES_DIR.delete();
  }
}

/**
 * Get the total size of locally stored images in bytes
 */
export async function getLocalImagesSize(): Promise<number> {
  if (!OFFLINE_IMAGES_DIR.exists) return 0;

  const files = OFFLINE_IMAGES_DIR.list();
  let totalSize = 0;

  for (const file of files) {
    if (file instanceof File) {
      totalSize += file.size ?? 0;
    }
  }

  return totalSize;
}

/**
 * List all locally stored image URIs
 */
export async function listLocalImages(): Promise<string[]> {
  if (!OFFLINE_IMAGES_DIR.exists) return [];

  return OFFLINE_IMAGES_DIR.list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => file.uri);
}
