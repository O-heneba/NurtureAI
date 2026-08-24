import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { personStore, syncQueueStore } from "./local-store";
import { insertChild, insertPregnancy } from "@/lib/registrations";
import { saveDraft } from "@/lib/assessments";
import { createReferral, listReferralHistory, recordReferralOutcome, updateReferralStatus } from "@/lib/referrals";
import { createFollowUp, recordAttempt, completeFollowUp } from "@/lib/followups";
import { createPersonNote, listPersonNotes } from "@/lib/person-notes.service";
import { conflictStore, conflictResolution } from "./conflicts";
import { SyncManager, queueUpdate } from "./sync-manager";

describe("clinical offline workflows", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("persists pregnancy, child, assessment, referral, follow-up, and notes across reload", async () => {
    const person = await personStore.create({ full_name: "Ama Mensah", household_id: null, sex: "F", date_of_birth: "1990-01-01" });
    const pregnancy = await insertPregnancy({ person_id: person.localId, edd_date: "2027-01-01", status: "confirmed" });
    const child = await insertChild({ person_id: person.localId, mother_person_id: person.localId, growth_notes: "Healthy" });
    const assessment = await saveDraft({ person_id: person.localId, assessment_type: "maternal", inputs: { sections: {} } });
    const referral = await createReferral({ person_id: person.localId, reason: "Needs review", category: "maternal", urgency: "priority", submit: true });
    await updateReferralStatus(referral.id, "acknowledged", "Facility received referral");
    await recordReferralOutcome({ referral_id: referral.id, seen: true, outcome: "care_received", notes: "Reviewed" });
    const followUp = await createFollowUp({ person_id: person.localId, referral_id: referral.id, type: "post_referral", due_date: "2026-08-30" });
    await recordAttempt({ follow_up_id: followUp.id, method: "phone_call", contacted: true });
    await completeFollowUp({ follow_up_id: followUp.id, contact_status: "person_contacted" });
    await createPersonNote({ person_id: person.localId, type: "General", text: "Review at next visit" });

    await db.close();
    db.open();

    expect((await db.pregnancies.get(pregnancy.id))?.localId).toBe(pregnancy.id);
    expect((await db.child_profiles.get(child.id))?.person_id).toBe(person.localId);
    expect((await db.assessments.get(assessment.id))?.inputs.sections).toEqual({});
    expect((await db.referrals.get(referral.id))?.status).toBe("acknowledged");
    expect((await listReferralHistory(referral.id)).map((entry) => entry.to_status)).toEqual(["submitted", "acknowledged"]);
    expect((await db.referral_outcomes.where("referral_id").equals(referral.id).first())?.notes).toBe("Reviewed");
    expect((await db.follow_ups.get(followUp.id))?.status).toBe("completed");
    expect((await listPersonNotes(person.localId))[0].text).toBe("Review at next visit");
    expect((await syncQueueStore.list()).length).toBeGreaterThanOrEqual(7);
  });

  it("preserves both versions when an update finds a newer remote row", async () => {
    const household = await db.households.put({
      localId: "local-household",
      remoteId: "remote-household",
      syncStatus: "synced",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
      lastSyncedAt: "2026-08-02T00:00:00.000Z",
      version: 2,
      head_name: "Local name",
      house_no: "H-1",
    }).then(() => db.households.get("local-household"));
    await db.households.put({ ...household!, head_name: "Local edit", updatedAt: "2026-08-03T00:00:00.000Z", syncStatus: "pending" });
    await queueUpdate("households", { ...household!, head_name: "Local edit", updatedAt: "2026-08-03T00:00:00.000Z" });
    let updated = false;
    const manager = new SyncManager({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "remote-household", updated_at: "2026-08-04T00:00:00.000Z", head_name: "Remote edit" }, error: null }) }) }),
        update: () => ({ eq: async () => { updated = true; return { error: null }; } }),
      }),
    });
    await manager.syncNow();
    const conflict = (await conflictStore.list())[0];
    expect(conflict.localData.head_name).toBe("Local edit");
    expect(conflict.remoteData.head_name).toBe("Remote edit");
    expect(updated).toBe(false);
    expect((await db.households.get("local-household"))?.head_name).toBe("Local edit");
    await conflictResolution.keepLocal(conflict.id);
    expect((await conflictStore.get(conflict.id))?.status).toBe("resolved-local");
    expect((await conflictStore.history())[0].synchronizationStatus).toBe("pending");
    expect((await syncQueueStore.list()).filter((item) => item.syncStatus === "conflict")).toHaveLength(0);

    await db.households.put({ ...household!, localId: "remote-choice", remoteId: "remote-choice", head_name: "Old local" });
    await conflictStore.create({ entityType: "households", localId: "remote-choice", remoteId: "remote-choice", localVersion: 1, remoteVersion: "2026-08-05T00:00:00.000Z", detectedAt: "2026-08-05T00:00:00.000Z", localData: { head_name: "Old local" }, remoteData: { id: "remote-choice", head_name: "Server value", updated_at: "2026-08-05T00:00:00.000Z" }, operationType: "update" });
    await conflictResolution.keepRemote("households:remote-choice");
    expect((await db.households.get("remote-choice"))?.head_name).toBe("Server value");
    expect((await syncQueueStore.list()).some((item) => item.localId === "remote-choice")).toBe(false);

    await db.households.put({ ...household!, localId: "merge-choice", remoteId: "merge-choice", head_name: "Local value" });
    await conflictStore.create({ entityType: "households", localId: "merge-choice", remoteId: "merge-choice", localVersion: 1, remoteVersion: "2026-08-06T00:00:00.000Z", detectedAt: "2026-08-06T00:00:00.000Z", localData: { head_name: "Local value" }, remoteData: { id: "merge-choice", head_name: "Remote value", updated_at: "2026-08-06T00:00:00.000Z" }, operationType: "update" });
    await conflictResolution.merge("households:merge-choice", { head_name: "Merged value" });
    expect((await db.households.get("merge-choice"))?.head_name).toBe("Merged value");
    expect((await syncQueueStore.list()).some((item) => item.localId === "merge-choice")).toBe(true);
  });
});
