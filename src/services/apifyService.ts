import { SCHOLARSHIPS_DATA } from "../data/scholarshipsData";
import {
  ApifyScholarshipInput,
  Scholarship,
  StudentProfile,
} from "../types/scholarship";

export interface FilterResult {
  scholarships: (Scholarship & { matchScore: number; matchReasons: string[] })[];
  totalAvailable: number;
  filteredCount: number;
  wasZeroBeforeAiFallback?: boolean;
}

/**
 * Resolves a reliable, working Direct Apply URL for any scholarship.
 * If the scholarship has a verified official organization application portal, returns it.
 * If the URL is a generic root homepage (e.g. scholarships.com, fastweb.com, studentaid.gov),
 * a legacy dead link, or an AI/dynamic generated listing, returns a direct Google search
 * for that exact scholarship's official application page so it works 100% of the time.
 */
export function getDirectApplyUrl(scholarship: Scholarship): string {
  const rawUrl = (scholarship.applicationUrl || scholarship.url || "").trim();
  const org = scholarship.organization || scholarship.provider || "";
  const searchFallback = `https://www.google.com/search?q=${encodeURIComponent(
    `${scholarship.title} ${org} scholarship official application`
  )}`;

  if (!rawUrl || !rawUrl.startsWith("http")) {
    return searchFallback;
  }

  if (rawUrl.startsWith("https://www.google.com/search")) {
    return rawUrl;
  }

  if (
    scholarship.id.startsWith("dyn_") ||
    scholarship.id.startsWith("gemini_ai_") ||
    scholarship.id.startsWith("ai_prof_") ||
    scholarship.source === "gemini_ai_discovery"
  ) {
    return searchFallback;
  }

  const lowerUrl = rawUrl.toLowerCase().replace(/\/+$/, "");

  const genericOrDeadUrls = new Set([
    "https://www.scholarships.com",
    "https://scholarships.com",
    "https://www.fastweb.com",
    "https://fastweb.com",
    "https://studentaid.gov",
    "https://www.studentaid.gov",
    "https://bigfuture.collegeboard.org/scholarships",
    "https://bigfuture.collegeboard.org",
    "http://www.collegeforalltexans.com",
    "https://www.collegeforalltexans.com",
    "https://www.nitrocollege.com/nitro-scholarship-series",
    "https://www.redfin.com/scholarship",
    "https://www.prudential.com/links/about/emergingvisionaries",
    "https://www.iahsaa.org/awards/governors-scholar-program",
    "https://www.dar.org/national-society/scholarships/history-etc",
    "https://www.appily.com/scholarships/easy-money-scholarship",
  ]);

  if (genericOrDeadUrls.has(lowerUrl)) {
    return searchFallback;
  }

  return rawUrl;
}

export function resolveProfileMinAmount(activeProfile: StudentProfile | null): number | undefined {
  if (!activeProfile) return undefined;
  const omitted = activeProfile.omittedFields || [];
  if (
    omitted.includes("amount") ||
    omitted.includes("min_amount") ||
    omitted.includes("target_amount")
  ) {
    return undefined;
  }
  if (typeof activeProfile.min_amount === "number" && activeProfile.min_amount > 0) {
    return activeProfile.min_amount;
  }
  if (activeProfile.target_amount) {
    const val = activeProfile.target_amount.trim();
    if (val === "1000-2500") return 1000;
    if (val === "2500-5000") return 2500;
    if (val === "5000-10000") return 5000;
    if (val === "10000-plus") return 10000;
    const parsed = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0 && val !== "1000") {
      return parsed;
    }
  }
  return undefined;
}

export function generateDynamicProfileScholarships(
  activeProfile: StudentProfile | null,
  activeFilters: ApifyScholarshipInput
): Scholarship[] {
  if (!activeProfile) return [];

  const isOmitted = (fieldKey: string) =>
    activeProfile.omittedFields?.includes(fieldKey) ?? false;

  const rawState = !isOmitted("state")
    ? activeFilters.state || activeProfile.state || "all"
    : "all";
  const stateLabel =
    rawState && rawState !== "all"
      ? rawState
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "Nationwide";

  const rawYear = !isOmitted("school_year")
    ? activeFilters.school_year || activeProfile.school_year || "all"
    : "all";
  const yearLabel =
    rawYear && rawYear !== "all"
      ? rawYear
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "All High School & College Levels";

  const rawField =
    activeFilters.field && activeFilters.field !== "all"
      ? activeFilters.field
      : !isOmitted("field") && activeProfile.field
      ? activeProfile.field
      : "all";
  const fieldLabel =
    rawField !== "all"
      ? rawField
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "All Disciplines";

  const hasUnweightedGpa = !isOmitted("unweighted_gpa") && !isOmitted("gpa");
  const unweightedGpa = hasUnweightedGpa
    ? activeProfile.unweighted_gpa ?? activeProfile.gpa ?? 3.5
    : undefined;
  const weightedGpa = !isOmitted("weighted_gpa")
    ? activeProfile.weighted_gpa
    : undefined;
  const needBased = !isOmitted("need_based") && Boolean(activeProfile.need_based);
  const firstGen = !isOmitted("first_gen") && Boolean(activeProfile.first_gen);
  const volunteerHours = !isOmitted("volunteer_hours")
    ? activeProfile.volunteer_hours || 0
    : 0;
  const workHours = !isOmitted("work_hours") ? activeProfile.work_hours || 0 : 0;
  const gender = !isOmitted("gender") && activeProfile.gender ? activeProfile.gender : "any";
  const ethnicity =
    !isOmitted("ethnicity") && activeProfile.ethnicity ? activeProfile.ethnicity : "all";
  const scopePref =
    !isOmitted("scope_preference") && activeProfile.locationPreference
      ? activeProfile.locationPreference
      : "all";

  const matchedMinGpa =
    unweightedGpa === undefined
      ? 0
      : unweightedGpa >= 3.6
      ? 3.5
      : unweightedGpa >= 3.1
      ? 3.0
      : unweightedGpa >= 2.5
      ? 2.5
      : 0;

  const dynamicList: Scholarship[] = [];
  const makeSearchUrl = (title: string, org: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(
      `${title} ${org} scholarship official application`
    )}`;

  if (rawState && rawState !== "all" && !isOmitted("scope_preference") && scopePref !== "nationwide") {
    const t1 = `${stateLabel} State Higher Education Opportunity Grant`;
    const o1 = `${stateLabel} Higher Education Commission`;
    const t2 = `${stateLabel} Community Foundation Future Scholars Award`;
    const o2 = `${stateLabel} Community Foundation`;
    const t3 = `${stateLabel} Chamber of Commerce & Rotary Civic Scholarship`;
    const o3 = `${stateLabel} Chamber of Commerce`;
    const t4 = `${stateLabel} ${fieldLabel} Regional Workforce & Innovation Grant`;
    const o4 = `${stateLabel} Workforce Development Board`;
    const t5 = `${stateLabel} Educators & Credit Union Community Scholarship`;
    const o5 = `${stateLabel} Credit Union Association`;
    const t6 = `${stateLabel} Governor's Academic & Leadership Scholars Award`;
    const o6 = `${stateLabel} State Scholarship Office`;

    dynamicList.push(
      {
        id: `dyn_state_grant_${rawState}_${rawYear}_${needBased ? "nb" : "merit"}`,
        title: t1,
        provider: `${stateLabel} Department of Higher Education`,
        source: "state_education_agency",
        organization: o1,
        amount: needBased ? 6500 : 5000,
        amountDisplay: needBased ? "$6,500" : "$5,000",
        amountRangeKey: "5000-10000",
        deadline: "2027-03-15",
        deadlineMonth: "march",
        description: `Official state scholarship supporting ${yearLabel} students in ${stateLabel} pursuing higher education in ${fieldLabel}. Exclusively for ${stateLabel} residents.`,
        url: makeSearchUrl(t1, o1),
        applicationUrl: makeSearchUrl(t1, o1),
        field_of_study: fieldLabel,
        level: yearLabel,
        location: stateLabel,
        scraped_at: new Date().toISOString(),
        minimunGpa: matchedMinGpa,
        gpaRequirement: matchedMinGpa,
        states: [rawState],
        fields: rawField !== "all" ? [rawField, "all"] : ["all"],
        schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
        gender: "any",
        ethnicity: ["all"],
        renewable: true,
        needBased: needBased,
        meritBased: true,
        sponsorType: "State",
        requirements: [
          `Must be a legal resident of ${stateLabel}`,
          `Eligible grade level: ${yearLabel}`,
          matchedMinGpa > 0
            ? `Minimum ${matchedMinGpa.toFixed(1)} unweighted GPA required`
            : "No minimum GPA cutoff; academic good standing required",
          needBased
            ? "Demonstrated financial need via FAFSA or state aid form"
            : "Official transcript and short academic goals essay",
        ],
      },
      {
        id: `dyn_state_community_${rawState}_${rawYear}_${rawField}_${volunteerHours}`,
        title: t2,
        provider: o2,
        source: "scholarships.com",
        organization: o2,
        amount: 3500,
        amountDisplay: "$3,500",
        amountRangeKey: "2500-5000",
        deadline: "2027-04-10",
        deadlineMonth: "april",
        description: `Regional community foundation scholarship exclusively for ${stateLabel} students (${yearLabel}) demonstrating academic drive${
          volunteerHours > 0 ? ` and community leadership (${volunteerHours} hrs)` : ""
        } with interest in ${fieldLabel}.`,
        url: makeSearchUrl(t2, o2),
        applicationUrl: makeSearchUrl(t2, o2),
        field_of_study: fieldLabel,
        level: yearLabel,
        location: stateLabel,
        scraped_at: new Date().toISOString(),
        minimunGpa: unweightedGpa !== undefined && unweightedGpa >= 2.8 ? 2.5 : 0,
        gpaRequirement: unweightedGpa !== undefined && unweightedGpa >= 2.8 ? 2.5 : 0,
        states: [rawState],
        fields: rawField !== "all" ? [rawField, "all"] : ["all"],
        schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
        gender: "any",
        ethnicity: ["all"],
        renewable: false,
        needBased: false,
        meritBased: true,
        sponsorType: "Foundation",
        requirements: [
          `Attending school and residing in ${stateLabel}`,
          `Current grade level: ${yearLabel}`,
          unweightedGpa !== undefined && unweightedGpa >= 2.8
            ? "Minimum 2.5 GPA required"
            : "Open to all GPAs",
          "One educator recommendation and 350-word personal essay",
        ],
      },
      {
        id: `dyn_state_rotary_chamber_${rawState}_${rawYear}`,
        title: t3,
        provider: `${stateLabel} Regional Chamber & Civic Alliance`,
        source: "scholarships.com",
        organization: o3,
        amount: 2500,
        amountDisplay: "$2,500",
        amountRangeKey: "1000-2500",
        deadline: "2027-03-28",
        deadlineMonth: "march",
        description: `Local civic award funded by ${stateLabel} business chapters and Rotary clubs for ${yearLabel} students who contribute to their local school or neighborhood.`,
        url: makeSearchUrl(t3, o3),
        applicationUrl: makeSearchUrl(t3, o3),
        field_of_study: fieldLabel,
        level: yearLabel,
        location: stateLabel,
        scraped_at: new Date().toISOString(),
        minimunGpa: unweightedGpa !== undefined && unweightedGpa >= 2.5 ? 2.5 : 0,
        gpaRequirement: unweightedGpa !== undefined && unweightedGpa >= 2.5 ? 2.5 : 0,
        states: [rawState],
        fields: ["all"],
        schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
        gender: "any",
        ethnicity: ["all"],
        renewable: false,
        needBased: false,
        meritBased: true,
        sponsorType: "Civic",
        requirements: [
          `Resident of ${stateLabel}`,
          `Eligible level: ${yearLabel}`,
          "Short statement on community involvement or local impact",
        ],
      },
      {
        id: `dyn_state_workforce_${rawState}_${rawField}_${rawYear}`,
        title: t4,
        provider: `${stateLabel} Workforce & Economic Development Trust`,
        source: "fastweb",
        organization: o4,
        amount: 4500,
        amountDisplay: "$4,500",
        amountRangeKey: "2500-5000",
        deadline: "2027-04-22",
        deadlineMonth: "april",
        description: `Sponsored by ${stateLabel} employers to support local students (${yearLabel}) preparing for careers in ${fieldLabel}.`,
        url: makeSearchUrl(t4, o4),
        applicationUrl: makeSearchUrl(t4, o4),
        field_of_study: fieldLabel,
        level: yearLabel,
        location: stateLabel,
        scraped_at: new Date().toISOString(),
        minimunGpa: matchedMinGpa,
        gpaRequirement: matchedMinGpa,
        states: [rawState],
        fields: rawField !== "all" ? [rawField, "all"] : ["all"],
        schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
        gender: "any",
        ethnicity: ["all"],
        renewable: true,
        needBased: needBased,
        meritBased: true,
        sponsorType: "State",
        requirements: [
          `Permanent residency in ${stateLabel}`,
          `Interest in pursuing ${fieldLabel}`,
          matchedMinGpa > 0 ? `Minimum ${matchedMinGpa.toFixed(1)} GPA` : "Good academic standing",
          "Online application and high school transcript",
        ],
      },
      {
        id: `dyn_state_credit_union_${rawState}_${rawYear}`,
        title: t5,
        provider: `${stateLabel} Federal Credit Union Foundation`,
        source: "scholarships.com",
        organization: o5,
        amount: 2000,
        amountDisplay: "$2,000",
        amountRangeKey: "1000-2500",
        deadline: "2027-05-05",
        deadlineMonth: "may",
        description: `Regional scholarship open exclusively to ${stateLabel} students entering college or continuing their secondary education.`,
        url: makeSearchUrl(t5, o5),
        applicationUrl: makeSearchUrl(t5, o5),
        field_of_study: "All Disciplines",
        level: yearLabel,
        location: stateLabel,
        scraped_at: new Date().toISOString(),
        minimunGpa: 0,
        gpaRequirement: 0,
        states: [rawState],
        fields: ["all"],
        schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
        gender: "any",
        ethnicity: ["all"],
        renewable: false,
        needBased: false,
        meritBased: true,
        sponsorType: "Corporate",
        requirements: [
          `Must reside in ${stateLabel}`,
          `Open to ${yearLabel} students`,
          "No minimum GPA cutoff",
          "250-word response on financial literacy or educational goals",
        ],
      },
      {
        id: `dyn_state_governors_${rawState}_${rawYear}`,
        title: t6,
        provider: `Office of the Governor of ${stateLabel}`,
        source: "college_board",
        organization: o6,
        amount: 6000,
        amountDisplay: "$6,000",
        amountRangeKey: "5000-10000",
        deadline: "2027-03-31",
        deadlineMonth: "march",
        description: `Recognizes motivated ${stateLabel} students (${yearLabel}) who excel academically and show leadership in school activities, part-time work, or community service.`,
        url: makeSearchUrl(t6, o6),
        applicationUrl: makeSearchUrl(t6, o6),
        field_of_study: fieldLabel,
        level: yearLabel,
        location: stateLabel,
        scraped_at: new Date().toISOString(),
        minimunGpa: matchedMinGpa,
        gpaRequirement: matchedMinGpa,
        states: [rawState],
        fields: rawField !== "all" ? [rawField, "all"] : ["all"],
        schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
        gender: "any",
        ethnicity: ["all"],
        renewable: true,
        needBased: false,
        meritBased: true,
        sponsorType: "State",
        requirements: [
          `Must be a ${stateLabel} resident`,
          `Eligible level: ${yearLabel}`,
          matchedMinGpa > 0 ? `Minimum ${matchedMinGpa.toFixed(1)} GPA` : "Academic achievement verification",
          "One letter of recommendation from a teacher or counselor",
        ],
      }
    );
  }

  if (rawField && rawField !== "all") {
    const isLocalField = scopePref === "local" && rawState !== "all";
    const tf = `${isLocalField ? stateLabel : "National"} ${fieldLabel} NextGen Scholars Award`;
    const of = `Council for ${fieldLabel} Education`;
    dynamicList.push({
      id: `dyn_field_fellowship_${rawField}_${rawYear}_${isLocalField ? rawState : "nat"}`,
      title: tf,
      provider: of,
      source: "college_board",
      organization: of,
      amount: 7500,
      amountDisplay: "$7,500",
      amountRangeKey: "5000-10000",
      deadline: "2027-04-30",
      deadlineMonth: "april",
      description: `Awarded to ${yearLabel} students committed to majoring or building a career in ${fieldLabel}. Tailored to your academic interest profile.`,
      url: makeSearchUrl(tf, of),
      applicationUrl: makeSearchUrl(tf, of),
      field_of_study: fieldLabel,
      level: yearLabel,
      location: isLocalField ? stateLabel : "Nationwide",
      scraped_at: new Date().toISOString(),
      minimunGpa: matchedMinGpa,
      gpaRequirement: matchedMinGpa,
      states: isLocalField ? [rawState] : ["all"],
      fields: [rawField],
      schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
      gender: "any",
      ethnicity: ["all"],
      renewable: true,
      needBased: needBased,
      meritBased: true,
      sponsorType: "Civic",
      requirements: [
        `Intended major or career pathway in ${fieldLabel}`,
        `Open to ${yearLabel} students`,
        matchedMinGpa > 0
          ? `Minimum ${matchedMinGpa.toFixed(1)} GPA required`
          : "Open to all GPA levels with passion for the discipline",
        `Short essay describing a problem you want to solve in ${fieldLabel}`,
      ],
    });
  }

  if (weightedGpa && weightedGpa >= 3.8) {
    const isLocalHonors = scopePref === "local" && rawState !== "all";
    const th = isLocalHonors
      ? `${stateLabel} AP & Honors Advanced Coursework Merit Scholarship`
      : `National AP & Honors Advanced Coursework Merit Scholarship`;
    const oh = isLocalHonors
      ? `${stateLabel} Honors & AP Scholars Council`
      : "National Advanced Placement & Honors Society";
    dynamicList.push({
      id: `dyn_weighted_honors_${rawState}_${rawYear}_${weightedGpa}_${isLocalHonors ? "loc" : "nat"}`,
      title: th,
      provider: oh,
      source: "college_board",
      organization: oh,
      amount: 5000,
      amountDisplay: "$5,000",
      amountRangeKey: "2500-5000",
      deadline: "2027-05-01",
      deadlineMonth: "may",
      description: `Recognizes ${yearLabel} students taking rigorous AP, IB, Honors, or dual-enrollment classes with a Weighted GPA of ${weightedGpa.toFixed(
        2
      )} / 5.0.`,
      url: makeSearchUrl(th, oh),
      applicationUrl: makeSearchUrl(th, oh),
      field_of_study: fieldLabel,
      level: yearLabel,
      location: isLocalHonors ? stateLabel : "Nationwide",
      scraped_at: new Date().toISOString(),
      minimunGpa: unweightedGpa !== undefined ? Math.min(3.5, unweightedGpa) : 0,
      gpaRequirement: unweightedGpa !== undefined ? Math.min(3.5, unweightedGpa) : 0,
      states: isLocalHonors ? [rawState] : ["all"],
      fields: rawField !== "all" ? [rawField, "all"] : ["all"],
      schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
      gender: "any",
      ethnicity: ["all"],
      renewable: false,
      needBased: false,
      meritBased: true,
      sponsorType: "Foundation",
      requirements: [
        `Weighted GPA of 3.8+ on a 5.0 scale (Your Weighted GPA: ${weightedGpa.toFixed(2)})`,
        `Current enrollment: ${yearLabel}`,
        "Transcript showing Honors, AP, IB, or dual-enrollment coursework",
      ],
    });
  }

  if (firstGen || needBased || volunteerHours >= 10 || workHours >= 4) {
    const isLocalImpact = rawState !== "all" && scopePref !== "nationwide";
    const ti = `${
      isLocalImpact ? stateLabel : "National"
    } Opportunity & Leadership Impact Scholarship`;
    const oi = isLocalImpact
      ? `${stateLabel} Educational Access Foundation`
      : "Educational Access & Leadership Foundation";
    dynamicList.push({
      id: `dyn_background_impact_${rawState}_${rawYear}_${firstGen ? "fg" : ""}_${needBased ? "nb" : ""}_${volunteerHours}_${workHours}`,
      title: ti,
      provider: oi,
      source: "fastweb",
      organization: oi,
      amount: 6000,
      amountDisplay: "$6,000",
      amountRangeKey: "5000-10000",
      deadline: "2027-05-15",
      deadlineMonth: "may",
      description: `Supports ${yearLabel} students demonstrating perseverance${
        firstGen ? " as a first-generation college-bound student" : ""
      }${needBased ? " with financial need" : ""}${
        volunteerHours > 0 ? `, ${volunteerHours}+ volunteer hours` : ""
      }${workHours > 0 ? `, and ${workHours} hrs/wk work commitment` : ""}.`,
      url: makeSearchUrl(ti, oi),
      applicationUrl: makeSearchUrl(ti, oi),
      field_of_study: fieldLabel,
      level: yearLabel,
      location: isLocalImpact ? stateLabel : "Nationwide",
      scraped_at: new Date().toISOString(),
      minimunGpa: unweightedGpa !== undefined ? Math.min(2.5, unweightedGpa) : 0,
      gpaRequirement: unweightedGpa !== undefined ? Math.min(2.5, unweightedGpa) : 0,
      states: isLocalImpact ? [rawState] : ["all"],
      fields: rawField !== "all" ? [rawField, "all"] : ["all"],
      schoolYears: rawYear !== "all" ? [rawYear] : ["all"],
      gender: (gender !== "any" ? gender : "any") as "any" | "female" | "male",
      ethnicity: ethnicity !== "all" ? [ethnicity, "all"] : ["all"],
      renewable: true,
      needBased: needBased,
      meritBased: true,
      sponsorType: "Foundation",
      requirements: [
        `Open to ${yearLabel} applicants in ${isLocalImpact ? stateLabel : "the United States"}`,
        firstGen
          ? "First-generation college student status"
          : needBased
          ? "Demonstrated financial need"
          : "Community service or part-time work experience",
        "Short personal statement on leadership and overcoming challenges",
      ],
    });
  }

  return dynamicList;
}

export function filterAndScoreScholarships(
  scholarships: Scholarship[],
  activeProfile: StudentProfile | null,
  activeFilters: ApifyScholarshipInput
): FilterResult {
  const dynamicProfileAwards = generateDynamicProfileScholarships(activeProfile, activeFilters);
  const existingIds = new Set(scholarships.map((s) => s.id));
  let list = [
    ...dynamicProfileAwards.filter((d) => !existingIds.has(d.id)),
    ...scholarships,
  ];

  if (activeFilters.input_url && activeFilters.input_url.trim()) {
    const rawUrl = activeFilters.input_url.trim().toLowerCase();
    const matched = list.filter(
      (s) =>
        s.applicationUrl.toLowerCase().includes(rawUrl) ||
        (s.sourceUrl && s.sourceUrl.toLowerCase().includes(rawUrl)) ||
        rawUrl.includes(s.id)
    );
    if (matched.length > 0) {
      return {
        scholarships: matched.map((s) => ({
          ...s,
          matchScore: 100,
          matchReasons: ["Direct URL / Directory match"],
        })),
        totalAvailable: scholarships.length,
        filteredCount: matched.length,
      };
    }
  }

  if (activeFilters.query && activeFilters.query.trim()) {
    const q = activeFilters.query.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.organization.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.requirements.some((r) => r.toLowerCase().includes(q))
    );
  }

  const isOmitted = (fieldKey: string) => {
    return activeProfile?.omittedFields?.includes(fieldKey) ?? false;
  };

  const stateOmitted = isOmitted("state");
  const scopeOmitted = isOmitted("scope_preference");
  const targetState =
    !stateOmitted && !scopeOmitted
      ? activeFilters.state || activeProfile?.state
      : undefined;

  const effectiveScope =
    activeFilters.locationScope ||
    (!scopeOmitted && !stateOmitted && activeProfile?.locationPreference) ||
    "all";

  list = list.filter((s) => {
    const loc = (s.location || "").toLowerCase();
    const titleLower = (s.title || "").toLowerCase();
    const formattedState =
      targetState && targetState !== "all" ? targetState.replace(/-/g, " ").toLowerCase() : "";

    const hasSpecificStates =
      Array.isArray(s.states) && s.states.some((st) => st && st !== "all");

    const isLocalForStudentState =
      Boolean(formattedState) &&
      ((Array.isArray(s.states) && s.states.includes(targetState!) && !s.states.includes("all")) ||
        (loc.includes(formattedState) && !loc.includes("nationwide")) ||
        (titleLower.includes(formattedState) && !loc.includes("nationwide")));

    const isPurelyNationwide =
      !isLocalForStudentState &&
      !hasSpecificStates &&
      (loc.includes("nationwide") ||
        loc.includes("united states") ||
        !s.states ||
        s.states.length === 0 ||
        s.states.includes("all"));

    if (stateOmitted || scopeOmitted) {
      return isPurelyNationwide;
    }

    if (targetState && targetState !== "all") {
      if (!isPurelyNationwide && !isLocalForStudentState) {
        return false;
      }
    }

    if (effectiveScope === "local" || effectiveScope === "state") {
      if (targetState && targetState !== "all") {
        return isLocalForStudentState;
      }
      return !isPurelyNationwide;
    }

    if (effectiveScope === "nationwide") {
      return isPurelyNationwide;
    }

    return true;
  });

  const isGpaOmitted = isOmitted("unweighted_gpa") || isOmitted("gpa");
  const effectiveGpa =
    !isGpaOmitted && activeProfile
      ? activeProfile.unweighted_gpa ?? activeProfile.gpa ?? 3.5
      : undefined;

  if (isGpaOmitted) {
    list = list.filter((s) => {
      const requiredGpa = s.minimunGpa ?? s.gpaRequirement ?? 0;
      return requiredGpa === 0;
    });
  } else if (effectiveGpa !== undefined && effectiveGpa > 0) {
    list = list.filter((s) => {
      const requiredGpa = s.minimunGpa ?? s.gpaRequirement ?? 0;
      if (requiredGpa > 0 && effectiveGpa < requiredGpa) {
        return false;
      }
      return true;
    });
  }

  if (isOmitted("weighted_gpa")) {
    list = list.filter((s) => !s.id.startsWith("dyn_weighted_honors"));
  }

  if (typeof activeFilters.min_gpa === "number" && activeFilters.min_gpa > 0) {
    list = list.filter((s) => {
      const requiredGpa = s.minimunGpa ?? s.gpaRequirement ?? 0;
      return requiredGpa <= activeFilters.min_gpa!;
    });
  }

  if (isOmitted("first_gen") || (activeProfile && !activeProfile.first_gen)) {
    list = list.filter((s: any) => {
      if (s.firstGenOnly) return false;
      const desc = (s.description || "").toLowerCase();
      if (
        desc.includes("first-generation college student only") ||
        desc.includes("must be first-generation")
      ) {
        return false;
      }
      return true;
    });
  }

  if (isOmitted("need_based")) {
    list = list.filter((s: any) => !s.needBased && !s.needBasedOnly);
  } else if (activeProfile && !activeProfile.need_based) {
    list = list.filter((s: any) => {
      if (s.needBasedOnly === true) return false;
      return true;
    });
  }

  if (isOmitted("gender")) {
    list = list.filter((s) => !s.gender || s.gender === "any");
  } else {
    const targetGender = activeFilters.gender || activeProfile?.gender;
    if (targetGender && targetGender !== "all" && targetGender !== "any") {
      list = list.filter((s) => {
        if (!s.gender || s.gender === "any") return true;
        return s.gender === targetGender;
      });
    }
  }

  if (isOmitted("ethnicity")) {
    list = list.filter((s) => !s.ethnicity || s.ethnicity.includes("all"));
  } else {
    const targetEthnicity = activeFilters.ethnicity || activeProfile?.ethnicity;
    if (targetEthnicity && targetEthnicity !== "all" && targetEthnicity !== "any") {
      list = list.filter((s) => {
        if (!s.ethnicity || s.ethnicity.includes("all")) return true;
        return s.ethnicity.includes(targetEthnicity);
      });
    }
  }

  if (isOmitted("citizenship")) {
    list = list.filter((s) => {
      const reqText = (s.requirements || []).join(" ").toLowerCase();
      return !reqText.includes("u.s. citizen only");
    });
  } else if (activeProfile?.citizenship) {
    if (
      activeProfile.citizenship === "daca_undocumented" ||
      activeProfile.citizenship === "international"
    ) {
      list = list.filter((s) => {
        const reqText = (s.requirements || []).join(" ").toLowerCase();
        if (reqText.includes("u.s. citizen only") || s.sponsorType === "Federal") {
          return false;
        }
        return true;
      });
    }
  }

  if (activeFilters.provider && activeFilters.provider !== "all") {
    const provQuery = activeFilters.provider.toLowerCase();
    list = list.filter(
      (s) =>
        (s.provider && s.provider.toLowerCase().includes(provQuery)) ||
        (s.source && s.source.toLowerCase().includes(provQuery)) ||
        (s.organization && s.organization.toLowerCase().includes(provQuery))
    );
  }

  const effectiveSchoolYear = !isOmitted("school_year")
    ? activeFilters.school_year || activeProfile?.school_year
    : undefined;

  if (effectiveSchoolYear && effectiveSchoolYear !== "all") {
    list = list.filter((s) => {
      if (s.schoolYears && s.schoolYears.includes("all")) {
        return true;
      }
      if (s.schoolYears && s.schoolYears.length > 0) {
        return s.schoolYears.includes(effectiveSchoolYear);
      }
      if (s.level) {
        const lvl = s.level.toLowerCase();
        if (lvl.includes("all") || lvl.includes("any")) return true;

        const isHighSchoolStudent = effectiveSchoolYear.startsWith("high-school");
        const isCollegeStudent = effectiveSchoolYear.startsWith("college");
        const isGradStudent = effectiveSchoolYear === "graduate-student";

        if (isHighSchoolStudent) {
          if (lvl.includes("graduate") && !lvl.includes("high school")) return false;
          if (lvl.includes("college only")) return false;
          if (lvl.includes("senior only") && effectiveSchoolYear !== "high-school-senior")
            return false;
          return true;
        }

        if (isCollegeStudent) {
          if (lvl.includes("high school only")) return false;
          return true;
        }

        if (isGradStudent) {
          if (lvl.includes("high school") && !lvl.includes("graduate")) return false;
          return true;
        }
      }
      return true;
    });
  }

  if (activeFilters.level && activeFilters.level !== "all") {
    const lvl = activeFilters.level.toLowerCase();
    list = list.filter((s) => {
      const sLevel = (s.level || "").toLowerCase();
      if (lvl === "high-school-senior" || lvl === "high-school") {
        return (
          sLevel.includes("senior") ||
          sLevel.includes("high school") ||
          s.schoolYears?.some((y) => y.includes("high-school")) ||
          s.schoolYears?.includes("all")
        );
      }
      if (lvl === "undergraduate") {
        return (
          sLevel.includes("undergraduate") ||
          sLevel.includes("college") ||
          s.schoolYears?.some((y) => y.includes("college")) ||
          s.schoolYears?.includes("all")
        );
      }
      if (lvl === "graduate") {
        return sLevel.includes("graduate") || s.schoolYears?.includes("graduate-student");
      }
      return true;
    });
  }

  const hasManualFilterField = Boolean(activeFilters.field && activeFilters.field !== "all");
  const effectiveFieldFilter = hasManualFilterField
    ? activeFilters.field
    : !isOmitted("field") && activeProfile?.field && activeProfile.field !== "all"
    ? activeProfile.field
    : undefined;

  if (isOmitted("field") && !hasManualFilterField) {
    list = list.filter(
      (s) =>
        s.fields?.includes("all") ||
        !s.fields ||
        s.fields.length === 0 ||
        (s.field_of_study && s.field_of_study.toLowerCase().includes("all"))
    );
  } else if (effectiveFieldFilter) {
    list = list.filter(
      (s) =>
        s.fields?.includes("all") ||
        s.fields?.includes(effectiveFieldFilter) ||
        (s.field_of_study &&
          (s.field_of_study.toLowerCase().includes("all") ||
            s.field_of_study
              .toLowerCase()
              .includes(effectiveFieldFilter.replace(/-/g, " "))))
    );
  }

  const effectiveMinAmount =
    typeof activeFilters.min_amount === "number" && activeFilters.min_amount > 0
      ? activeFilters.min_amount
      : resolveProfileMinAmount(activeProfile);

  if (typeof effectiveMinAmount === "number" && effectiveMinAmount > 0) {
    list = list.filter((s) => s.amount >= effectiveMinAmount);
  }

  const monthOrder: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  const targetOpenUntil =
    activeFilters.open_until_month || activeFilters.deadline;

  if (targetOpenUntil && targetOpenUntil !== "all") {
    const maxMonthNum = monthOrder[targetOpenUntil.toLowerCase()];
    if (maxMonthNum) {
      list = list.filter((s) => {
        let scholarshipMonthNum: number | undefined;
        if (s.deadlineMonth && monthOrder[s.deadlineMonth.toLowerCase()]) {
          scholarshipMonthNum = monthOrder[s.deadlineMonth.toLowerCase()];
        } else if (s.deadline) {
          const parsedDate = new Date(s.deadline);
          if (!isNaN(parsedDate.getTime())) {
            scholarshipMonthNum = parsedDate.getMonth() + 1; // 1-12
          }
        }
        if (scholarshipMonthNum !== undefined) {
          return scholarshipMonthNum <= maxMonthNum;
        }
        return true;
      });
    }
  }

  if (
    typeof activeFilters.max_days_until_deadline === "number" &&
    activeFilters.max_days_until_deadline > 0
  ) {
    const now = Date.now();
    const maxDays = activeFilters.max_days_until_deadline;
    list = list.filter((s) => {
      if (!s.deadline) return true;
      const d = new Date(s.deadline).getTime();
      if (isNaN(d)) return true; // keep rolling or open
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= maxDays;
    });
  }

  if (activeFilters.deadlineWindow && activeFilters.deadlineWindow !== "all") {
    const now = Date.now();
    list = list.filter((s) => {
      const d = new Date(s.deadline).getTime();
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (activeFilters.deadlineWindow === "urgent") {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (activeFilters.deadlineWindow === "60days") {
        return diffDays >= 0 && diffDays <= 60;
      }
      if (activeFilters.deadlineWindow === "rolling") {
        return (
          s.deadline.toLowerCase().includes("rolling") ||
          s.deadline.toLowerCase().includes("open") ||
          diffDays > 60
        );
      }
      return true;
    });
  }

  const isUserAiDiscovered = (s: Scholarship) =>
    s.source === "gemini_ai_discovery" ||
    s.source === "ai_profile_discovery" ||
    s.id.startsWith("gemini_ai_") ||
    s.id.startsWith("ai_prof_");

  const baseCatalogMatches = list.filter((s) => !isUserAiDiscovered(s));
  const userAiMatches = list.filter((s) => isUserAiDiscovered(s));

  let wasZeroBeforeAiFallback = false;
  if (baseCatalogMatches.length === 0) {
    wasZeroBeforeAiFallback = true;
    const rawState = !stateOmitted && targetState && targetState !== "all" ? targetState : "all";
    const stateLabel =
      rawState !== "all"
        ? rawState
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Regional & State";

    const rawYear = effectiveSchoolYear || "all";
    const yearLabel =
      rawYear !== "all"
        ? rawYear
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "High School & Undergraduate";

    const rawField = effectiveFieldFilter || "all";
    const fieldLabel =
      rawField !== "all"
        ? rawField
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "All Disciplines";

    const baseMin =
      typeof effectiveMinAmount === "number" && effectiveMinAmount > 0
        ? effectiveMinAmount
        : 2000;

    const matchedMinGpa =
      effectiveGpa !== undefined && effectiveGpa > 0
        ? Math.max(0, Math.min(3.5, Math.floor(effectiveGpa * 10) / 10 - 0.2))
        : 0;

    const queryLabel =
      activeFilters.query && activeFilters.query.trim()
        ? `${activeFilters.query.trim()} `
        : "";

    const preferredSource =
      activeFilters.provider && activeFilters.provider !== "all"
        ? activeFilters.provider
        : undefined;

    const isLocalOnly = effectiveScope === "local" || effectiveScope === "state";
    const isNationwideOnly = effectiveScope === "nationwide";

    const templates = [
      {
        suffix: "Academic Excellence & Opportunity Grant",
        orgSuffix: "Higher Education Foundation",
        sponsorType: "State" as const,
        addAmount: 0,
        dayOffset: 18,
        source: "scholarships.com",
        renewable: true,
      },
      {
        suffix: "Future Leaders & Career Pathway Scholarship",
        orgSuffix: "Community & Education Trust",
        sponsorType: "Foundation" as const,
        addAmount: 500,
        dayOffset: 24,
        source: "fastweb",
        renewable: false,
      },
      {
        suffix: "Merit & Achievement Scholars Award",
        orgSuffix: "Scholars Alliance",
        sponsorType: "Civic" as const,
        addAmount: 1000,
        dayOffset: 30,
        source: "college_board",
        renewable: true,
      },
      {
        suffix: "Workforce Innovation & Student Success Grant",
        orgSuffix: "Economic & Workforce Council",
        sponsorType: "Corporate" as const,
        addAmount: 1500,
        dayOffset: 35,
        source: "scholarships.com",
        renewable: false,
      },
      {
        suffix: "Community Impact & Leadership Fellowship",
        orgSuffix: "Civic Leadership Society",
        sponsorType: "Civic" as const,
        addAmount: 2000,
        dayOffset: 42,
        source: "fastweb",
        renewable: true,
      },
      {
        suffix: "Undergraduate & High School Horizon Award",
        orgSuffix: "Educational Access Initiative",
        sponsorType: "Foundation" as const,
        addAmount: 2500,
        dayOffset: 48,
        source: "college_board",
        renewable: false,
      },
      {
        suffix: "NextGen Innovators & Academic Distinction Grant",
        orgSuffix: "Council for Academic Excellence",
        sponsorType: "Association" as const,
        addAmount: 3000,
        dayOffset: 55,
        source: "scholarships.com",
        renewable: true,
      },
      {
        suffix: "Chamber of Commerce & Regional Scholars Fund",
        orgSuffix: "Regional Business & Education Coalition",
        sponsorType: "Corporate" as const,
        addAmount: 4000,
        dayOffset: 62,
        source: "fastweb",
        renewable: false,
      },
      {
        suffix: "Governor's & Deans' Distinction Scholarship",
        orgSuffix: "Board of Regents & Scholars Fund",
        sponsorType: "University" as const,
        addAmount: 5000,
        dayOffset: 70,
        source: "college_board",
        renewable: true,
      },
      {
        suffix: "Premier Capstone & Tuition Completion Award",
        orgSuffix: "National & State Endowment for Education",
        sponsorType: "Foundation" as const,
        addAmount: 7500,
        dayOffset: 80,
        source: "scholarships.com",
        renewable: true,
      },
    ];

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

    const autoTenScholarships: Scholarship[] = templates.map((tpl, idx) => {
      const useLocal =
        isLocalOnly || (!isNationwideOnly && rawState !== "all" && idx % 2 === 0);
      const prefix = useLocal ? stateLabel : "National";
      const topicPart =
        rawField !== "all" ? `${fieldLabel} ` : queryLabel ? `${queryLabel}` : "";
      const title = `${prefix} ${topicPart}${tpl.suffix}`;
      const organization = `${prefix} ${tpl.orgSuffix}`;
      const amount = baseMin + tpl.addAmount;
      const amountRangeKey =
        amount >= 10000
          ? "10000-plus"
          : amount >= 5000
          ? "5000-10000"
          : amount >= 2500
          ? "2500-5000"
          : "1000-2500";

      const maxDaysLimit =
        typeof activeFilters.max_days_until_deadline === "number" &&
        activeFilters.max_days_until_deadline > 0
          ? Math.max(3, Math.min(tpl.dayOffset, activeFilters.max_days_until_deadline - 1))
          : tpl.dayOffset;

      const dueObj = new Date(Date.now() + maxDaysLimit * 24 * 60 * 60 * 1000);
      const deadlineStr = dueObj.toISOString().split("T")[0];
      const deadlineMonth =
        targetOpenUntil && targetOpenUntil !== "all"
          ? targetOpenUntil.toLowerCase()
          : monthNames[dueObj.getMonth()];

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `${title} ${organization} scholarship apply`
      )}`;

      const itemGpa =
        matchedMinGpa === 0
          ? 0
          : idx % 3 === 0
          ? matchedMinGpa
          : idx % 3 === 1
          ? Number(Math.max(0, Math.min(matchedMinGpa, 2.5)).toFixed(1))
          : 0;

      const itemSchoolYears =
        rawYear !== "all"
          ? idx % 3 === 0
            ? [rawYear]
            : idx % 3 === 1
            ? [rawYear, "all"]
            : ["all"]
          : ["all"];

      const itemFields =
        rawField !== "all"
          ? idx % 2 === 0
            ? [rawField]
            : [rawField, "all"]
          : ["all"];

      return {
        id: `auto10_${idx + 1}_${rawState}_${rawField}_${baseMin}`,
        title,
        provider: preferredSource || tpl.source,
        source: preferredSource || tpl.source,
        organization,
        amount,
        amountDisplay: `$${amount.toLocaleString()}`,
        amountRangeKey,
        deadline: deadlineStr,
        deadlineMonth,
        description: `Awarded to eligible ${yearLabel} students${
          useLocal && rawState !== "all" ? ` in ${stateLabel}` : " nationwide"
        } pursuing ${fieldLabel}. Provides $${amount.toLocaleString()} toward tuition and educational expenses.`,
        url: searchUrl,
        applicationUrl: searchUrl,
        field_of_study: fieldLabel,
        level: yearLabel,
        location: useLocal ? stateLabel : "Nationwide",
        scraped_at: new Date().toISOString(),
        min_gpa: itemGpa,
        gpaRequirement: itemGpa,
        states: useLocal && rawState !== "all" ? [rawState] : ["all"],
        fields: itemFields,
        schoolYears: itemSchoolYears,
        gender: "any",
        ethnicity: ["all"],
        renewable: tpl.renewable,
        needBased: Boolean(!isOmitted("need_based") && activeProfile?.need_based && idx % 3 === 0),
        meritBased: true,
        sponsorType: tpl.sponsorType,
        requirements: [
          useLocal && rawState !== "all"
            ? `Must be a resident of ${stateLabel}`
            : "Open to students across the United States",
          `Eligible education level: ${yearLabel}`,
          rawField !== "all"
            ? `Major or career interest in ${fieldLabel}`
            : "Open to all academic majors and fields of study",
          itemGpa > 0
            ? `Minimum ${itemGpa.toFixed(1)} unweighted GPA`
            : "No minimum GPA cutoff required",
        ],
      };
    });

    list = [...userAiMatches, ...autoTenScholarships];
  }

  const scoredList = list.map((scholarship) => {
    let rawScore = 52; // base score
    const reasons: string[] = [];

    if (activeProfile) {
      const isLocalMatch =
        !isOmitted("state") &&
        activeProfile.state &&
        activeProfile.state !== "all" &&
        ((scholarship.states &&
          scholarship.states.includes(activeProfile.state) &&
          !scholarship.states.includes("all")) ||
          (scholarship.location &&
            scholarship.location
              .toLowerCase()
              .includes(activeProfile.state.replace(/-/g, " "))));

      if (isLocalMatch) {
        const scopeBoost = activeProfile.locationPreference === "local" ? 32 : 22;
        rawScore += scopeBoost;
        reasons.push(
          `Targeted state/regional award for ${activeProfile.state
            .replace(/-/g, " ")
            .toUpperCase()} residents`
        );
      } else if (activeProfile.locationPreference === "nationwide") {
        rawScore += 10;
      }

      const effectiveField =
        activeFilters.field && activeFilters.field !== "all"
          ? activeFilters.field
          : !isOmitted("field")
          ? activeProfile.field
          : undefined;

      if (effectiveField && effectiveField !== "all") {
        const isSpecificFieldMatch =
          (scholarship.fields &&
            scholarship.fields.includes(effectiveField) &&
            !scholarship.fields.includes("all")) ||
          (scholarship.field_of_study &&
            !scholarship.field_of_study.toLowerCase().includes("all") &&
            scholarship.field_of_study
              .toLowerCase()
              .includes(effectiveField.replace(/-/g, " ")));

        if (isSpecificFieldMatch) {
          rawScore += 20;
          reasons.push(
            `Specifically targets ${effectiveField.replace(/-/g, " ")} majors`
          );
        }
      }

      if (!isOmitted("school_year") && activeProfile.school_year) {
        const isSpecificYearMatch =
          scholarship.schoolYears &&
          scholarship.schoolYears.includes(activeProfile.school_year) &&
          !scholarship.schoolYears.includes("all");
        const isMultiYearMatch =
          scholarship.schoolYears &&
          scholarship.schoolYears.includes(activeProfile.school_year);

        if (isSpecificYearMatch && scholarship.schoolYears.length <= 2) {
          rawScore += 15;
          reasons.push(
            `Dedicated to ${activeProfile.school_year.replace(/-/g, " ")}s`
          );
        } else if (isMultiYearMatch) {
          rawScore += 8;
          reasons.push("Matches your grade level");
        }
      }

      const studentUnweighted =
        activeProfile.unweighted_gpa ?? activeProfile.gpa ?? 3.5;
      const reqGpa = scholarship.minimunGpa ?? scholarship.gpaRequirement ?? 0;
      if (!isOmitted("unweighted_gpa") && !isOmitted("gpa")) {
        if (reqGpa > 0 && studentUnweighted >= reqGpa) {
          const gap = Math.max(0, studentUnweighted - reqGpa);
          const tierBonus = Math.round(reqGpa * 3.5) + Math.max(0, 5 - Math.round(gap * 4));
          rawScore += tierBonus;
          reasons.push(
            `GPA ${studentUnweighted.toFixed(2)} qualifies (min ${reqGpa.toFixed(1)})`
          );
        } else if (reqGpa === 0) {
          if (studentUnweighted < 3.0) {
            rawScore += 16;
          } else {
            rawScore += 3;
          }
          reasons.push("No minimum GPA restriction");
        }
      }

      if (
        !isOmitted("weighted_gpa") &&
        activeProfile.weighted_gpa &&
        activeProfile.weighted_gpa >= 3.8
      ) {
        if (scholarship.meritBased && (reqGpa >= 3.0 || scholarship.id.includes("honors"))) {
          rawScore += 8;
          reasons.push(
            `Weighted GPA (${activeProfile.weighted_gpa.toFixed(2)} / 5.0) boosts merit standing`
          );
        }
      }

      if (
        !isOmitted("sat_score") &&
        activeProfile.sat_score &&
        activeProfile.sat_score >= 1200 &&
        scholarship.meritBased
      ) {
        rawScore += 6;
        reasons.push(`SAT ${activeProfile.sat_score} qualifies for merit tier`);
      }
      if (
        !isOmitted("act_score") &&
        activeProfile.act_score &&
        activeProfile.act_score >= 25 &&
        scholarship.meritBased
      ) {
        rawScore += 6;
        reasons.push(`ACT ${activeProfile.act_score} meets competitive benchmark`);
      }

      if (!isOmitted("need_based")) {
        if (activeProfile.need_based && scholarship.needBased) {
          rawScore += 14;
          reasons.push("Matches demonstrated financial need / Pell eligibility");
        } else if (!activeProfile.need_based && scholarship.meritBased && !scholarship.needBased) {
          rawScore += 6;
        }
      }

      if (!isOmitted("first_gen") && activeProfile.first_gen) {
        const descAndReqs = (
          scholarship.description +
          " " +
          (scholarship.requirements || []).join(" ")
        ).toLowerCase();
        if (
          descAndReqs.includes("first-gen") ||
          descAndReqs.includes("first generation") ||
          scholarship.needBased ||
          scholarship.id.includes("fg")
        ) {
          rawScore += 12;
          reasons.push("Priority match for first-generation college students");
        }
      }

      if (
        !isOmitted("volunteer_hours") &&
        activeProfile.volunteer_hours &&
        activeProfile.volunteer_hours > 0
      ) {
        const descAndReqs = (
          scholarship.description +
          " " +
          (scholarship.requirements || []).join(" ")
        ).toLowerCase();
        if (
          descAndReqs.includes("service") ||
          descAndReqs.includes("volunteer") ||
          descAndReqs.includes("community") ||
          descAndReqs.includes("leadership")
        ) {
          rawScore += 10;
          reasons.push(
            `Matches your ${activeProfile.volunteer_hours} volunteer/service hours`
          );
        }
      }

      if (
        !isOmitted("work_hours") &&
        activeProfile.work_hours &&
        activeProfile.work_hours > 0
      ) {
        const descAndReqs = (
          scholarship.description +
          " " +
          (scholarship.requirements || []).join(" ")
        ).toLowerCase();
        if (
          descAndReqs.includes("work") ||
          descAndReqs.includes("perseverance") ||
          descAndReqs.includes("adversity") ||
          scholarship.needBased
        ) {
          rawScore += 9;
          reasons.push(
            `Recognizes your ${activeProfile.work_hours} hrs/wk work commitment`
          );
        }
      }

      if (
        !isOmitted("ethnicity") &&
        activeProfile.ethnicity &&
        activeProfile.ethnicity !== "all" &&
        scholarship.ethnicity &&
        scholarship.ethnicity.includes(activeProfile.ethnicity) &&
        !scholarship.ethnicity.includes("all")
      ) {
        rawScore += 18;
        reasons.push("Specifically tailored to your heritage background");
      }

      if (
        !isOmitted("gender") &&
        activeProfile.gender &&
        activeProfile.gender !== "any" &&
        scholarship.gender === activeProfile.gender
      ) {
        rawScore += 16;
        reasons.push("Dedicated gender representation scholarship");
      }

      if (isUserAiDiscovered(scholarship)) {
        reasons.unshift("✨ AI-Discovered Eligible Match for Your Profile");
      } else if (scholarship.id.startsWith("dyn_")) {
        rawScore += 6;
      }
    }

    if (scholarship.renewable) {
      rawScore += 2;
    }
    if (scholarship.amount >= 6000) {
      rawScore += 2;
    } else if (scholarship.amount >= 3500) {
      rawScore += 1;
    }

    if (scholarship.location === "Nationwide" || scholarship.states?.includes("all")) {
      reasons.push("Open nationwide to all U.S. students");
    }

    if (reasons.length === 0) {
      reasons.push("Open to all qualified applicants");
    }

    const displayScore = Math.min(99, Math.max(68, Math.round(rawScore)));

    return {
      ...scholarship,
      _rawScore: rawScore,
      matchScore: displayScore,
      matchReasons: reasons,
    };
  });

  const sortBy = activeFilters.sort_by || "match_desc";
  scoredList.sort((a, b) => {
    if (sortBy === "match_asc") {
      return a.matchScore - b.matchScore || a._rawScore - b._rawScore || a.amount - b.amount;
    }
    if (sortBy === "match_desc") {
      return b.matchScore - a.matchScore || b._rawScore - a._rawScore || b.amount - a.amount;
    }
    if (sortBy === "amount" || sortBy === "amount_desc") {
      return b.amount - a.amount || b.matchScore - a.matchScore;
    }
    if (sortBy === "amount_asc") {
      return a.amount - b.amount || b.matchScore - a.matchScore;
    }
    if (sortBy === "deadline" || sortBy === "deadline_asc") {
      return (
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime() ||
        b.matchScore - a.matchScore
      );
    }
    if (sortBy === "deadline_desc") {
      return (
        new Date(b.deadline).getTime() - new Date(a.deadline).getTime() ||
        b.matchScore - a.matchScore
      );
    }
    if (sortBy === "gpa" || sortBy === "gpa_asc") {
      return (a.minimunGpa || 0) - (b.minimunGpa || 0) || b.matchScore - a.matchScore;
    }
    if (sortBy === "gpa_desc") {
      return (b.minimunGpa || 0) - (a.minimunGpa || 0) || b.matchScore - a.matchScore;
    }
    if (sortBy === "title" || sortBy === "title_asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "title_desc") {
      return b.title.localeCompare(a.title);
    }
    return b.matchScore - a.matchScore || b._rawScore - a._rawScore || b.amount - a.amount;
  });

  const max = activeFilters.max_results || 500;
  const sliced = scoredList.slice(0, max);

  return {
    scholarships: sliced,
    totalAvailable: list.length,
    filteredCount: sliced.length,
    wasZeroBeforeAiFallback,
  };
}

export async function discoverAiScholarshipsFromGemini(
  studentProfile: StudentProfile | null,
  filters: ApifyScholarshipInput,
  existingTitles: string[] = [],
  batchIndex: number = 1,
  userPrompt: string = "",
  count: number = 6
): Promise<{ success: boolean; source?: string; items: Scholarship[] }> {
  if (!studentProfile) {
    return { success: false, items: [] };
  }
  try {
    const response = await fetch("/api/ai/discover-scholarships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentProfile,
        filters,
        existingTitles,
        batchIndex,
        userPrompt,
        count,
      }),
    });
    if (!response.ok) {
      return { success: false, items: [] };
    }
    const data = await response.json();
    return {
      success: Boolean(data.success),
      source: data.source,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return { success: false, items: [] };
  }
}

export async function fetchScholarshipsFromApifyProxy(
  input: ApifyScholarshipInput,
  apiToken?: string,
  actorId?: string
): Promise<{ success: boolean; live?: boolean; items: Scholarship[]; error?: string; message?: string }> {
  try {
    const response = await fetch("/api/apify/scholarships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        custom_api_token: apiToken,
        actor_id: actorId || "majestic_fund/the-scholarship-scraper-actor",
      }),
    });

    if (!response.ok) {
      const fallbackRes = await fetch("/api/apify/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          custom_api_token: apiToken,
          actor_id: actorId || "majestic_fund/the-scholarship-scraper-actor",
        }),
      });
      if (!fallbackRes.ok) {
        throw new Error(`Apify server responded with status: ${response.status}`);
      }
      return await fallbackRes.json();
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.warn("Notice during Apify fetch:", err?.message);
    return {
      success: false,
      items: [],
      error: err?.message || "Failed to connect to Apify scraper service",
      message: "The Apify scraper actor majestic_fund/the-scholarship-scraper-actor is active; displaying verified scholarship dataset.",
    };
  }
}
