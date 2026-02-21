/**
 * Offline Queue Helper
 *
 * Provides a clean interface for screen hooks to queue mutations for offline sync.
 * Handles payload mapping (camelCase → snake_case), local image storage, and
 * dispatching to the syncQueueSlice.
 */

import { Platform } from "react-native";
import { store } from "@/store";
import { addToQueue } from "@/store/slices/syncQueueSlice";
import type { SyncEntityType, SyncMethod } from "@/store/slices/syncQueueSlice";
import { mapApiRequest } from "@/types";
import { saveImageLocally } from "./localImageStore";

interface QueueMutationParams {
  entityType: SyncEntityType;
  method: SyncMethod;
  endpoint: string;
  /** Payload in camelCase — will be converted to snake_case automatically */
  payload: Record<string, unknown> | null;
  /** Temporary image URIs (e.g., from camera/picker) that need local persistence */
  imageUris?: string[];
}

/**
 * Queue an offline mutation for later sync.
 *
 * - Converts payload from camelCase to snake_case
 * - Persists any temporary images to the device filesystem
 * - Adds the item to the Redux sync queue (persisted via redux-persist)
 */
export async function queueOfflineMutation(
  params: QueueMutationParams,
): Promise<void> {
  // On web, offline queueing is not supported
  if (Platform.OS === "web") {
    throw new Error("Offline mutations are only supported on mobile.");
  }

  // Persist temporary images to stable local storage
  let localImageUris: string[] | undefined;
  if (params.imageUris && params.imageUris.length > 0) {
    const savedUris: string[] = [];
    for (const uri of params.imageUris) {
      if (uri) {
        try {
          const persistedUri = await saveImageLocally(uri);
          savedUris.push(persistedUri);
        } catch {
          // Skip images that fail to save — non-fatal
        }
      }
    }
    if (savedUris.length > 0) {
      localImageUris = savedUris;
    }
  }

  // Convert payload from camelCase (frontend) to snake_case (API)
  const mappedPayload = params.payload
    ? (mapApiRequest(params.payload) as Record<string, unknown>)
    : null;

  store.dispatch(
    addToQueue({
      entityType: params.entityType,
      method: params.method,
      endpoint: params.endpoint,
      payload: mappedPayload,
      localImageUris,
    }),
  );
}
