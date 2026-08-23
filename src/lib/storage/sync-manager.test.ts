import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { householdStore, personStore, syncQueueStore } from "./local-store";
import { SyncManager, queueCreate, queueDelete } from "./sync-manager";
import {
  createWorkflowHousehold,
  createWorkflowPerson,
  listWorkflowHouseholds,
  listWorkflowPersons,
  updateWorkflowHousehold,
  updateWorkflowPerson,
} from "@/lib/household-person.service";

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

    expect(await syncQueueStore.list()).toEqual([]);
    expect((await householdStore.get(household.localId))?.remoteId).toBe(household.localId);
    expect((await householdStore.get(household.localId))?.syncStatus).toBe("synced");
  });

  it("creates and reads a linked household and person locally across reload-style reads", async () => {
    const household = await createWorkflowHousehold(householdData);
    const person = await createWorkflowPerson({
      full_name: "Akosua Mensah",
      household_id: household.localId,
      sex: "F",
      date_of_birth: "1994-01-01",
    });

    const households = await listWorkflowHouseholds();
    const people = await listWorkflowPersons();
    expect(households.find((row) => row.id === household.localId)?.workflowStatus).toBe("pending");
    expect(people.find((row) => row.id === person.localId)?.household_id).toBe(household.localId);

    await db.close();
    db.open();
    const reloadedHouseholds = await listWorkflowHouseholds();
    const reloadedPeople = await listWorkflowPersons();
    expect(reloadedHouseholds.some((row) => row.localId === household.localId)).toBe(true);
    expect(reloadedPeople.find((row) => row.localId === person.localId)?.household_id).toBe(
      household.localId,
    );
  });

  it("edits linked records offline and syncs both updates after reconnect", async () => {
    const household = await createWorkflowHousehold(householdData);
    const person = await createWorkflowPerson({
      full_name: "Yaw Mensah",
      household_id: household.localId,
      sex: "M",
      date_of_birth: "1990-01-01",
    });
    const editedHousehold = await updateWorkflowHousehold(household.localId, { head_name: "Ama Updated" });
    const editedPerson = await updateWorkflowPerson(person.localId, { phone: "+233240000000" });

    expect(editedHousehold.head_name).toBe("Ama Updated");
    expect(editedPerson.phone).toBe("+233240000000");
    await db.close();
    await db.open();
    expect((await householdStore.get(household.localId))?.head_name).toBe("Ama Updated");
    expect((await personStore.get(person.localId))?.phone).toBe("+233240000000");

    let remoteHousehold: Record<string, unknown> = { updated_at: new Date(0).toISOString() };
    let remotePerson: Record<string, unknown> = { updated_at: new Date(0).toISOString() };
    const client = {
      from: (tableName: string) => ({
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: "remote-id" }, error: null }) }) }),
        select: () => ({
          eq: (_field: string, id: string) => ({
            maybeSingle: async () => ({ data: tableName === "households" ? remoteHousehold : remotePerson, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            if (tableName === "households") remoteHousehold = { ...remoteHousehold, ...payload };
            else remotePerson = { ...remotePerson, ...payload };
            return { error: null };
          },
        }),
        delete: () => ({ eq: async () => ({ error: null }) }),
      }),
    };
    const manager = new SyncManager(client);
    await manager.syncNow();
    expect(await syncQueueStore.list()).toEqual([]);
    expect((await householdStore.get(household.localId))?.syncStatus).toBe("synced");
    expect((await personStore.get(person.localId))?.syncStatus).toBe("synced");
  });
});
