export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  abhaId?: string;
  status: "waiting" | "consulting" | "completed";
  redFlag?: string; // e.g. "Chest Tightness"
  history: {
    chiefComplaint: string;
    hpi: string;
    pastMedical: string;
    pastSurgical: string;
    drugsAndAllergies: string;
    family: string;
    personal: string;
    ayush: {
      prakriti: string;
      vikriti: string;
      agni: string;
      koshtha: string;
      aharaVihara: string;
    };
  };
  documents: {
    id: string;
    name: string;
    date: string;
    extractedText: string;
    flagged?: boolean;
  }[];
};

export const MOCK_QUEUE: Patient[] = [
  {
    id: "p-001",
    name: "Ramesh Kumar",
    age: 45,
    gender: "Male",
    status: "waiting",
    redFlag: "Chest Tightness",
    history: {
      chiefComplaint: "Severe chest tightness and shortness of breath for 2 days.",
      hpi: "Pain radiates to left arm. Sweating present.",
      pastMedical: "Hypertension x 5 years.",
      pastSurgical: "Appendectomy (2015).",
      drugsAndAllergies: "Amlodipine 5mg. No known allergies.",
      family: "Father died of MI at 55.",
      personal: "Smoker (10/day for 20 yrs). Occasional alcohol.",
      ayush: {
        prakriti: "Vata-Pitta",
        vikriti: "Vata vriddhi, Rasa & Rakta dhatu dushti",
        agni: "Vishamagni",
        koshtha: "Krura",
        aharaVihara: "Excessive katu, amla ahara. Ratrijagarana.",
      },
    },
    documents: [
      {
        id: "d-1",
        name: "ECG_Report_Aug_2026.pdf",
        date: "2026-08-15",
        extractedText: "Sinus rhythm. T wave inversion in V4-V6. Possible anterior ischemia.",
        flagged: true,
      }
    ]
  },
  {
    id: "p-002",
    name: "Sunita Devi",
    age: 62,
    gender: "Female",
    status: "waiting",
    history: {
      chiefComplaint: "Bilateral knee joint pain for 1 year.",
      hpi: "Pain worsens on walking and climbing stairs. Morning stiffness < 30 mins.",
      pastMedical: "Type 2 DM x 10 years.",
      pastSurgical: "None.",
      drugsAndAllergies: "Metformin 500mg. Allergic to Sulfa.",
      family: "Mother had OA.",
      personal: "Vegetarian. Sedentary.",
      ayush: {
        prakriti: "Kapha-Vata",
        vikriti: "Vata vriddhi in sandhi, Asthi dhatu kshaya",
        agni: "Mandagni",
        koshtha: "Madhyama",
        aharaVihara: "Excessive snigdha, sheeta ahara.",
      },
    },
    documents: [
      {
        id: "d-2",
        name: "XRay_Knees.pdf",
        date: "2026-09-01",
        extractedText: "Reduced medial joint space bilaterally. Osteophytes present. Grade 3 OA.",
      }
    ]
  },
  {
    id: "p-003",
    name: "Anil Sharma",
    age: 28,
    gender: "Male",
    status: "waiting",
    history: {
      chiefComplaint: "Frequent acid reflux and burning sensation in stomach.",
      hpi: "Worsens after spicy meals. Occasional nausea.",
      pastMedical: "None.",
      pastSurgical: "None.",
      drugsAndAllergies: "None.",
      family: "None significant.",
      personal: "Mixed diet. High stress IT job.",
      ayush: {
        prakriti: "Pitta-Vata",
        vikriti: "Pitta vriddhi (Amla, Drava guna), Annavaha sroto dushti",
        agni: "Tikshnagni",
        koshtha: "Mridu",
        aharaVihara: "Excessive spicy food, irregular meal timings, late night work.",
      },
    },
    documents: []
  },
  {
    id: "p-004",
    name: "Pooja Verma",
    age: 35,
    gender: "Female",
    status: "completed",
    history: {
      chiefComplaint: "Chronic headache.",
      hpi: "Throbbing pain, mostly temporal, associated with photophobia.",
      pastMedical: "Migraine x 5 yrs.",
      pastSurgical: "None.",
      drugsAndAllergies: "Sumatriptan PRN.",
      family: "Sister has migraines.",
      personal: "Vegetarian. Poor sleep.",
      ayush: {
        prakriti: "Vata-Pitta",
        vikriti: "Vata-Pitta vriddhi, Raktavaha sroto dushti",
        agni: "Vishamagni",
        koshtha: "Madhyama",
        aharaVihara: "Skipping meals, less water intake.",
      },
    },
    documents: []
  },
];
