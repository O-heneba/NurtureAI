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

export const communities = [
  { id: "c1", name: "Kwadaso", district: "Kumasi", households: 148, population: 762, coverage: 92, worker: "Ama Boateng" },
  { id: "c2", name: "Bomso", district: "Kumasi", households: 96, population: 512, coverage: 87, worker: "Kojo Mensah" },
  { id: "c3", name: "Atonsu", district: "Kumasi", households: 210, population: 1084, coverage: 78, worker: "Efua Owusu" },
  { id: "c4", name: "Aboabo", district: "Kumasi", households: 174, population: 892, coverage: 71, worker: "Yaw Asante" },
  { id: "c5", name: "Suame", district: "Kumasi", households: 132, population: 640, coverage: 84, worker: "Akosua Frimpong" },
  { id: "c6", name: "Adum", district: "Kumasi", households: 88, population: 402, coverage: 95, worker: "Kwesi Appiah" },
];

export const households = [
  { id: "h1", head: "Kofi Owusu Ansah", community: "Kwadaso", members: 6, address: "House No. K-142, Kwadaso", phone: "+233 20 444 1290", registered: "2025-03-14", risk: "low" },
  { id: "h2", head: "Abena Pokuaa", community: "Bomso", members: 4, address: "Plot 22, Bomso Estate", phone: "+233 24 908 7712", registered: "2025-02-08", risk: "medium" },
  { id: "h3", head: "Yaw Darko", community: "Atonsu", members: 8, address: "House A-88, Atonsu Agogo", phone: "+233 55 221 3345", registered: "2025-01-22", risk: "high" },
  { id: "h4", head: "Adwoa Mensimah", community: "Kwadaso", members: 3, address: "House No. K-08, Kwadaso", phone: "+233 20 771 5568", registered: "2025-04-01", risk: "low" },
  { id: "h5", head: "Kwabena Nti", community: "Suame", members: 5, address: "Suame Magazine Rd, House 44", phone: "+233 24 300 9917", registered: "2025-03-27", risk: "medium" },
  { id: "h6", head: "Afia Konadu", community: "Aboabo", members: 7, address: "Aboabo No. 2, House 118", phone: "+233 27 665 2211", registered: "2025-05-11", risk: "low" },
  { id: "h7", head: "Nana Yaw Boakye", community: "Adum", members: 4, address: "Adum Market Rd, House 12", phone: "+233 24 811 0432", registered: "2025-02-19", risk: "low" },
];

export const people = [
  { id: "p1", name: "Akosua Owusu", age: 28, gender: "F", household: "Kofi Owusu Ansah", community: "Kwadaso", phone: "+233 24 111 2233", status: "Pregnant", note: "ANC ongoing" },
  { id: "p2", name: "Kwame Owusu", age: 3, gender: "M", household: "Kofi Owusu Ansah", community: "Kwadaso", phone: "-", status: "Under 5", note: "Growth on track" },
  { id: "p3", name: "Abena Pokuaa", age: 34, gender: "F", household: "Abena Pokuaa", community: "Bomso", phone: "+233 24 908 7712", status: "Postnatal", note: "6-week check due" },
  { id: "p4", name: "Yaw Darko", age: 52, gender: "M", household: "Yaw Darko", community: "Atonsu", phone: "+233 55 221 3345", status: "Adult", note: "Hypertensive" },
  { id: "p5", name: "Ama Nyarko", age: 24, gender: "F", household: "Yaw Darko", community: "Atonsu", phone: "-", status: "Pregnant", note: "High-risk pregnancy" },
  { id: "p6", name: "Kojo Nti", age: 1, gender: "M", household: "Kwabena Nti", community: "Suame", phone: "-", status: "Under 5", note: "Immunization due" },
  { id: "p7", name: "Afia Konadu", age: 30, gender: "F", household: "Afia Konadu", community: "Aboabo", phone: "+233 27 665 2211", status: "Adult", note: "Family planning" },
];

export const pregnancies = [
  { id: "pr1", mother: "Akosua Owusu", age: 28, community: "Kwadaso", edd: "2026-02-18", gestation: "28 weeks", anc: 4, risk: "low", notes: "Iron & folate compliant" },
  { id: "pr2", mother: "Ama Nyarko", age: 24, community: "Atonsu", edd: "2026-01-04", gestation: "32 weeks", anc: 3, risk: "high", notes: "Anemia, hypertension" },
  { id: "pr3", mother: "Yaa Serwaa", age: 31, community: "Bomso", edd: "2026-03-22", gestation: "24 weeks", anc: 3, risk: "medium", notes: "Previous C-section" },
  { id: "pr4", mother: "Adwoa Frimpong", age: 22, community: "Suame", edd: "2026-04-10", gestation: "20 weeks", anc: 2, risk: "low", notes: "First pregnancy" },
  { id: "pr5", mother: "Efua Danso", age: 35, community: "Aboabo", edd: "2025-12-30", gestation: "36 weeks", anc: 6, risk: "medium", notes: "Advanced maternal age" },
];

export const children = [
  { id: "ch1", name: "Kwame Owusu", age: "3y", sex: "M", community: "Kwadaso", weight: 13.4, height: 94, nutrition: "Normal", immunization: "Up-to-date" },
  { id: "ch2", name: "Kojo Nti", age: "1y 2m", sex: "M", community: "Suame", weight: 8.2, height: 74, nutrition: "Normal", immunization: "Due: MMR" },
  { id: "ch3", name: "Adjoa Konadu", age: "4m", sex: "F", community: "Aboabo", weight: 6.1, height: 62, nutrition: "Normal", immunization: "Up-to-date" },
  { id: "ch4", name: "Yaw Boakye Jnr", age: "2y", sex: "M", community: "Adum", weight: 9.8, height: 82, nutrition: "Underweight", immunization: "Up-to-date" },
  { id: "ch5", name: "Afia Darko", age: "8m", sex: "F", community: "Atonsu", weight: 6.8, height: 66, nutrition: "Wasting", immunization: "Due: Measles" },
  { id: "ch6", name: "Kwabena Mensah", age: "3y 5m", sex: "M", community: "Bomso", weight: 14.2, height: 96, nutrition: "Normal", immunization: "Up-to-date" },
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
