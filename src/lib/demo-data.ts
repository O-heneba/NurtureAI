// Realistic Ghanaian demo data for NurtureAI
export const currentUser = {
  name: "Ama Serwaa Boateng",
  role: "CHPS Community Nurse",
  facility: "Kwadaso CHPS Compound",
  district: "Kumasi Metropolitan",
  region: "Ashanti Region",
  avatar: "AS",
  email: "ama.boateng@nurtureai.gh",
  phone: "+233 24 555 0142",
};

export const districts = ["Kumasi Metropolitan", "Asokwa", "Oforikrom", "Suame Municipal", "Kwadaso Municipal"];

export const communities = [
  { id: "c1", name: "Kwadaso", district: "Kwadaso Municipal", households: 148, population: 762, coverage: 92, worker: "Ama Boateng", pregnant: 18, under5: 96, highRisk: 5 },
  { id: "c2", name: "Bomso", district: "Oforikrom", households: 96, population: 512, coverage: 87, worker: "Kojo Mensah", pregnant: 11, under5: 62, highRisk: 3 },
  { id: "c3", name: "Atonsu", district: "Asokwa", households: 210, population: 1084, coverage: 78, worker: "Efua Owusu", pregnant: 24, under5: 138, highRisk: 9 },
  { id: "c4", name: "Aboabo", district: "Kumasi Metropolitan", households: 174, population: 892, coverage: 71, worker: "Yaw Asante", pregnant: 19, under5: 112, highRisk: 7 },
  { id: "c5", name: "Suame", district: "Suame Municipal", households: 132, population: 640, coverage: 84, worker: "Akosua Frimpong", pregnant: 14, under5: 78, highRisk: 4 },
  { id: "c6", name: "Adum", district: "Kumasi Metropolitan", households: 88, population: 402, coverage: 95, worker: "Kwesi Appiah", pregnant: 8, under5: 46, highRisk: 2 },
];

export const households = [
  { id: "h1", head: "Kofi Owusu Ansah", houseNo: "K-142", community: "Kwadaso", members: 6, pregnant: 1, children: 2, address: "House No. K-142, Kwadaso", phone: "+233 20 444 1290", registered: "2025-03-14", lastVisit: "2025-11-10", risk: "low" },
  { id: "h2", head: "Abena Pokuaa", houseNo: "B-022", community: "Bomso", members: 4, pregnant: 0, children: 1, address: "Plot 22, Bomso Estate", phone: "+233 24 908 7712", registered: "2025-02-08", lastVisit: "2025-11-06", risk: "medium" },
  { id: "h3", head: "Yaw Darko", houseNo: "A-088", community: "Atonsu", members: 8, pregnant: 1, children: 3, address: "House A-88, Atonsu Agogo", phone: "+233 55 221 3345", registered: "2025-01-22", lastVisit: "2025-11-13", risk: "high" },
  { id: "h4", head: "Adwoa Mensimah", houseNo: "K-008", community: "Kwadaso", members: 3, pregnant: 0, children: 1, address: "House No. K-08, Kwadaso", phone: "+233 20 771 5568", registered: "2025-04-01", lastVisit: "2025-10-30", risk: "low" },
  { id: "h5", head: "Kwabena Nti", houseNo: "S-044", community: "Suame", members: 5, pregnant: 0, children: 2, address: "Suame Magazine Rd, House 44", phone: "+233 24 300 9917", registered: "2025-03-27", lastVisit: "2025-11-11", risk: "medium" },
  { id: "h6", head: "Afia Konadu", houseNo: "AB-118", community: "Aboabo", members: 7, pregnant: 1, children: 3, address: "Aboabo No. 2, House 118", phone: "+233 27 665 2211", registered: "2025-05-11", lastVisit: "2025-11-05", risk: "low" },
  { id: "h7", head: "Nana Yaw Boakye", houseNo: "AD-012", community: "Adum", members: 4, pregnant: 0, children: 1, address: "Adum Market Rd, House 12", phone: "+233 24 811 0432", registered: "2025-02-19", lastVisit: "2025-11-02", risk: "low" },
];

export const people = [
  { id: "p1", name: "Akosua Owusu", age: 28, gender: "F", relationship: "Spouse", household: "Kofi Owusu Ansah", householdId: "h1", community: "Kwadaso", phone: "+233 24 111 2233", status: "Pregnant", note: "ANC ongoing", dob: "1997-04-12", occupation: "Trader", education: "Senior High", marital: "Married" },
  { id: "p2", name: "Kwame Owusu", age: 3, gender: "M", relationship: "Child", household: "Kofi Owusu Ansah", householdId: "h1", community: "Kwadaso", phone: "-", status: "Under 5", note: "Growth on track", dob: "2022-08-20", occupation: "-", education: "-", marital: "-" },
  { id: "p3", name: "Abena Pokuaa", age: 34, gender: "F", relationship: "Head", household: "Abena Pokuaa", householdId: "h2", community: "Bomso", phone: "+233 24 908 7712", status: "Postnatal", note: "6-week check due", dob: "1991-01-30", occupation: "Seamstress", education: "JHS", marital: "Widowed" },
  { id: "p4", name: "Yaw Darko", age: 52, gender: "M", relationship: "Head", household: "Yaw Darko", householdId: "h3", community: "Atonsu", phone: "+233 55 221 3345", status: "Adult", note: "Hypertensive", dob: "1973-06-15", occupation: "Farmer", education: "Primary", marital: "Married" },
  { id: "p5", name: "Ama Nyarko", age: 24, gender: "F", relationship: "Daughter-in-law", household: "Yaw Darko", householdId: "h3", community: "Atonsu", phone: "-", status: "Pregnant", note: "High-risk pregnancy", dob: "2001-11-02", occupation: "Student", education: "SHS", marital: "Married" },
  { id: "p6", name: "Kojo Nti", age: 1, gender: "M", relationship: "Child", household: "Kwabena Nti", householdId: "h5", community: "Suame", phone: "-", status: "Under 5", note: "Immunization due", dob: "2024-09-04", occupation: "-", education: "-", marital: "-" },
  { id: "p7", name: "Afia Konadu", age: 30, gender: "F", relationship: "Head", household: "Afia Konadu", householdId: "h6", community: "Aboabo", phone: "+233 27 665 2211", status: "Adult", note: "Family planning", dob: "1995-03-18", occupation: "Hairdresser", education: "SHS", marital: "Single" },
];

export const pregnancies = [
  { id: "pr1", personId: "p1", mother: "Akosua Owusu", age: 28, community: "Kwadaso", edd: "2026-02-18", gestation: "28 weeks", anc: 4, risk: "low", notes: "Iron & folate compliant", bp: "118/76", weight: 62, gravida: "G2 P1" },
  { id: "pr2", personId: "p5", mother: "Ama Nyarko", age: 24, community: "Atonsu", edd: "2026-01-04", gestation: "32 weeks", anc: 3, risk: "high", notes: "Anemia, hypertension", bp: "142/92", weight: 64, gravida: "G1 P0" },
  { id: "pr3", personId: "", mother: "Yaa Serwaa", age: 31, community: "Bomso", edd: "2026-03-22", gestation: "24 weeks", anc: 3, risk: "medium", notes: "Previous C-section", bp: "126/82", weight: 68, gravida: "G3 P2" },
  { id: "pr4", personId: "", mother: "Adwoa Frimpong", age: 22, community: "Suame", edd: "2026-04-10", gestation: "20 weeks", anc: 2, risk: "low", notes: "First pregnancy", bp: "112/70", weight: 58, gravida: "G1 P0" },
  { id: "pr5", personId: "", mother: "Efua Danso", age: 35, community: "Aboabo", edd: "2025-12-30", gestation: "36 weeks", anc: 6, risk: "medium", notes: "Advanced maternal age", bp: "130/85", weight: 72, gravida: "G4 P3" },
];

export const ancHistory: Record<string, { visit: string; date: string; bp: string; weight: number; notes: string }[]> = {
  pr2: [
    { visit: "ANC 1", date: "2025-07-14", bp: "120/78", weight: 58, notes: "Baseline booking; iron/folate started" },
    { visit: "ANC 2", date: "2025-09-02", bp: "128/82", weight: 60, notes: "Mild anemia (Hb 9.8)" },
    { visit: "ANC 3", date: "2025-10-30", bp: "142/92", weight: 64, notes: "BP elevated; recheck 1 week" },
  ],
  pr1: [
    { visit: "ANC 1", date: "2025-06-01", bp: "110/70", weight: 58, notes: "Booking visit" },
    { visit: "ANC 2", date: "2025-08-15", bp: "114/74", weight: 60, notes: "Routine, well" },
    { visit: "ANC 3", date: "2025-09-28", bp: "118/76", weight: 61, notes: "Fetal HB normal" },
    { visit: "ANC 4", date: "2025-11-04", bp: "118/76", weight: 62, notes: "Progressing well" },
  ],
};

export const children = [
  { id: "ch1", personId: "p2", name: "Kwame Owusu", age: "3y", sex: "M", community: "Kwadaso", weight: 13.4, height: 94, birthWeight: 3.2, dob: "2022-08-20", nutrition: "Normal", immunization: "Up-to-date", breastfed: "Weaned", milestones: "Walking, talking" },
  { id: "ch2", personId: "p6", name: "Kojo Nti", age: "1y 2m", sex: "M", community: "Suame", weight: 8.2, height: 74, birthWeight: 2.9, dob: "2024-09-04", nutrition: "Normal", immunization: "Due: MMR", breastfed: "Partial", milestones: "First steps" },
  { id: "ch3", personId: "", name: "Adjoa Konadu", age: "4m", sex: "F", community: "Aboabo", weight: 6.1, height: 62, birthWeight: 3.1, dob: "2025-07-10", nutrition: "Normal", immunization: "Up-to-date", breastfed: "Exclusive", milestones: "Head control" },
  { id: "ch4", personId: "", name: "Yaw Boakye Jnr", age: "2y", sex: "M", community: "Adum", weight: 9.8, height: 82, birthWeight: 2.7, dob: "2023-11-05", nutrition: "Underweight", immunization: "Up-to-date", breastfed: "Weaned", milestones: "Running, few words" },
  { id: "ch5", personId: "", name: "Afia Darko", age: "8m", sex: "F", community: "Atonsu", weight: 6.8, height: 66, birthWeight: 2.5, dob: "2025-03-12", nutrition: "Wasting", immunization: "Due: Measles", breastfed: "Partial", milestones: "Sitting" },
  { id: "ch6", personId: "", name: "Kwabena Mensah", age: "3y 5m", sex: "M", community: "Bomso", weight: 14.2, height: 96, birthWeight: 3.4, dob: "2022-05-30", nutrition: "Normal", immunization: "Up-to-date", breastfed: "Weaned", milestones: "Full speech" },
];

export const referrals = [
  { id: "r1", patient: "Ama Nyarko", from: "Kwadaso CHPS", to: "Komfo Anokye Teaching Hospital", reason: "High-risk pregnancy — preeclampsia risk", priority: "urgent", status: "In transit", date: "2025-11-14" },
  { id: "r2", patient: "Afia Darko", from: "Kwadaso CHPS", to: "Suntreso Government Hospital", reason: "Severe wasting, needs therapeutic feeding", priority: "urgent", status: "Received", date: "2025-11-12" },
  { id: "r3", patient: "Yaw Darko", from: "Kwadaso CHPS", to: "Manhyia District Hospital", reason: "Uncontrolled hypertension", priority: "routine", status: "Completed", date: "2025-11-08" },
  { id: "r4", patient: "Kojo Nti", from: "Kwadaso CHPS", to: "Suntreso Government Hospital", reason: "Persistent fever, suspected malaria", priority: "high", status: "Pending", date: "2025-11-15" },
  { id: "r5", patient: "Efua Danso", from: "Kwadaso CHPS", to: "Komfo Anokye Teaching Hospital", reason: "36wk ANC — advanced maternal age", priority: "routine", status: "Scheduled", date: "2025-11-18" },
];

export const recentActivities = [
  { id: 1, type: "assessment", text: "Completed AI assessment for Ama Nyarko", time: "12 min ago", tone: "info" },
  { id: 2, type: "referral", text: "Referral sent to Komfo Anokye — Ama Nyarko", time: "18 min ago", tone: "warning" },
  { id: 3, type: "visit", text: "Home visit logged — Kofi Owusu Ansah household", time: "1 hr ago", tone: "success" },
  { id: 4, type: "register", text: "Registered new household — Afia Konadu", time: "3 hr ago", tone: "success" },
  { id: 5, type: "immunization", text: "Immunization reminder sent — Kojo Nti", time: "5 hr ago", tone: "info" },
];

export const upcomingVisits = [
  { id: 1, patient: "Akosua Owusu", type: "ANC 5", when: "Today, 2:00 PM", community: "Kwadaso" },
  { id: 2, patient: "Kojo Nti", type: "Immunization", when: "Tomorrow, 9:30 AM", community: "Suame" },
  { id: 3, patient: "Adwoa Frimpong", type: "ANC 3", when: "Wed, 11:00 AM", community: "Suame" },
  { id: 4, patient: "Afia Darko", type: "Nutrition follow-up", when: "Thu, 10:00 AM", community: "Atonsu" },
];

export const monthlyAssessments = [
  { month: "May", assessments: 42, referrals: 8 },
  { month: "Jun", assessments: 51, referrals: 11 },
  { month: "Jul", assessments: 63, referrals: 14 },
  { month: "Aug", assessments: 58, referrals: 9 },
  { month: "Sep", assessments: 72, referrals: 16 },
  { month: "Oct", assessments: 84, referrals: 19 },
  { month: "Nov", assessments: 91, referrals: 22 },
];

export const riskTrend = [
  { week: "W1", low: 62, medium: 24, high: 8 },
  { week: "W2", low: 58, medium: 28, high: 10 },
  { week: "W3", low: 66, medium: 22, high: 7 },
  { week: "W4", low: 71, medium: 20, high: 6 },
];

export const nutritionMessages = [
  { role: "assistant", text: "Akwaaba! I'm your NurtureAI Nutrition Assistant. Ask me about maternal nutrition, complementary feeding, or local Ghanaian meal plans." },
  { role: "user", text: "What should a 7-month-old baby eat?" },
  { role: "assistant", text: "At 7 months, continue breastfeeding on demand and introduce nutrient-dense complementary foods 3–4 times a day. Good local options:\n\n• Mashed koko with groundnut paste and dried fish powder\n• Soft mashed kontomire stew with well-cooked rice\n• Ripe mashed banana or pawpaw between meals\n• Egg yolk mixed into porridge for iron and protein\n\nAvoid added salt, sugar, and honey. Introduce one new food at a time and watch for reactions." },
];

export const suggestedQuestions = [
  "Best foods for a pregnant woman in the 2nd trimester?",
  "How do I manage a child with mild wasting at home?",
  "Meal plan for exclusive breastfeeding mothers",
  "Iron-rich local foods for anemia in pregnancy",
];

export const householdAssessments = [
  { id: "a1", householdId: "h1", patient: "Akosua Owusu", type: "ANC", date: "2025-11-04", risk: "low", summary: "Progressing well, all vitals normal." },
  { id: "a2", householdId: "h1", patient: "Kwame Owusu", type: "Child growth", date: "2025-10-20", risk: "low", summary: "Growth on curve, up-to-date on vaccines." },
  { id: "a3", householdId: "h3", patient: "Ama Nyarko", type: "ANC", date: "2025-11-14", risk: "high", summary: "Preeclampsia risk — referred." },
  { id: "a4", householdId: "h3", patient: "Yaw Darko", type: "General", date: "2025-11-06", risk: "medium", summary: "BP still elevated on medication." },
  { id: "a5", householdId: "h5", patient: "Kojo Nti", type: "Child", date: "2025-11-11", risk: "medium", summary: "Fever 38.4°C; malaria suspected." },
];

export const visitHistory = [
  { id: "v1", householdId: "h1", date: "2025-11-10", type: "Routine home visit", by: "Ama Boateng", notes: "All members well; ANC reminder given." },
  { id: "v2", householdId: "h1", date: "2025-10-02", type: "ANC follow-up", by: "Ama Boateng", notes: "Iron supplies delivered." },
  { id: "v3", householdId: "h3", date: "2025-11-13", type: "Urgent visit", by: "Efua Owusu", notes: "Ama Nyarko referred to KATH." },
  { id: "v4", householdId: "h3", date: "2025-10-18", type: "Routine home visit", by: "Efua Owusu", notes: "BP monitoring for household head." },
  { id: "v5", householdId: "h5", date: "2025-11-11", type: "Immunization visit", by: "Akosua Frimpong", notes: "MMR scheduled for Kojo." },
];

export const householdNotes = [
  { id: "n1", householdId: "h1", date: "2025-11-10", text: "Family cooperative. Water source: piped. Toilet: private." },
  { id: "n3", householdId: "h3", date: "2025-11-13", text: "Ama Nyarko lives with in-laws. Requires transport support to KATH." },
];

export const personTimeline: Record<string, { date: string; label: string; kind: "assessment" | "visit" | "referral" | "note" }[]> = {
  p5: [
    { date: "2025-11-14", label: "AI Assessment — high risk (score 82)", kind: "assessment" },
    { date: "2025-11-14", label: "Referral sent to KATH Obstetrics", kind: "referral" },
    { date: "2025-10-30", label: "ANC 3 completed at Kwadaso CHPS", kind: "visit" },
    { date: "2025-09-02", label: "ANC 2 — mild anemia noted", kind: "visit" },
    { date: "2025-07-14", label: "ANC 1 — booking visit", kind: "visit" },
  ],
  p1: [
    { date: "2025-11-04", label: "ANC 4 completed", kind: "visit" },
    { date: "2025-09-28", label: "ANC 3 — fetal HB normal", kind: "visit" },
    { date: "2025-08-15", label: "ANC 2", kind: "visit" },
    { date: "2025-06-01", label: "Pregnancy registered", kind: "note" },
  ],
};

export const medicalHistory: Record<string, string[]> = {
  p4: ["Hypertension (2022) — on Amlodipine 5mg", "No known drug allergies", "Non-smoker; occasional alcohol"],
  p5: ["Mild anemia (Hb 9.8, Sep 2025)", "BP rising in current pregnancy", "No prior surgeries"],
  p1: ["Previous SVD (2022) — full-term", "No chronic conditions", "Iron supplementation ongoing"],
  p3: ["Delivered Aug 2025 — SVD", "Postnatal recovery routine"],
  p7: ["Family planning counselling ongoing"],
  p6: ["Term birth; birth weight 2.9 kg"],
  p2: ["Term birth; growth on WHO curve"],
};
