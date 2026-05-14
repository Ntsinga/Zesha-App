/**
 * Local Image Store
 *
 * Persists images to the device filesystem for offline access using expo-file-system.
 * Images are stored in the document directory under offline-images/ and can be uploaded
 * later when connectivity is restored.
 */

import { Platform } from "react-native";

// expo-file-system is not supported on web — guard all usage behind Platform.OS check.
// Imports are lazy to avoid crashing at module load time on web.
let _Directory: typeof import("expo-file-system").Directory | null = null;
let _File: typeof import("expo-file-system").File | null = null;
let _Paths: typeof import("expo-file-system").Paths | null = null;
let _offlineImagesDir: InstanceType<
  typeof import("expo-file-system").Directory
> | null = null;

function getFS() {
  if (Platform.OS === "web") return null;
  if (!_Directory) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("expo-file-system");
    _Directory = fs.Directory;
    _File = fs.File;
    _Paths = fs.Paths;
  }
  return { Directory: _Directory!, File: _File!, Paths: _Paths! };
}

function getOfflineDir() {
  if (_offlineImagesDir) return _offlineImagesDir;
  const fs = getFS();
  if (!fs) return null;
  _offlineImagesDir = new fs.Directory(fs.Paths.document, "offline-images");
  return _offlineImagesDir;
}

/**
 * Ensure the offline images directory exists
 */
async function ensureDir(): Promise<void> {
  const dir = getOfflineDir();
  if (!dir) return;
  if (!dir.exists) {
    dir.create({
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
  const fs = getFS();
  if (!fs) return tempUri; // On web, return the original URI as-is
  await ensureDir();

  const dir = getOfflineDir()!;
  const name =
    filename ??
    `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const extension = tempUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const sourceFile = new fs.File(tempUri);
  const destinationFile = new fs.File(dir, `${name}.${extension}`);

  sourceFile.copy(destinationFile);

  return destinationFile.uri;
}

/**
 * Read an image as a base64 string (useful for uploading)
 */
export async function readImageAsBase64(uri: string): Promise<string> {
  const fs = getFS();
  if (!fs) return "";
  return new fs.File(uri).base64();
}

/**
 * Delete a locally stored image after successful upload
 */
export async function deleteLocalImage(uri: string): Promise<void> {
  const fs = getFS();
  if (!fs) return;
  const file = new fs.File(uri);
  if (file.exists) {
    file.delete();
  }
}

/**
 * Delete all offline images (e.g., after logout or full sync)
 */
export async function clearAllLocalImages(): Promise<void> {
  const dir = getOfflineDir();
  if (!dir) return;
  if (dir.exists) {
    dir.delete();
  }
}

/**
 * Get the total size of locally stored images in bytes
 */
export async function getLocalImagesSize(): Promise<number> {
  const fs = getFS();
  const dir = getOfflineDir();
  if (!fs || !dir || !dir.exists) return 0;

  const files = dir.list();
  let totalSize = 0;

  for (const file of files) {
    if (file instanceof fs.File) {
      totalSize += file.size ?? 0;
    }
  }

  return totalSize;
}

/**
 * List all locally stored image URIs
 */
export async function listLocalImages(): Promise<string[]> {
  const fs = getFS();
  const dir = getOfflineDir();
  if (!fs || !dir || !dir.exists) return [];

  return dir
    .list()
    .filter(
      (entry): entry is InstanceType<typeof fs.File> =>
        entry instanceof fs.File,
    )
    .map((file) => file.uri);
}
