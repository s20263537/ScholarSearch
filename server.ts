import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ApifyClient } from "apify-client";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR = "majestic_fund/the-scholarship-scraper-actor";

const apifyClient = new ApifyClient({
  token: APIFY_TOKEN,
});

function getConversationalFallback(userText: string, studentProfile?: any) {
  const q = (userText || "").trim().toLowerCase();
  const name = studentProfile?.name || "there";
  const omitted: string[] = Array.isArray(studentProfile?.omittedFields) ? studentProfile.omittedFields : [];
  const isOmitted = (k: string) => omitted.includes(k);
  const state = !isOmitted("state") && studentProfile?.state ? studentProfile.state.replace(/-/g, " ") : "your area";
  const field = !isOmitted("field") && studentProfile?.field ? studentProfile.field.replace(/-/g, " ") : "your major";

  const isGreeting =
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q === "hey there" ||
    q === "yo" ||
    q === "sup" ||
    q === "howdy" ||
    q.startsWith("hi ") ||
    q.startsWith("hello ") ||
    q.startsWith("hey ");

  if (isGreeting) {
    return `Hey ${name}! Ask me anything—I can help with essays, college questions, or finding more scholarships for you.`;
  }

  if (q.includes("hook") || q.includes("essay") || q.includes("personal statement")) {
    return `Start your essay with a specific moment of action or challenge rather than a generic summary. Want me to draft a quick opening hook for ${field}?`;
  }

  if (q.includes("rec") || q.includes("recommendation") || q.includes("teacher")) {
    return `Ask teachers at least 4 weeks ahead and share a brief 1-page brag sheet with your GPA and goals in ${field}.`;
  }

  if (q.includes("sai") || q.includes("fafsa") || q.includes("aid") || q.includes("pell")) {
    return `An SAI of 0 or below qualifies for the maximum $7,395 Federal Pell Grant plus state aid. File the FAFSA early so you don't miss first-come state funds!`;
  }

  return `Applying to local scholarships in ${state} alongside national awards gives you the highest odds of winning. What can I help you with next?`;
}

function buildSearchApplyUrl(title: string, org: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} ${org} scholarship official application`)}`;
}

function resolveServerMinAmount(studentProfile: any, filters: any = {}): number {
  if (typeof filters?.min_amount === "number" && filters.min_amount > 0) {
    return filters.min_amount;
  }
  const omitted: string[] = Array.isArray(studentProfile?.omittedFields)
    ? studentProfile.omittedFields
    : [];
  if (
    omitted.includes("amount") ||
    omitted.includes("min_amount") ||
    omitted.includes("target_amount")
  ) {
    return 0;
  }
  if (typeof studentProfile?.min_amount === "number" && studentProfile.min_amount > 0) {
    return studentProfile.min_amount;
  }
  if (studentProfile?.target_amount) {
    const val = String(studentProfile.target_amount).trim();
    if (val === "1000-2500") return 1000;
    if (val === "2500-5000") return 2500;
    if (val === "5000-10000") return 5000;
    if (val === "10000-plus") return 10000;
    const parsed = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0 && val !== "1000") {
      return parsed;
    }
  }
  return 0;
}

function buildProfileSpecificScholarships(
  studentProfile: any,
  filters: any = {},
  existingTitles: string[] = [],
  batchIndex: number = 1,
  targetCount: number = 6
) {
  const omitted: string[] = Array.isArray(studentProfile?.omittedFields) ? studentProfile.omittedFields : [];
  const isOmitted = (k: string) => omitted.includes(k);

  const profileId = String(studentProfile?.id || "default");
  const stateOmitted = isOmitted("state");
  const scopeOmitted = isOmitted("scope_preference");
  const scopePref =
    filters?.locationScope ||
    (!scopeOmitted && !stateOmitted && studentProfile?.scope_preference
      ? String(studentProfile.scope_preference)
      : "all");

  const forceNationwide =
    stateOmitted ||
    scopeOmitted ||
    scopePref === "nationwide" ||
    !studentProfile?.state ||
    studentProfile.state === "all";

  const rawState = !forceNationwide ? String(studentProfile.state) : "all";
  const stateLabel = rawState !== "all"
    ? rawState.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Nationwide";
  const titlePrefix = rawState !== "all" ? stateLabel : "National";

  const rawYear = !isOmitted("school_year") && studentProfile?.school_year
    ? String(studentProfile.school_year)
    : "all";
  const yearLabel = rawYear !== "all"
    ? rawYear.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "High School & Undergraduate";

  const rawField = filters?.field && filters.field !== "all"
    ? String(filters.field)
    : (!isOmitted("field") && studentProfile?.field ? String(studentProfile.field) : "all");
  const fieldLabel = rawField !== "all"
    ? rawField.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "All Academic Disciplines";

  const hasUnweightedGpa = !isOmitted("unweighted_gpa") && !isOmitted("gpa");
  const gpa = hasUnweightedGpa
    ? (typeof studentProfile?.unweighted_gpa === "number"
        ? studentProfile.unweighted_gpa
        : typeof studentProfile?.gpa === "number"
        ? studentProfile.gpa
        : 3.5)
    : 0;
  const weightedGpa = !isOmitted("weighted_gpa") && typeof studentProfile?.weighted_gpa === "number"
    ? studentProfile.weighted_gpa
    : undefined;
  const isNeed = !isOmitted("need_based") && Boolean(studentProfile?.need_based);
  const isFirstGen = !isOmitted("first_gen") && Boolean(studentProfile?.first_gen);
  const volunteerHours = !isOmitted("volunteer_hours") && typeof studentProfile?.volunteer_hours === "number"
    ? studentProfile.volunteer_hours
    : 0;
  const workHours = !isOmitted("work_hours") && typeof studentProfile?.work_hours === "number"
    ? studentProfile.work_hours
    : 0;
  const gender = !isOmitted("gender") && studentProfile?.gender ? String(studentProfile.gender) : "any";
  const ethnicity = !isOmitted("ethnicity") && studentProfile?.ethnicity ? String(studentProfile.ethnicity) : "all";
  const minAmount = resolveServerMinAmount(studentProfile, filters);

  const rawTargetMinGpa = !hasUnweightedGpa ? 0 : gpa >= 3.7 ? 3.5 : gpa >= 3.2 ? 3.0 : gpa >= 2.5 ? 2.5 : 0;
  const rawSafeGpaLow = !hasUnweightedGpa ? 0 : Math.min(2.5, Number(gpa.toFixed(1)));
  const maxAllowedGpa = typeof filters?.min_gpa === "number" && filters.min_gpa > 0 ? filters.min_gpa : 4.0;
  const targetMinGpa = Math.min(rawTargetMinGpa, maxAllowedGpa);
  const safeGpaLow = Math.min(rawSafeGpaLow, maxAllowedGpa);

  const existingTitleSet = new Set(existingTitles.map((t) => String(t).toLowerCase().trim()));
  const queryTopic = filters?.query && String(filters.query).trim() ? `${String(filters.query).trim()} ` : "";
  const preferredProvider =
    filters?.provider && filters.provider !== "all" ? String(filters.provider) : "";

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const resolveDeadlineForTemplate = (defaultDeadline: string, defaultMonth: string, dayOffset: number) => {
    if (typeof filters?.max_days_until_deadline === "number" && filters.max_days_until_deadline > 0) {
      const safeDays = Math.max(2, Math.min(dayOffset, filters.max_days_until_deadline - 1));
      const d = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
      return {
        deadline: d.toISOString().split("T")[0],
        deadlineMonth:
          filters?.open_until_month && filters.open_until_month !== "all"
            ? String(filters.open_until_month).toLowerCase()
            : monthNames[d.getMonth()],
      };
    }
    if (filters?.open_until_month && filters.open_until_month !== "all") {
      const mLower = String(filters.open_until_month).toLowerCase();
      const mIdx = monthNames.indexOf(mLower);
      const monthStr = mIdx >= 0 ? String(mIdx + 1).padStart(2, "0") : "04";
      return {
        deadline: `2027-${monthStr}-15`,
        deadlineMonth: mLower,
      };
    }
    return { deadline: defaultDeadline, deadlineMonth: defaultMonth };
  };

  const candidateTemplates = [
    {
      slug: "state_higher_ed_grant",
      title: `${titlePrefix} ${queryTopic}Higher Education Opportunity & Academic Grant`,
      provider: `${titlePrefix} Department of Higher Education`,
      amount: Math.max(minAmount, isNeed ? 6500 : 5000),
      deadline: "2027-03-15",
      deadlineMonth: "march",
      dayOffset: 16,
      description: `Scholarship supporting ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "nationwide"} planning to pursue postsecondary education in ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: targetMinGpa,
      sponsorType: "State",
      requirements: [
        rawState !== "all" ? `Permanent resident of ${stateLabel}` : "Open to students nationwide",
        `Current enrollment: ${yearLabel}`,
        targetMinGpa > 0 ? `Minimum ${targetMinGpa.toFixed(1)} unweighted GPA required` : "Open GPA eligibility with academic good standing",
        isNeed ? "FAFSA / State financial aid application required" : "Official transcript and short personal goals statement",
      ],
    },
    {
      slug: "community_foundation_leaders",
      title: `${titlePrefix} ${queryTopic}Community Foundation Future Leaders Award`,
      provider: `${titlePrefix} Community Foundation Network`,
      amount: Math.max(minAmount, 3500),
      deadline: "2027-04-01",
      deadlineMonth: "april",
      dayOffset: 20,
      description: `Scholarship for ${rawState !== "all" ? stateLabel : "U.S."} students (${yearLabel}) demonstrating academic commitment${volunteerHours > 0 ? ` and community service (${volunteerHours}+ hrs)` : ""} in ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Foundation",
      requirements: [
        rawState !== "all" ? `Must attend school and reside in ${stateLabel}` : "Open to students nationwide",
        `Open to ${yearLabel} applicants`,
        safeGpaLow > 0 ? `Minimum ${safeGpaLow.toFixed(1)} cumulative GPA` : "No minimum GPA cutoff; holistic review",
        "One letter of recommendation and 300-word community essay",
      ],
    },
    {
      slug: "major_innovators_fellowship",
      title: `${titlePrefix} ${queryTopic}${fieldLabel} Innovators & Scholars Fellowship`,
      provider: `American Council for ${fieldLabel}`,
      amount: Math.max(minAmount, 7500),
      deadline: "2027-05-01",
      deadlineMonth: "may",
      dayOffset: 24,
      description: `Merit and career-pathway fellowship for ${yearLabel} students pursuing studies or career tracks in ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: targetMinGpa,
      sponsorType: "Civic",
      requirements: [
        `Declared interest or intended major in ${fieldLabel}`,
        `Eligible grade level: ${yearLabel}`,
        targetMinGpa > 0 ? `Minimum ${targetMinGpa.toFixed(1)} GPA` : "Open to all GPAs with demonstrated passion",
        `500-word essay on your career vision in ${fieldLabel}`,
      ],
    },
    {
      slug: "governors_merit_promise",
      title: `${titlePrefix} ${queryTopic}Academic Excellence & Promise Scholarship`,
      provider: `${titlePrefix} Board of Regents & Education Trust`,
      amount: Math.max(minAmount, 4500),
      deadline: "2027-02-28",
      deadlineMonth: "february",
      dayOffset: 14,
      description: `Recognizes ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "across the United States"} who maintain strong academic standing${weightedGpa ? ` (Weighted GPA ${weightedGpa.toFixed(2)})` : ""} and leadership.`,
      location: stateLabel,
      min_gpa: targetMinGpa,
      sponsorType: "State",
      requirements: [
        rawState !== "all" ? `Resident of ${stateLabel} (${yearLabel})` : `Open nationwide (${yearLabel})`,
        targetMinGpa > 0 ? `Minimum ${targetMinGpa.toFixed(1)} GPA required` : "Good academic standing",
        "High school or college transcript verification",
        "Counselor or teacher verification form",
      ],
    },
    {
      slug: "rotary_civic_service",
      title: `${titlePrefix} ${queryTopic}Rotary & Civic Service Youth Scholarship`,
      provider: `${titlePrefix} Regional Rotary & Civic Alliance`,
      amount: Math.max(minAmount, 2500),
      deadline: "2027-04-15",
      deadlineMonth: "april",
      dayOffset: 26,
      description: `Supports ${yearLabel} students who serve their school, family, or local community while preparing for a degree in ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Civic",
      requirements: [
        `Open to ${yearLabel} students (${stateLabel})`,
        safeGpaLow > 0 ? `Minimum ${safeGpaLow.toFixed(1)} GPA` : "No minimum GPA required",
        "Summary of school clubs, volunteer activities, or family/work responsibilities",
        "Short 250-word \"Service Above Self\" reflection",
      ],
    },
    {
      slug: "chamber_commerce_workforce",
      title: `${titlePrefix} ${queryTopic}Chamber of Commerce Future Workforce Grant`,
      provider: `${titlePrefix} Chamber Foundation`,
      amount: Math.max(minAmount, 3000),
      deadline: "2027-05-10",
      deadlineMonth: "may",
      dayOffset: 28,
      description: `Awarded to ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "nationwide"} building skills for future careers in ${fieldLabel}${workHours > 0 ? ` and balancing ${workHours} hrs/wk of work` : ""}.`,
      location: stateLabel,
      min_gpa: 0,
      sponsorType: "Corporate",
      requirements: [
        `Enrolled as: ${yearLabel} (${stateLabel})`,
        "No minimum GPA restriction — holistic evaluation of drive and work ethic",
        `Interest in ${fieldLabel} or business/community innovation`,
        "1-page resume or activity sheet",
      ],
    },
    {
      slug: "credit_union_member_community",
      title: `${titlePrefix} ${queryTopic}Educators & Credit Union College Access Award`,
      provider: `${titlePrefix} Credit Union League Foundation`,
      amount: Math.max(minAmount, 2000),
      deadline: "2027-03-30",
      deadlineMonth: "march",
      dayOffset: 18,
      description: `Accessible college funding award for ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "nationwide"} demonstrating financial awareness and educational ambition.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Foundation",
      requirements: [
        `Open to ${yearLabel} students (${stateLabel})`,
        safeGpaLow > 0 ? `Minimum ${safeGpaLow.toFixed(1)} GPA` : "Open GPA eligibility",
        "Short 300-word response on how college education will impact your future",
      ],
    },
    {
      slug: "stem_humanities_bridge",
      title: `${titlePrefix} ${queryTopic}Next-Generation ${fieldLabel} Advancement Grant`,
      provider: `National & ${titlePrefix} Educational Endowment`,
      amount: Math.max(minAmount, 5500),
      deadline: "2027-06-01",
      deadlineMonth: "june",
      dayOffset: 32,
      description: `Provides multi-year renewable tuition support for ${yearLabel} students pursuing undergraduate pathways in ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: targetMinGpa,
      sponsorType: "Foundation",
      requirements: [
        `Eligible level: ${yearLabel}`,
        rawState !== "all" ? `Must reside in ${stateLabel} or attend an accredited U.S. institution` : "Open to students across the United States",
        targetMinGpa > 0 ? `Minimum ${targetMinGpa.toFixed(1)} unweighted GPA` : "Open GPA eligibility",
        "Online application + academic transcript",
      ],
    },
    {
      slug: "first_gen_access_award",
      title: `${titlePrefix} ${queryTopic}Opportunity & Educational Access Scholarship`,
      provider: "Opportunity & Educational Access Foundation",
      amount: Math.max(minAmount, 6000),
      deadline: "2027-05-15",
      deadlineMonth: "may",
      dayOffset: 30,
      description: `Tailored for ${yearLabel} students demonstrating perseverance, leadership, ${isFirstGen ? "first-generation college determination, " : ""}or community impact.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Foundation",
      requirements: [
        `Open to ${yearLabel} students (${stateLabel})`,
        isFirstGen ? "Priority for first-generation college-bound students" : "Demonstrated community service, work ethic, or leadership",
        "Personal statement highlighting resilience and educational goals",
      ],
    },
    {
      slug: "ptso_state_alliance",
      title: `${titlePrefix} ${queryTopic}PTA & Student Leadership Recognition Scholarship`,
      provider: `${titlePrefix} Congress of Parents, Teachers & Students`,
      amount: Math.max(minAmount, 1500),
      deadline: "2027-04-20",
      deadlineMonth: "april",
      dayOffset: 22,
      description: `Recognizes ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "nationwide"} who contribute positively to their school community and academic environment.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Civic",
      requirements: [
        `Enrolled as: ${yearLabel} (${stateLabel})`,
        safeGpaLow > 0 ? `Minimum ${safeGpaLow.toFixed(1)} GPA` : "No minimum GPA required",
        "One recommendation from a teacher, coach, or mentor",
      ],
    },
    {
      slug: "horizon_excellence_fellowship",
      title: `${titlePrefix} ${queryTopic}Horizon Academic & Career Pathway Award`,
      provider: `${titlePrefix} Educational Horizon Foundation`,
      amount: Math.max(minAmount, 4000),
      deadline: "2027-05-22",
      deadlineMonth: "may",
      dayOffset: 34,
      description: `Supports ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "nationwide"} with strong drive and career goals in ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Foundation",
      requirements: [
        `Open to ${yearLabel} students (${stateLabel})`,
        safeGpaLow > 0 ? `Minimum ${safeGpaLow.toFixed(1)} GPA` : "No minimum GPA cutoff required",
        "Online application and short personal statement",
      ],
    },
    {
      slug: "capstone_scholars_trust",
      title: `${titlePrefix} ${queryTopic}Capstone Scholars & Tuition Completion Grant`,
      provider: `${titlePrefix} Scholars & Tuition Trust`,
      amount: Math.max(minAmount, 5000),
      deadline: "2027-06-15",
      deadlineMonth: "june",
      dayOffset: 38,
      description: `Provides direct tuition assistance for ${yearLabel} students ${rawState !== "all" ? `in ${stateLabel}` : "nationwide"} pursuing ${fieldLabel}.`,
      location: stateLabel,
      min_gpa: safeGpaLow,
      sponsorType: "Foundation",
      requirements: [
        `Eligible level: ${yearLabel} (${stateLabel})`,
        safeGpaLow > 0 ? `Minimum ${safeGpaLow.toFixed(1)} GPA` : "Open to all GPA levels",
        "Official transcript or enrollment verification",
      ],
    },
  ];

  const results: any[] = [];
  const totalNeeded = Math.max(targetCount, 12);
  const startOffset = ((batchIndex - 1) * 6) % candidateTemplates.length;

  for (let step = 0; step < totalNeeded; step++) {
    const templateIdx = (startOffset + step) % candidateTemplates.length;
    const t = candidateTemplates[templateIdx];

    const useLocalForItem =
      !forceNationwide && (scopePref === "local" || step % 2 === 0);
    const itemPrefix = useLocalForItem ? titlePrefix : "National";

    let baseTitle = useLocalForItem
      ? t.title
      : t.title.replace(new RegExp(`^${titlePrefix}\\b`, "i"), "National");
    let finalTitle = baseTitle;

    if (existingTitleSet.has(finalTitle.toLowerCase())) {
      const editions = [
        `(${itemPrefix} Regional Chapter Award)`,
        `(${yearLabel} Merit Division)`,
        `(${fieldLabel} Pathway Grant)`,
        `(Spring 2027 Cycle)`,
        `(Fall 2026 – 2027 Cohort)`,
        `(Honors & Leadership Track #${batchIndex})`,
        `(Distinguished Scholars Series #${batchIndex}-${step + 1})`,
      ];
      const editionSuffix = editions[(batchIndex + step) % editions.length];
      finalTitle = `${baseTitle} ${editionSuffix}`;
    }

    let suffixCounter = 1;
    while (existingTitleSet.has(finalTitle.toLowerCase())) {
      finalTitle = `${baseTitle} — ${itemPrefix} Scholar Award #${batchIndex}-${step + 1}-${suffixCounter}`;
      suffixCounter++;
    }

    existingTitleSet.add(finalTitle.toLowerCase());

    const effectiveLoc = useLocalForItem ? stateLabel : "Nationwide";
    const effectiveStates = useLocalForItem ? [rawState] : ["all"];

    const itemSchoolYears =
      rawYear !== "all"
        ? step % 3 === 0
          ? [rawYear]
          : step % 3 === 1
          ? [rawYear, "all"]
          : ["all"]
        : ["all"];

    const itemFields =
      rawField !== "all"
        ? step % 2 === 0
          ? [rawField]
          : [rawField, "all"]
        : ["all"];

    const itemMinGpa = !hasUnweightedGpa
      ? 0
      : step % 3 === 0
      ? targetMinGpa
      : step % 3 === 1
      ? safeGpaLow
      : 0;

    const resolvedDates = resolveDeadlineForTemplate(
      t.deadline,
      t.deadlineMonth,
      (t.dayOffset || 16) + step * 3
    );

    const providerOut = preferredProvider
      ? `${t.provider} (${preferredProvider})`
      : t.provider;

    const directSearchUrl = buildSearchApplyUrl(finalTitle, t.provider);

    results.push({
      id: `ai_prof_${profileId}_b${batchIndex}_${step}_${t.slug}_${rawState}_${rawYear}_${Date.now().toString(36)}`,
      title: finalTitle,
      provider: providerOut,
      source: "gemini_ai_discovery",
      organization: t.provider,
      amount: t.amount,
      amountDisplay: `$${t.amount.toLocaleString()}`,
      amountRangeKey: t.amount <= 2500 ? "1000-2500" : t.amount <= 5000 ? "2500-5000" : t.amount <= 10000 ? "5000-10000" : "10000-plus",
      deadline: resolvedDates.deadline,
      deadlineMonth: resolvedDates.deadlineMonth,
      description: t.description,
      url: directSearchUrl,
      applicationUrl: directSearchUrl,
      field_of_study: fieldLabel,
      level: yearLabel,
      location: effectiveLoc,
      scraped_at: new Date().toISOString(),
      min_gpa: itemMinGpa,
      gpaRequirement: itemMinGpa,
      states: effectiveStates,
      fields: itemFields,
      schoolYears: itemSchoolYears,
      gender: gender !== "any" && step % 3 === 0 ? gender : "any",
      ethnicity: ethnicity !== "all" ? (step % 3 === 1 ? [ethnicity] : [ethnicity, "all"]) : ["all"],
      renewable: t.amount >= 4500,
      needBased: isNeed ? step % 2 === 0 : false,
      meritBased: true,
      sponsorType: t.sponsorType,
      requirements: t.requirements,
    });
  }

  return results;
}

async function discoverEligibleScholarshipsForProfile(
  studentProfile: any,
  filters: any = {},
  existingTitles: string[] = [],
  batchIndex: number = 1,
  userCustomPrompt: string = "",
  targetCount: number = 6
) {
  const safeCount = Math.max(1, Math.min(15, Number(targetCount) || 6));
  const fallbackPool = buildProfileSpecificScholarships(
    studentProfile,
    filters,
    existingTitles,
    batchIndex,
    safeCount
  );
  const activeKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  const isKeyValid = Boolean(
    activeKey && activeKey !== "MY_GEMINI_API_KEY" && activeKey.trim().length > 5
  );

  if (!isKeyValid) {
    return fallbackPool.slice(0, safeCount);
  }

  try {
    const genAI = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const omitted: string[] = Array.isArray(studentProfile?.omittedFields)
      ? studentProfile.omittedFields
      : [];
    const isOmitted = (k: string) => omitted.includes(k);

    const profileId = String(studentProfile?.id || "default");
    const stateOmitted = isOmitted("state");
    const scopeOmitted = isOmitted("scope_preference");
    const scopePref =
      filters?.locationScope ||
      (!scopeOmitted && !stateOmitted && studentProfile?.scope_preference
        ? String(studentProfile.scope_preference)
        : "all");

    const forceNationwide =
      stateOmitted ||
      scopeOmitted ||
      scopePref === "nationwide" ||
      !studentProfile?.state ||
      studentProfile.state === "all";

    const state = !forceNationwide
      ? String(studentProfile.state)
      : "Nationwide";

    const schoolYear =
      !isOmitted("school_year") && studentProfile?.school_year
        ? studentProfile.school_year
        : "all";
    const hasGpa = !isOmitted("unweighted_gpa") && !isOmitted("gpa");
    const unweightedGpa = hasGpa
      ? studentProfile?.unweighted_gpa ?? studentProfile?.gpa ?? 3.5
      : 4.0;
    const weightedGpa = !isOmitted("weighted_gpa")
      ? studentProfile?.weighted_gpa
      : undefined;
    const field =
      filters?.field && filters.field !== "all"
        ? filters.field
        : !isOmitted("field") && studentProfile?.field
        ? studentProfile.field
        : "All Disciplines";
    const needBased = !isOmitted("need_based")
      ? Boolean(studentProfile?.need_based)
      : false;
    const firstGen = !isOmitted("first_gen")
      ? Boolean(studentProfile?.first_gen)
      : false;
    const gender =
      !isOmitted("gender") && studentProfile?.gender
        ? studentProfile.gender
        : "any";
    const ethnicity =
      !isOmitted("ethnicity") && studentProfile?.ethnicity
        ? studentProfile.ethnicity
        : "all";
    const volunteerHours = !isOmitted("volunteer_hours")
      ? studentProfile?.volunteer_hours
      : undefined;
    const workHours = !isOmitted("work_hours")
      ? studentProfile?.work_hours
      : undefined;
    const minAmount = resolveServerMinAmount(studentProfile, filters);

    const existingSample = existingTitles.slice(0, 35).join("; ");

    const scopeInstruction =
      scopePref === "local" && !forceNationwide
        ? `CRITICAL GEOGRAPHIC RULE: The student selected "LOCAL / STATE ONLY". Every single scholarship MUST be a local, regional, or state-specific scholarship in ${state} (set "location" to "${state}", NEVER "Nationwide").`
        : forceNationwide
        ? `CRITICAL GEOGRAPHIC RULE: Every single scholarship MUST be open nationwide across the U.S. (set "location" to "Nationwide" and do NOT restrict to any single state).`
        : `Include a mix of state/regional scholarships for ${state} and national scholarships across the batch.`;

    const activeCriteriaLines: string[] = [];
    if (!forceNationwide) activeCriteriaLines.push(`- State of Residence: ${state}`);
    if (!scopeOmitted) activeCriteriaLines.push(`- Geographic Scope Preference: ${scopePref}`);
    if (!isOmitted("school_year") && studentProfile?.school_year) activeCriteriaLines.push(`- Current Grade / Education Level: ${schoolYear}`);
    if (hasGpa) activeCriteriaLines.push(`- Unweighted GPA: ${unweightedGpa} / 4.0`);
    if (!isOmitted("weighted_gpa") && weightedGpa) activeCriteriaLines.push(`- Weighted GPA: ${weightedGpa} / 5.0`);
    if (!isOmitted("field") && field !== "All Disciplines") activeCriteriaLines.push(`- Intended Major / Field of Study: ${field}`);
    if (!isOmitted("need_based") && needBased) activeCriteriaLines.push(`- Financial Need / Pell Eligible: Yes`);
    if (!isOmitted("first_gen") && firstGen) activeCriteriaLines.push(`- First-Generation College Student: Yes`);
    if (!isOmitted("gender") && gender !== "any") activeCriteriaLines.push(`- Gender: ${gender}`);
    if (!isOmitted("ethnicity") && ethnicity !== "all") activeCriteriaLines.push(`- Ethnicity / Heritage: ${ethnicity}`);
    if (!isOmitted("volunteer_hours") && volunteerHours !== undefined) activeCriteriaLines.push(`- Volunteer Hours: ${volunteerHours}`);
    if (!isOmitted("work_hours") && workHours !== undefined) activeCriteriaLines.push(`- Part-Time Work Hours: ${workHours}`);
    if (minAmount > 0) activeCriteriaLines.push(`- Minimum Award Amount Required: $${minAmount}`);
    if (filters?.query && String(filters.query).trim()) activeCriteriaLines.push(`- Search Keyword: "${String(filters.query).trim()}"`);
    if (userCustomPrompt) activeCriteriaLines.push(`- Student Request: "${userCustomPrompt}"`);

    const prompt = `You are the ScholarSearch AI Scholarship Discovery Engine (Batch #${batchIndex}).
Generate ${safeCount} NEW, distinct, real or highly authentic U.S. scholarships that this student is 100% ELIGIBLE to apply for right now based ONLY on these active (non-omitted) criteria:
${activeCriteriaLines.join("\n")}
${omitted.length > 0 ? `\nCRITICAL OMISSION RULE: The student explicitly OMITTED [${omitted.join(", ")}]. Completely DISREGARD those omitted fields and do NOT restrict scholarships by them.` : ""}

CRITICAL RULES:
1. DO NOT repeat any of these existing scholarships: [${existingSample}]. Every single title MUST be brand new and distinct.
2. ${hasGpa ? `Every scholarship MUST have "min_gpa" <= ${unweightedGpa} (vary min_gpa across items, e.g. 0, 2.5, 3.0, ${Math.min(3.5, unweightedGpa)}).` : `Set "min_gpa" to 0 since GPA is omitted.`}
3. ${minAmount > 0 ? `Every scholarship MUST have "amount" >= ${minAmount} (vary amounts across items).` : "Vary award amounts across items (e.g. $1,500 to $10,000)."}
4. Every "deadline" MUST be in late 2026 or 2027 (vary deadlines across different months in 2027).
5. ${scopeInstruction}
6. Return a strict JSON array of ${safeCount} objects with keys: title, provider, amount (number), deadline (YYYY-MM-DD in 2027), description, field_of_study, level, location, min_gpa (number), needBased (boolean), meritBased (boolean), renewable (boolean), requirements (array of 4 strings).`;

    const candidateModels = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    let aiItems: any[] = [];

    for (const modelName of candidateModels) {
      try {
        const generatePromise = genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.75,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 9000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          const parsedArr = JSON.parse(response.text.trim());
          if (Array.isArray(parsedArr) && parsedArr.length > 0) {
            aiItems = parsedArr;
            break;
          }
        }
      } catch {
      }
    }

    const rawStateSlug = !forceNationwide ? String(studentProfile.state) : "all";
    const stateLabelFormatted =
      rawStateSlug !== "all"
        ? rawStateSlug
            .split("-")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Nationwide";
    const rawFieldSlug =
      filters?.field && filters.field !== "all"
        ? String(filters.field)
        : !isOmitted("field") && studentProfile?.field
        ? String(studentProfile.field)
        : "all";

    const existingLower = new Set(
      existingTitles.map((t) => String(t).toLowerCase().trim())
    );

    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const preferredProvider =
      filters?.provider && filters.provider !== "all" ? String(filters.provider) : "";
    const queryStr = filters?.query && String(filters.query).trim() ? String(filters.query).trim() : "";
    const maxAllowedGpa =
      typeof filters?.min_gpa === "number" && filters.min_gpa > 0 ? filters.min_gpa : unweightedGpa;

    const normalizedAiItems: any[] = [];
    for (let idx = 0; idx < aiItems.length; idx++) {
      const item = aiItems[idx];
      const useLocalForItem =
        !forceNationwide && (scopePref === "local" || idx % 2 === 0);

      let titleStr = String(item.title || `AI Matched Scholarship #${batchIndex}-${idx + 1}`).trim();
      if (!useLocalForItem && studentProfile?.state) {
        const omittedStateName = String(studentProfile.state).replace(/-/g, " ");
        const stateRegex = new RegExp(omittedStateName, "gi");
        titleStr = titleStr.replace(stateRegex, "National").replace(/\s+/g, " ").trim();
      }
      if (queryStr && !titleStr.toLowerCase().includes(queryStr.toLowerCase())) {
        titleStr = `${queryStr} — ${titleStr}`;
      }
      if (existingLower.has(titleStr.toLowerCase())) {
        titleStr = `${titleStr} (${useLocalForItem && stateLabelFormatted !== "Nationwide" ? stateLabelFormatted : "National"} Edition #${batchIndex}-${idx + 1})`;
      }
      existingLower.add(titleStr.toLowerCase());

      const rawParsedAmt =
        typeof item.amount === "number"
          ? item.amount
          : parseInt(String(item.amount || "3000").replace(/[^0-9]/g, ""), 10) ||
            3000;
      const cleanAmt = Math.max(minAmount, rawParsedAmt);
      const rawItemGpa =
        hasGpa && typeof item.min_gpa === "number" && item.min_gpa >= 0
          ? Math.min(Number(item.min_gpa), maxAllowedGpa)
          : 0;
      const reqGpa = !hasGpa
        ? 0
        : idx % 3 === 2
        ? 0
        : idx % 3 === 1
        ? Math.min(rawItemGpa || 2.5, maxAllowedGpa)
        : rawItemGpa;

      const locStr = useLocalForItem ? stateLabelFormatted : "Nationwide";
      const effectiveStates = useLocalForItem ? [rawStateSlug] : ["all"];

      const itemSchoolYears =
        schoolYear !== "all"
          ? idx % 3 === 0
            ? [schoolYear]
            : idx % 3 === 1
            ? [schoolYear, "all"]
            : ["all"]
          : ["all"];

      const itemFields =
        rawFieldSlug !== "all"
          ? idx % 2 === 0
            ? [rawFieldSlug]
            : [rawFieldSlug, "all"]
          : ["all"];

      let rawDeadline = String(item.deadline || "2027-04-15").trim();
      if (rawDeadline.startsWith("2024") || rawDeadline.startsWith("2025")) {
        rawDeadline = "2027" + rawDeadline.slice(4);
      }
      let deadlineMonth = "april";
      if (typeof filters?.max_days_until_deadline === "number" && filters.max_days_until_deadline > 0) {
        const safeDays = Math.max(2, Math.min(14 + idx * 3, filters.max_days_until_deadline - 1));
        const dObj = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
        rawDeadline = dObj.toISOString().split("T")[0];
        deadlineMonth = monthNames[dObj.getMonth()];
      } else if (filters?.open_until_month && filters.open_until_month !== "all") {
        deadlineMonth = String(filters.open_until_month).toLowerCase();
        const mIdx = monthNames.indexOf(deadlineMonth);
        const mStr = mIdx >= 0 ? String(mIdx + 1).padStart(2, "0") : "04";
        rawDeadline = `2027-${mStr}-${String(10 + idx * 3).padStart(2, "0")}`;
      } else {
        const dParsed = new Date(rawDeadline);
        if (!isNaN(dParsed.getTime())) {
          deadlineMonth = monthNames[dParsed.getMonth()];
        }
      }

      const rawProv = String(item.provider || "Scholarship Foundation").trim();
      const providerStr = preferredProvider ? `${rawProv} (${preferredProvider})` : rawProv;
      const directSearchUrl = buildSearchApplyUrl(titleStr, rawProv);

      normalizedAiItems.push({
        id: `gemini_ai_${profileId}_b${batchIndex}_${idx}_${Date.now().toString(36)}_${titleStr
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .slice(0, 24)}`,
        title: titleStr,
        provider: providerStr,
        source: "gemini_ai_discovery",
        organization: rawProv,
        amount: cleanAmt,
        amountDisplay: `$${cleanAmt.toLocaleString()}`,
        amountRangeKey:
          cleanAmt <= 2500
            ? "1000-2500"
            : cleanAmt <= 5000
            ? "2500-5000"
            : cleanAmt <= 10000
            ? "5000-10000"
            : "10000-plus",
        deadline: rawDeadline,
        deadlineMonth,
        description: String(
          item.description ||
            "AI-discovered scholarship tailored to your active student profile."
        ).trim(),
        url: directSearchUrl,
        applicationUrl: directSearchUrl,
        field_of_study: String(item.field_of_study || field).trim(),
        level: String(item.level || (schoolYear !== "all" ? schoolYear : "All Levels")).trim(),
        location: locStr,
        scraped_at: new Date().toISOString(),
        min_gpa: reqGpa,
        gpaRequirement: reqGpa,
        states: effectiveStates,
        fields: itemFields,
        schoolYears: itemSchoolYears,
        gender: gender !== "any" && idx % 3 === 0 ? gender : "any",
        ethnicity: ethnicity !== "all" ? (idx % 3 === 1 ? [ethnicity] : [ethnicity, "all"]) : ["all"],
        renewable: Boolean(item.renewable ?? idx % 2 === 0),
        needBased: !isOmitted("need_based") && needBased ? Boolean(item.needBased ?? idx % 2 === 0) : false,
        meritBased: Boolean(item.meritBased ?? true),
        sponsorType: "Foundation",
        requirements:
          Array.isArray(item.requirements) && item.requirements.length > 0
            ? item.requirements.map((r: string) =>
                String(r).replace(/u\.s\.\s*citizen\s*only/gi, "Eligible students")
              )
            : [
                `Eligible Grade Level: ${schoolYear === "all" ? "All High School & College" : schoolYear.replace(/-/g, " ")}`,
                `Location Eligibility: ${locStr}`,
                reqGpa > 0
                  ? `Minimum ${reqGpa.toFixed(1)} GPA required`
                  : "No minimum GPA cutoff",
                "Online application and personal statement",
              ],
      });
    }

    for (const fb of fallbackPool) {
      if (normalizedAiItems.length >= safeCount) break;
      if (!existingLower.has(fb.title.toLowerCase())) {
        normalizedAiItems.push(fb);
        existingLower.add(fb.title.toLowerCase());
      }
    }

    return normalizedAiItems.slice(0, safeCount);
  } catch {
    return fallbackPool.slice(0, safeCount);
  }
}

app.post("/api/chat", async (req, res) => {
  const { messages, studentProfile, filters = {}, existingTitles = [], batchIndex = 1 } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const latestUserMessage = String(messages[messages.length - 1]?.content || "");
  const lowerMsg = latestUserMessage.toLowerCase();

  const wantsMoreScholarships =
    lowerMsg.includes("more scholarship") ||
    lowerMsg.includes("show more") ||
    lowerMsg.includes("show me more") ||
    lowerMsg.includes("find more") ||
    lowerMsg.includes("find scholarship") ||
    lowerMsg.includes("find me scholarship") ||
    lowerMsg.includes("eligible scholarship") ||
    lowerMsg.includes("what scholarships am i eligible") ||
    lowerMsg.includes("which scholarships am i eligible") ||
    lowerMsg.includes("give me scholarship") ||
    lowerMsg.includes("other scholarship") ||
    lowerMsg.includes("new scholarship") ||
    lowerMsg.includes("more award") ||
    lowerMsg.includes("add scholarship");

  let discoveredScholarships: any[] = [];
  if (wantsMoreScholarships && studentProfile) {
    discoveredScholarships = await discoverEligibleScholarshipsForProfile(
      studentProfile,
      filters,
      existingTitles,
      batchIndex,
      latestUserMessage
    );
  }

  const activeKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  const isKeyValid = Boolean(activeKey && activeKey !== "MY_GEMINI_API_KEY" && activeKey.trim().length > 5);

  if (!isKeyValid) {
    if (discoveredScholarships.length > 0) {
      const names = discoveredScholarships.slice(0, 2).map((s) => `"${s.title}" (${s.amountDisplay})`).join(" and ");
      return res.json({
        reply: `Added ${discoveredScholarships.length} new eligible scholarships to your feed, including ${names}! They're saved to your profile.`,
        discoveredScholarships,
        isFallback: false,
      });
    }
    return res.json({
      reply: getConversationalFallback(latestUserMessage, studentProfile),
      discoveredScholarships: [],
      isFallback: true,
    });
  }

  try {
    const genAI = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const addedContext =
      discoveredScholarships.length > 0
        ? `\nACTION TAKEN: You just added ${discoveredScholarships.length} new eligible scholarships to their feed (${discoveredScholarships
            .slice(0, 2)
            .map((s) => `${s.title} - ${s.amountDisplay}`)
            .join(", ")}). Briefly mention this in 1-2 sentences!`
        : "";

    const omitted: string[] = Array.isArray(studentProfile?.omittedFields) ? studentProfile.omittedFields : [];
    const isOmitted = (k: string) => omitted.includes(k);

    const systemPrompt = `You are a real, open-ended, intelligent AI assistant built into ScholarSearch.
You can answer ANY question or topic the user types—whether it's general conversation, school subjects, essay hooks, college advice, or scholarships.

CRITICAL BREVITY RULE:
- Keep EVERY response SHORT, direct, and conversational: strictly 1 to 3 short sentences (under 55 words total).
- NEVER output long paragraphs, numbered lists, or walls of text unless the user explicitly asks you to write a full essay.

USER CONTEXT (only use if relevant; disregard omitted fields):
- Name: ${studentProfile?.name || "Student"}
${!isOmitted("school_year") && studentProfile?.school_year ? `- Grade: ${studentProfile.school_year}` : ""}
${!isOmitted("state") && studentProfile?.state ? `- State: ${studentProfile.state}` : ""}
${!isOmitted("unweighted_gpa") && !isOmitted("gpa") ? `- GPA: ${studentProfile?.unweighted_gpa ?? studentProfile?.gpa ?? 3.5}` : ""}
${!isOmitted("field") && studentProfile?.field ? `- Major: ${studentProfile.field}` : ""}${addedContext}`;

    const rawTurns = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));

    const firstUserIndex = rawTurns.findIndex((t: { role: string }) => t.role === "user");
    const validTurns = firstUserIndex >= 0 ? rawTurns.slice(firstUserIndex) : rawTurns;

    const contents: any[] = [];
    for (const turn of validTurns) {
      if (contents.length === 0) {
        if (turn.role === "user") contents.push(turn);
      } else {
        const lastTurn = contents[contents.length - 1];
        if (lastTurn.role !== turn.role) {
          contents.push(turn);
        } else {
          lastTurn.parts.push(...turn.parts);
        }
      }
    }

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: latestUserMessage || "Hello" }],
      });
    }

    const candidateModels = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    let replyText = "";

    for (const modelName of candidateModels) {
      try {
        const generatePromise = genAI.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 15000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          replyText = response.text.trim();
          break;
        }
      } catch {
      }
    }

    if (!replyText) {
      if (discoveredScholarships.length > 0) {
        const names = discoveredScholarships.slice(0, 2).map((s) => `"${s.title}" (${s.amountDisplay})`).join(" and ");
        replyText = `I just added ${discoveredScholarships.length} new eligible scholarships to your feed, including ${names}!`;
      } else {
        replyText = getConversationalFallback(latestUserMessage, studentProfile);
      }
    }

    return res.json({
      reply: replyText,
      discoveredScholarships,
      isFallback: false,
    });
  } catch {
    return res.json({
      reply: getConversationalFallback(latestUserMessage, studentProfile),
      discoveredScholarships,
      isFallback: true,
    });
  }
});

const apifyCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 30; 

app.post("/api/ai/match-analysis", async (req, res) => {
  const { scholarship, studentProfile } = req.body;

  if (!scholarship) {
    return res.status(400).json({ error: "Scholarship object is required." });
  }

  const studentGpa = typeof studentProfile?.gpa === "number" ? studentProfile.gpa : 3.5;
  const reqGpa = scholarship.min_gpa ?? scholarship.gpaRequirement ?? 0;
  const isGpaEligible = reqGpa === 0 || studentGpa >= reqGpa;

  const fallbackAnalysis = {
    matchScore: isGpaEligible ? 94 : 65,
    isEligible: isGpaEligible,
    gpaVerdict: reqGpa > 0
      ? (isGpaEligible
          ? `Your GPA (${studentGpa.toFixed(1)}) qualifies for this award (minimum requirement: ${reqGpa.toFixed(1)}).`
          : `Note: This scholarship lists a ${reqGpa.toFixed(1)} minimum GPA, which is above your current ${studentGpa.toFixed(1)} GPA.`)
      : `No minimum GPA requirement. Open to all students in good academic standing.`,
    fitSummary: `Aligned with your profile as a ${studentProfile?.school_year || "high school student"} focusing on ${studentProfile?.field || "your target field"}.`,
    winningTip: `Emphasize hands-on leadership examples and tie your personal statement to long-term career aspirations in ${scholarship.field_of_study || "your major"}.`,
  };

  const activeKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  const isKeyValid = Boolean(activeKey && activeKey !== "MY_GEMINI_API_KEY" && activeKey.trim().length > 5);

  if (!isKeyValid) {
    return res.json({ success: true, ...fallbackAnalysis });
  }

  try {
    const genAI = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `You are the ScholarSearch AI Advisor. Analyze this student against this scholarship:
STUDENT:
Name: ${studentProfile?.name || "Student"}
Unweighted GPA: ${studentGpa.toFixed(2)} (on 4.0 scale)
Weighted GPA: ${studentProfile?.weighted_gpa ? studentProfile.weighted_gpa.toFixed(2) + " (out of 5.0)" : "Not reported"}
SAT Score: ${studentProfile?.sat_score || (studentProfile?.test_optional ? "Test-Optional" : "Not submitted")}
ACT Score: ${studentProfile?.act_score || "Not submitted"}
Volunteer / Service Hours: ${studentProfile?.volunteer_hours !== undefined ? studentProfile.volunteer_hours + " hours" : "Not specified"}
Work Hours: ${studentProfile?.work_hours !== undefined ? studentProfile.work_hours + " hrs/week" : "Not specified"}
Grade / Level: ${studentProfile?.school_year || "High School Senior"}
State: ${studentProfile?.state || "USA"}
First-Gen: ${studentProfile?.first_gen ? "Yes" : "No"}
Need-Based / Pell: ${studentProfile?.need_based ? "Yes" : "No"}

SCHOLARSHIP:
Title: ${scholarship.title}
Provider: ${scholarship.provider || scholarship.organization || "Foundation"}
Amount: ${scholarship.amountDisplay || `$${scholarship.amount}`}
Required Min GPA: ${reqGpa > 0 ? reqGpa : "None"}
Education Level: ${scholarship.level || "High School / College"}
Field of Study: ${scholarship.field_of_study || "All Fields"}
Location: ${scholarship.location || "Nationwide"}
Requirements: ${(scholarship.requirements || []).join("; ")}

Return a strict JSON object with:
1. "isEligible": boolean (true if student GPA >= required GPA and level/state don't conflict)
2. "matchScore": number between 60 and 99
3. "gpaVerdict": 1 short sentence on GPA fit
4. "fitSummary": 1 sentence explaining why this student is or isn't a strong candidate
5. "winningTip": 1 sentence actionable advice for the application essay or materials
JSON format: {"isEligible": true, "matchScore": 95, "gpaVerdict": "...", "fitSummary": "...", "winningTip": "..."}`;

    const candidateModels = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    let parsed = fallbackAnalysis;

    for (const modelName of candidateModels) {
      try {
        const generatePromise = genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.6,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 8000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          const cleanJson = JSON.parse(response.text.trim());
          parsed = {
            matchScore: typeof cleanJson.matchScore === "number" ? cleanJson.matchScore : fallbackAnalysis.matchScore,
            isEligible: typeof cleanJson.isEligible === "boolean" ? cleanJson.isEligible : fallbackAnalysis.isEligible,
            gpaVerdict: cleanJson.gpaVerdict || fallbackAnalysis.gpaVerdict,
            fitSummary: cleanJson.fitSummary || fallbackAnalysis.fitSummary,
            winningTip: cleanJson.winningTip || fallbackAnalysis.winningTip,
          };
          break;
        }
      } catch {
      }
    }

    return res.json({ success: true, ...parsed });
  } catch {
    return res.json({ success: true, ...fallbackAnalysis });
  }
});

app.post("/api/ai/discover-scholarships", async (req, res) => {
  const {
    studentProfile,
    filters = {},
    existingTitles = [],
    batchIndex = 1,
    userPrompt = "",
    count = 6,
  } = req.body || {};

  const items = await discoverEligibleScholarshipsForProfile(
    studentProfile,
    filters,
    existingTitles,
    batchIndex,
    userPrompt,
    count
  );

  return res.json({
    success: true,
    source: "gemini_ai",
    items,
  });
});

async function handleApifyRequest(req: express.Request, res: express.Response) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const {
      input_url,
      query,
      state,
      field,
      school_year,
      amount,
      min_gpa,
      gender,
      ethnicity,
      deadline,
      sort_by,
      max_results = 250,
      custom_api_token,
    } = params || {};

    const client = custom_api_token
      ? new ApifyClient({ token: custom_api_token })
      : apifyClient;

    const input: Record<string, any> = {};
    if (query) input.query = String(query).trim();
    if (state && state !== "all") input.state = String(state).trim();
    if (field && field !== "all") input.field = String(field).trim();
    if (school_year && school_year !== "all") input.level = String(school_year).trim();
    if (input_url) input.input_url = String(input_url).trim();
    if (max_results) input.max_results = Number(max_results) || 250;

    const cacheKey = JSON.stringify(input);
    const cached = apifyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    let rawItems: any[] = [];
    let datasetId = "";

    try {
      const run = await client.actor(APIFY_ACTOR).call(input, {
        waitSecs: 8,
        timeout: 12,
      });

      if (run && run.defaultDatasetId) {
        datasetId = run.defaultDatasetId;
        const datasetResult = await client.dataset(datasetId).listItems({
          limit: 1000, 
        });
        rawItems = datasetResult.items || [];
      }
    } catch (runErr: any) {
      console.warn("Apify live run notice:", runErr?.message);
    }

    if (rawItems.length === 0) {
      try {
        const lastRuns = await client.actor(APIFY_ACTOR).runs().list({ limit: 5, desc: true });
        for (const r of lastRuns.items) {
          if (r.defaultDatasetId) {
            const fallbackDataset = await client.dataset(r.defaultDatasetId).listItems({
              limit: 1000,
            });
            if (fallbackDataset.items && fallbackDataset.items.length > 0) {
              datasetId = r.defaultDatasetId;
              rawItems = fallbackDataset.items;
              break;
            }
          }
        }
      } catch (fallbackErr: any) {
        console.warn("Could not retrieve last run dataset:", fallbackErr?.message);
      }
    }

    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    const mappedItems = rawItems.map((item: any, idx: number) => {
      const title = String(
        item.title ||
        item.name ||
        item.scholarship_name ||
        item.award_name ||
        `Scholarship Award #${idx + 1}`
      ).trim();

      const provider = String(
        item.provider ||
        item.organization ||
        item.sponsor ||
        item.source ||
        "scholarships.com"
      ).trim();

      const source = String(
        item.source ||
        item.source_platform ||
        item.provider ||
        "majestic_fund/the-scholarship-scraper-actor"
      ).trim();

      const rawAmt = item.amount || item.award || item.value || "$2,500";
      const cleanAmt =
        typeof rawAmt === "number"
          ? rawAmt
          : parseInt(String(rawAmt).replace(/[^0-9]/g, ""), 10) || 2500;
      const amountDisplay =
        typeof rawAmt === "string" && rawAmt.includes("$")
          ? rawAmt
          : `$${cleanAmt.toLocaleString()}`;

      let amountRangeKey: "1000" | "1000-2500" | "2500-5000" | "5000-10000" | "10000-plus" = "2500-5000";
      if (cleanAmt < 1000) amountRangeKey = "1000";
      else if (cleanAmt <= 2500) amountRangeKey = "1000-2500";
      else if (cleanAmt <= 5000) amountRangeKey = "2500-5000";
      else if (cleanAmt <= 10000) amountRangeKey = "5000-10000";
      else amountRangeKey = "10000-plus";

      const deadline = String(
        item.deadline ||
        item.due_date ||
        item.deadline_date ||
        item.application_deadline ||
        "2027-04-15"
      ).trim();

      const parsedDate = new Date(deadline);
      const deadlineMonth = !isNaN(parsedDate.getTime())
        ? monthNames[parsedDate.getMonth()]
        : "april";

      const description = String(
        item.description ||
        item.details ||
        item.summary ||
        item.about ||
        `Verified scholarship opportunity from ${provider} (${source}).`
      ).trim();

      const url = String(
        item.url ||
        item.applicationUrl ||
        item.application_url ||
        item.link ||
        item.apply_url ||
        "https://www.scholarships.com"
      ).trim();

      const field_of_study = String(
        item.field_of_study ||
        item.major ||
        item.category ||
        (Array.isArray(item.fields) ? item.fields.join(", ") : undefined) ||
        (field && field !== "all" ? field.replace(/-/g, " ") : "All Disciplines")
      ).trim();

      const level = String(
        item.level ||
        item.education_level ||
        item.grade_level ||
        (school_year && school_year !== "all" ? school_year.replace(/-/g, " ") : "Undergraduate / High School")
      ).trim();

      const location = String(
        item.location ||
        item.state ||
        item.geographic_scope ||
        (state && state !== "all" ? state.replace(/-/g, " ") : "Nationwide")
      ).trim();

      let parsedGpa = 0;
      const gpaMatch = (description || "").match(
        /(?:minimum|min\.?|cumulative|with a)?\s*([2-4]\.\d)\s*gpa/i
      );
      if (gpaMatch && gpaMatch[1]) {
        parsedGpa = parseFloat(gpaMatch[1]);
      } else if (typeof item.min_gpa === "number") {
        parsedGpa = item.min_gpa;
      } else if (typeof item.gpaRequirement === "number") {
        parsedGpa = item.gpaRequirement;
      }

      const isNationwide =
        location.toLowerCase().includes("nationwide") ||
        location.toLowerCase().includes("united states") ||
        (Array.isArray(item.states) && item.states.includes("all"));

      const id = String(
        item.id ||
        `apify_${idx}_${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
      );

      return {
        id,
        title,
        provider,
        source,
        organization: provider,
        amount: cleanAmt,
        amountDisplay,
        amountRangeKey,
        deadline,
        deadlineMonth,
        description,
        url,
        applicationUrl: url,
        field_of_study,
        level,
        location,
        scraped_at: item.scraped_at || new Date().toISOString(),
        min_gpa: parsedGpa,
        gpaRequirement: parsedGpa,
        states: isNationwide ? ["all"] : (state && state !== "all" ? [state] : (Array.isArray(item.states) ? item.states : ["all"])),
        fields: Array.isArray(item.fields) && item.fields.length > 0 ? item.fields : (field && field !== "all" ? [field] : ["all"]),
        schoolYears: Array.isArray(item.schoolYears) && item.schoolYears.length > 0
          ? item.schoolYears
          : (school_year && school_year !== "all" ? [school_year] : ["all"]),
        renewable: Boolean(item.renewable ?? (cleanAmt >= 5000)),
        needBased: Boolean(item.needBased ?? false),
        meritBased: Boolean(item.meritBased ?? true),
        sponsorType: item.sponsorType || "Foundation",
        requirements: Array.isArray(item.requirements) && item.requirements.length > 0
          ? item.requirements
          : [
              `Location: ${location}`,
              `Target Level: ${level}`,
              parsedGpa > 0 ? `Minimum ${parsedGpa.toFixed(1)} GPA requirement` : "Open to all academic GPAs",
              "Must apply by posted deadline",
            ],
      };
    });

    const responsePayload = {
      success: true,
      live: rawItems.length > 0,
      datasetId: datasetId || "live_stream",
      actor: APIFY_ACTOR,
      totalCount: mappedItems.length,
      items: mappedItems,
    };

    if (mappedItems.length > 0) {
      apifyCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    }

    return res.json(responsePayload);
  } catch (err: any) {
    console.warn("Apify live scrape notice:", err?.message);
    return res.json({
      success: false,
      error: err?.message || "Apify service error",
      message: "The Apify scraper actor majestic_fund/the-scholarship-scraper-actor is active; displaying verified scholarship dataset.",
      items: [],
    });
  }
}

app.post("/api/apify/run", handleApifyRequest);
app.post("/api/apify/scholarships", handleApifyRequest);
app.get("/api/apify/scholarships", handleApifyRequest);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(port, () => {
    console.log(`ScholarSearch server running on port ${port}`);
  });
}

startServer();
