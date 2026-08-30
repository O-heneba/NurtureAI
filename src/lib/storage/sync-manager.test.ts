import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { householdStore, personStore, syncQueueStore } from "./local-store";
import { SyncManager, queueCreate, queueDelete, queueUpdate } from "./sync-manager";
import {
  createWorkflowHousehold,
  createWorkflowPerson,
  listWorkflowHouseholds,
  listWorkflowPersons,
  updateWorkflowHousehold,
  updateWorkflowPerson,
} from "@/lib/household-person.service";
import { listHouseholdsByCommunity } from "@/lib/registrations";

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

  it("removes queued local-only writes when an unsynced record is deleted", async () => {
    const household = await householdStore.create(householdData);
    await queueCreate("households", household);

    await queueDelete("households", household);

    expect(await householdStore.get(household.localId)).toBeUndefined();
    expect(await syncQueueStore.list()).toEqual([]);
  });

  it("retries an operation left syncing after an interrupted run", async () => {
    const household = await householdStore.create(householdData);
    const operation = await queueCreate("households", household);
    await syncQueueStore.update(operation.id, { syncStatus: "syncing" });
    const manager = new SyncManager({
      from: () => ({
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: "remote-household" }, error: null }) }) }),
      }),
    });

    await manager.syncNow();

    expect(await syncQueueStore.list()).toEqual([]);
    expect((await householdStore.get(household.localId))?.remoteId).toBe("remote-household");
  });

  it("synchronizes create before the latest coalesced update", async () => {
    const household = await householdStore.create(householdData);
    await queueCreate("households", household);
    const edited = { ...(await householdStore.update(household.localId, { head_name: "Final name" }))! };
    await queueUpdate("households", edited);
    await householdStore.update(household.localId, { head_name: "Last name" });
    await queueUpdate("households", { ...(await householdStore.get(household.localId))! });
    const calls: string[] = [];
    let remote: Record<string, unknown> = { updated_at: new Date(0).toISOString() };
    const manager = new SyncManager({
      from: (tableName: string) => ({
        insert: () => ({ select: () => ({ single: async () => { calls.push("create"); return { data: { id: "remote-household" }, error: null }; } }) }),
        update: (payload: Record<string, unknown>) => ({ eq: async () => { calls.push(String(payload.head_name)); remote = { ...remote, ...payload }; return { error: null }; } }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: remote, error: null }) }) }),
      }),
    });

    await manager.syncNow();

    expect(calls).toEqual(["create", "Last name"]);
    expect((await householdStore.get(household.localId))?.syncStatus).toBe("synced");
  });

  it("deduplicates concurrent sync triggers", async () => {
    const household = await householdStore.create(householdData);
    await queueCreate("households", household);
    let creates = 0;
    const manager = new SyncManager({
      from: () => ({
        insert: () => ({ select: () => ({ single: async () => { creates += 1; return { data: { id: "remote-household" }, error: null }; } }) }),
      }),
    });

    await Promise.all([manager.syncNow(), manager.syncNow(), manager.syncNow()]);

    expect(creates).toBe(1);
    expect(await syncQueueStore.list()).toEqual([]);
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

  it("keeps referral status history in the live status-history schema", async () => {
    const history = {
      localId: "history-local-id",
      remoteId: null,
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSyncedAt: null,
      syncError: null,
      version: 1,
      referral_id: "referral-1",
      from_status: "draft",
      to_status: "submitted",
      note: "Referral submitted",
      actor: "user-1",
      at: new Date().toISOString(),
    };

    const payload = (await queueCreate("referral_status_history", history as any)).payload;

    expect(payload).not.toHaveProperty("created_at");
    expect(payload).toHaveProperty("at");
    expect(payload).toMatchObject({ referral_id: "referral-1", to_status: "submitted" });
  });

  it("loads community household records from local storage when no remote data is available", async () => {
    await householdStore.create({
      community_id: "community-1",
      house_no: "H-1",
      head_name: "Ama Boateng",
      phone: null,
      address: null,
      notes: "Needs follow-up",
      created_by: null,
      barriers: [],
      draft: false,
    });

    const households = await listHouseholdsByCommunity("community-1");
    expect(households).toHaveLength(1);
    expect(households[0]).toMatchObject({ community_id: "community-1", head_name: "Ama Boateng" });
  });

  it("rejects assigning a person to a household that does not exist", async () => {
    await expect(
      createWorkflowPerson({
        full_name: "Nora Harriet",
        household_id: "missing-household-id",
        sex: "F",
        date_of_birth: "1998-02-01",
      }),
    ).rejects.toThrow(/household/i);

    const household = await createWorkflowHousehold(householdData);
    const person = await createWorkflowPerson({
      full_name: "Nora Harriet",
      household_id: household.localId,
      sex: "F",
      date_of_birth: "1998-02-01",
    });

    await expect(updateWorkflowPerson(person.localId, { household_id: "missing-household-id" })).rejects.toThrow(/household/i);
  });

  it("drops a stale invalid household reference from a queued person update instead of retrying the FK failure", async () => {
    const person = await personStore.create({
      full_name: "Nora Harriet",
      household_id: "missing-household-id",
      sex: "F",
      date_of_birth: "1998-02-01",
      created_by: null,
      notes: null,
      phone: null,
      national_id: null,
      preferred_name: null,
      marital_status: null,
      occupation: null,
      education: null,
      disability_status: null,
      emergency_contact: null,
      profile_types: [],
      priority_status: "routine",
      draft: false,
    });

    await queueUpdate("persons", { ...person, household_id: "missing-household-id" });

    const client = {
      from: () => ({
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            expect(payload.household_id).toBeNull();
            return { error: null };
          },
        }),
      }),
    };

    await new SyncManager(client as any).syncNow();
    expect((await personStore.get(person.localId))?.household_id).toBeNull();
    expect(await syncQueueStore.list()).toEqual([]);
  });
});
