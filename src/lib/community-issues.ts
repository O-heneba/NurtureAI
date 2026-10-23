export const COMMUNITY_ISSUES = [
  {
    id: "healthcare_access",
    label: "Difficulty accessing healthcare",
  },
  {
    id: "disrespectful_maternal_care",
    label: "Respectful maternal care concerns",
  },
  {
    id: "financial_hardship",
    label: "Financial hardship affecting care",
  },
  {
    id: "maternal_child_health_nutrition",
    label: "Maternal and child health or nutrition difficulties",
  },
  {
    id: "early_stimulation",
    label: "Early stimulation and responsive caregiving support",
  },
  {
    id: "fragmented_follow_up",
    label: "Fragmented care or follow-up",
  },
  {
    id: "other_barrier",
    label: "Other reported concern",
  },
] as const;

export type CommunityIssueId = (typeof COMMUNITY_ISSUES)[number]["id"];

const issueById = new Map(COMMUNITY_ISSUES.map((issue) => [issue.id, issue]));

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function normalizeCommunityIssue(value: string): CommunityIssueId | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const exact = COMMUNITY_ISSUES.find(
    (issue) => issue.id === normalized.replace(/ /g, "_") || normalizeText(issue.label) === normalized,
  );
  if (exact) return exact.id;

  if (/disrespect|mistreat|dignity|consent|communication.*care/.test(normalized)) {
    return "disrespectful_maternal_care";
  }
  if (/financial|cost|afford|money|poverty|medication/.test(normalized)) {
    return "financial_hardship";
  }
  if (/follow.?up|referral|fragment|missed appointment|coordination/.test(normalized)) {
    return "fragmented_follow_up";
  }
  if (/maternal|pregnan|anc|child|nutrition|malaria|diarrhoea|immuni[sz]/.test(normalized)) {
    return "maternal_child_health_nutrition";
  }
  if (/access|transport|distance|facility|road|water/.test(normalized)) {
    return "healthcare_access";
  }
  if (/stimulation|responsive caregiv|development|play/.test(normalized)) {
    return "early_stimulation";
  }

  return "other_barrier";
}

export function communityIssueLabel(value: string): string {
  const id = normalizeCommunityIssue(value);
  if (!id) return value;
  const issue = issueById.get(id);
  if (!issue) return value;
  if (id === "other_barrier" && normalizeText(value) !== normalizeText(issue.label)) {
    return `${issue.label}: ${value}`;
  }
  return issue.label;
}

export type HouseholdIssueRecord = {
  id: string;
  head_name: string;
  house_no: string;
  community_id?: string | null;
  barriers?: string[] | null;
};

export type PersonIssueRecord = {
  id?: string;
  household_id: string | null;
  context_issues?: string[] | null;
  priority?: string | null;
  status?: string | null;
};

export function summarizeHouseholdIssues(
  households: HouseholdIssueRecord[],
  personReports: PersonIssueRecord[] = [],
) {
  return COMMUNITY_ISSUES.map((issue) => {
    const affectedHouseholds = households.filter((household) =>
      (household.barriers ?? []).some((barrier) => normalizeCommunityIssue(barrier) === issue.id) ||
      personReports.some(
        (person) =>
          person.household_id === household.id &&
          (person.context_issues ?? []).some(
            (personIssue) => normalizeCommunityIssue(personIssue) === issue.id,
          ),
      ),
    );

    return {
      ...issue,
      householdCount: affectedHouseholds.length,
      households: affectedHouseholds,
    };
  }).filter((issue) => issue.householdCount > 0);
}

export type CommunityIssueSource = {
  id: string;
  common_health_challenges?: string[] | null;
};

export function buildCommunityIssueSignals(
  communities: CommunityIssueSource[],
  households: HouseholdIssueRecord[],
  personReports: PersonIssueRecord[] = [],
) {
  return communities.map((community) => {
    const communityHouseholds = households.filter(
      (household) => household.community_id === community.id,
    );
    const communityHouseholdIds = new Set(communityHouseholds.map((household) => household.id));
    const communityReports = personReports.filter((person) =>
      person.household_id ? communityHouseholdIds.has(person.household_id) : false,
    );
    const summaries = summarizeHouseholdIssues(communityHouseholds, communityReports);
    const reportedIssueIds = new Set(
      (community.common_health_challenges ?? [])
        .map(normalizeCommunityIssue)
        .filter((issue): issue is CommunityIssueId => issue !== null),
    );

    return {
      communityId: community.id,
      issues: COMMUNITY_ISSUES.map((issue) => {
        const summary = summaries.find((item) => item.id === issue.id);
        const householdCount = summary?.householdCount ?? 0;
        const communityReported = reportedIssueIds.has(issue.id);
        return {
          ...issue,
          householdCount,
          communityReported,
        };
      }).filter((issue) => issue.householdCount > 0 || issue.communityReported),
    };
  });
}
