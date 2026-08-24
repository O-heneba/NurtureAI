import { syncQueueStore } from "./local-store";
import type { SyncQueueOperation } from "./types";

export const DEFAULT_BATCH_SIZE = 20;

export async function listReadyQueue(batchSize = DEFAULT_BATCH_SIZE): Promise<SyncQueueOperation[]> {
  const now = Date.now();
  const operations = await syncQueueStore.listByPriority();
  return operations
    .filter((operation) =>
      ["pending", "syncing", "retrying"].includes(operation.syncStatus) ||
      (operation.syncStatus === "failed" &&
        !!operation.retryAfter &&
        Date.parse(operation.retryAfter) <= now),
    )
    .sort((left, right) => {
      const entityOrder = left.priority === right.priority ? 0 : right.priority - left.priority;
      if (entityOrder !== 0) return entityOrder;
      const operationOrder = { create: 0, update: 1, delete: 2 };
      return operationOrder[left.operationType] - operationOrder[right.operationType];
    })
    .slice(0, batchSize);
}
