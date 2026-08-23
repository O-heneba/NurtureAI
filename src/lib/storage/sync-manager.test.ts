import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { householdStore, personStore, syncQueueStore } from "./local-store";
import { SyncManager, queueCreate, queueDelete } from "./sync-manager";

const householdData = {
  community_id: "existing-community-id",
  house_no: "H-1",
  head_name: "Ama Mensah",
};

const personData = {
  full_name: "Kojo Mensah",
  household_id: "placeholder",
};

describe("offline synchronization infrastructure", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("queues an offline parent and child in dependency order", async () => {
    const household = await householdStore.create(householdData);
    const person = await personStore.create({ ...personData, household_id: household.localId });

    await queueCreate("persons", person);
    await queueCreate("households", household);

    const operations = await syncQueueStore.listByPriority();
    expect(operations.map((operation) => operation.entityType)).toEqual(["households", "persons"]);
    expect(operations.find((operation) => operation.entityType === "persons")?.payload).toMatchObject({
      household_id: household.localId,
    });
  });

  it("deduplicates a retryable operation and preserves it in IndexedDB", async () => {
    const household = await householdStore.create(householdData);

    await queueCreate("households", household);
    await queueCreate("households", household);

    const operations = await syncQueueStore.list();
    expect(operations).toHaveLength(1);
    expect(operations[0].localId).toBe(household.localId);
    expect(operations[0].syncStatus).toBe("pending");
  });

  it("keeps a previously synced record as a tombstone until delete sync completes", async () => {
    const household = await householdStore.create(householdData);
    await db.households.put({
      ...household,
      remoteId: "remote-household-id",
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
    });

    await householdStore.delete(household.localId);
    const tombstone = await householdStore.get(household.localId);
    expect(tombstone?.syncStatus).toBe("deleted");
    expect(tombstone?.remoteId).toBe("remote-household-id");

    const operation = await queueDelete("households", tombstone!);
    expect(operation?.operationType).toBe("delete");
    expect((await syncQueueStore.list()).some((item) => item.operationType === "delete")).toBe(true);
  });

  it("maps a successful remote ID and retries a transient failure", async () => {
    let failInsert = true;
    const client = {
      from: () => ({
        insert: (payload: { id: string }) => ({
          select: () => ({
            single: async () => {
              if (failInsert) {
                failInsert = false;
                return { data: null, error: { status: 503, message: "temporary outage" } };
              }
              return { data: { id: payload.id }, error: null };
            },
          }),
        }),
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
        delete: () => ({ eq: async () => ({ error: null }) }),
      }),
    };
    const manager = new SyncManager(client);
    const household = await householdStore.create(householdData);
    await queueCreate("households", household);

    await manager.syncNow();
    expect((await householdStore.get(household.localId))?.syncStatus).toBe("failed");

    const failed = (await syncQueueStore.list())[0];
    await syncQueueStore.update(failed.id, { retryAfter: new Date(0).toISOString() });
    await manager.syncNow();

    expect(await syncQueueStore.count()).toBe(0);
    expect((await householdStore.get(household.localId))?.remoteId).toBe(household.localId);
    expect((await householdStore.get(household.localId))?.syncStatus).toBe("synced");
  });
});
