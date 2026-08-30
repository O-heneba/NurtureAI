# Ghana Maternal Health Chatbot Knowledge Base & Training Guide

## 1. INTENT DEFINITIONS & CORE METADATA
This dataset provides intents, conversational triggers, and validated responses aligned with the **Ghana Health Service (GHS)** guidelines, the National Health Insurance Scheme (NHIS) Free Maternal Health Policy, and local cultural contexts.

*   **Target Audiences:** Expectant mothers, family support networks, Community Health Officers (CHOs), and midwives.
*   **Safety Classification:** High-risk medical triage mixed with routine informational support.

---

## 2. DIALOGUE DATASET (INTENTS, UTTERANCES, RESPONSES, AND LOGIC)

### Intent 1: Antenatal Care (ANC) Scheduling & Registration
*   **User Utterances (Mothers):** "I missed my period and think I am pregnant, what do I do?", "When should I go to the clinic?", "How do I register for pregnancy care?"
*   **User Utterances (Health Workers):** "What is the recommended booking timeline for a new client?", "How many ANC visits are currently mandated in Ghana?"
*   **Chatbot Direct Response:**
    > "You should book your first Antenatal Care (ANC) visit at a hospital, polyclinic, or CHPS compound **immediately after testing positive or noticing pregnancy signs (ideally before 12 weeks)**. The Ghana Health Service follows the WHO model requiring a **minimum of 8 ANC contacts** during pregnancy to track blood pressure, fetal growth, and screen for complications."
*   **Conditional Logic & Routing:**
    *   *If user is < 12 weeks pregnant:* Prompt to visit the nearest facility for registration and to collect their free Maternal and Child Health Record Book (MCH Record Book).
    *   *If user is > 28 weeks and hasn't registered:* Flag as high-risk delay; prompt for immediate referral to a midwife.

### Intent 2: Medication, Supplementation & Malaria Prevention (IPTp)
*   **User Utterances (Mothers):** "What medicines should I take?", "Why did the midwife give me three white tablets?", "Can I stop taking blood pills if I feel fine?"
*   **User Utterances (Health Workers):** "What is the protocol for Intermittent Preventive Treatment of malaria?", "When do we initiate SP dosing?"
*   **Chatbot Direct Response:**
    > "Pregnant women must take routine supplements: **daily Folic Acid and Iron (ferrous sulfate/fumarate)** to prevent severe anemia and birth defects. For malaria prevention, health workers administer **Sulfadoxine-Pyrimethamine (SP) as Intermittent Preventive Treatment (IPTp)** under Direct Observed Therapy (DOT) at the clinic. SP doses start at **13 weeks (second trimester)** and are given 1 month apart for a minimum of 3 doses."
*   **Conditional Logic & Routing:**
    *   *If user reports dark stools or mild nausea from iron:* Reassure that this is a normal side effect. Advise taking it with local citrus juice (like oranges) to increase absorption, never with tea or coffee.

### Intent 3: Financial Coverage & NHIS Registration
*   **User Utterances:** "How much does it cost to give birth?", "Is delivery free in Ghana?", "My NHIS card is expired, will they charge me?"
*   **Chatbot Direct Response:**
    > "Under Ghana's **Free Maternal Health Policy**, all pregnant women are entitled to **free registration and instant activation of their National Health Insurance Scheme (NHIS) card**. This covers all routine antenatal care visits, standard medications (including iron and SP), ultrasound scans if specified by the facility, vaginal or Cesarean delivery, and postnatal care for up to 6 weeks."
*   **Conditional Logic & Routing:**
    *   *If user states they are being charged for standard services:* Route to a supervisor or provide the official NHIS/GHS client grievance channels.

### Intent 4: Critical Danger Signs & Emergency Triage (CRITICAL)
*   **User Utterances:** "I am bleeding from my down there", "My stomach is hurting badly", "My face and hands are swollen", "The baby is not kicking today", "My water broke but no pains."
*   **Chatbot Direct Response:**
    > "⚠️ **EMERGENCY WARNING:** This requires immediate medical attention. Please go straight to the nearest hospital emergency room or health facility right away. Do not wait for an appointment."
*   **Conditional Logic & Routing:**
    *   *System Trigger:* Instantly bypass conversational flows. Display the nearest regional hospital emergency contact info or prompt the health worker to execute an immediate obstetric referral (e.g., using the "Speed Dial" or "E-Health" emergency transport tracking if available in the district).

---

## 3. TRIAGE & ESCALATION ARCHITECTURE

Your chatbot architecture must execute a strict keyword-matching and intent-filtering override layer to split queries into **Informational** vs. **Urgent Triage**.

```
                        [User Input Query]
                                |
                   (Danger Sign Keyword Check)
                   /                         \
         [Yes, Matches Danger]         [No, Regular Query]
                 /                             \
     [Trigger Emergency Hook]            [Process Intent via NLP]
                 |                             \
  [Provide Immediate Action Text]     [Provide Educational Content]
                 |                             \
   [Escalate to Human Midwife]          [Suggest Next Care Step]
```

### Urgent Red Flags To Code Into The System:
1.  **Vaginal Bleeding:** Any spotting or heavy bleeding across all trimesters.
2.  **Severe Headaches / Blurred Vision / Swelling:** Key indicators of Preeclampsia/Eclampsia.
3.  **Absence of Fetal Movement:** No kicks or significantly reduced movement over a 12-hour period in the 2nd or 3rd trimester.
4.  **Severe Abdominal Pain:** Distinct from standard mild stretching cramps.

---

## 4. DESIGN GUIDELINES FOR THE DEVELOPER

1.  **Strict Guardrails on Medical Advice:** The chatbot must never diagnose conditions or prescribe specific dosages for non-routine drugs (e.g., antibiotics or antihypertensives). Every medical query outside standard iron/folic/SP must end with: *"Please consult your midwife or physician for a clinical evaluation."*
2.  **Language and Literacy Adaptations:** 
    *   Keep chatbot messages short, punchy, and broken into 2-3 sentence fragments.
    *   If deploying on WhatsApp or SMS (highly recommended for Ghana), use clear bullet points.
    *   Integrate local terminologies where helpful (e.g., referring to cocoyam leaves as *kontomire* for iron-deficiency nutrition, referencing the *MCH Record Book* as the 'green book' or 'maternal book').
3.  **Dual Mode Switching:** System parameters should detect user type upon onboarding:
    *   *Mother Mode:* Emphasizes friendly text, basic checklists, danger signs, and next clinic appointment reminders.
    *   *Health Worker Mode:* Incorporates standard diagnostic terms, clinical timelines (e.g., "IPTp-SP at 13 weeks GA"), and referral metrics.

---
This dataset is designed for raw text parsing or markdown ingestion to seed conversational intent models (such as Rasa, Dialogflow, or LLM system prompts). For medical advice or diagnosis, consult a professional. AI responses may include mistakes.