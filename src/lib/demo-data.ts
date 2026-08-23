// Minimal demo data - production data comes from Supabase
// This provides fallbacks when the database is unavailable

export const currentUser = {
  name: "User",
  role: "CHPS Worker",
  facility: "CHPS Facility",
  district: "District",
  region: "Region",
  avatar: "U",
  email: "user@nurtureai.gh",
  phone: "+233",
};

// Empty fallbacks - all data should come from Supabase in production
export const communities: any[] = [];
export const households: any[] = [];
export const people: any[] = [];
export const pregnancies: any[] = [];
export const children: any[] = [];
export const personNotes: any[] = [];

// Assessments, referrals, follow-ups, visits
export const householdAssessments: any[] = [];
export const referrals: any[] = [];
export const visitHistory: any[] = [];
export const upcomingVisits: any[] = [];
export const householdNotes: any[] = [];
export const ancHistory: any[] = [];
export const medicalHistory: any[] = [];
export const personTimeline: any[] = [];
export const recentActivities: any[] = [];

// Nutrition & AI Assistant
export const nutritionMessages: any[] = [];
export const suggestedQuestions = [
  "What are the key red-flag signs?",
  "How should I record this assessment?",
  "What follow-up is recommended?",
];

// Reports & Analytics
export const monthlyAssessments: any[] = [];
export const riskTrend: any[] = [];

// Helper function - use server functions instead
export function addCommunity(community: any) {
  communities.push(community);
  return community.id;
}
