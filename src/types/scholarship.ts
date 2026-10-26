export interface ApifyScholarshipInput {
  input_url?: string;
  query?: string;
  state?: string;
  field?: string;
  school_year?: string;
  amount?: string;
  min_amount?: number; // Typed award amount filter (e.g. 2500)
  open_until_month?: string; // Open until month (e.g. "october" includes Jan - Oct)
  max_days_until_deadline?: number; // Custom days until due (e.g. 30, 45, 90)
  min_gpa?: number;
  gender?: string;
  ethnicity?: string;
  deadline?: string;
  sort_by?:
    | ""
    | "match_desc"
    | "match_asc"
    | "deadline"
    | "deadline_asc"
    | "deadline_desc"
    | "amount"
    | "amount_desc"
    | "amount_asc"
    | "gpa"
    | "gpa_asc"
    | "gpa_desc"
    | "title"
    | "title_asc"
    | "title_desc";
  max_results?: number;
  locationScope?: "all" | "nationwide" | "local" | "state";
  deadlineWindow?: "all" | "urgent" | "60days" | "rolling" | string;
  provider?: string;
  level?: string;
  aiFilterEnabled?: boolean;
}

export interface StudentProfile {
  id: string;
  name: string;
  school_year: string;
  state: string;
  field?: string; // Optional (now configured in filters)
  gpa: number; // cumulative unweighted GPA (scale 0.0 - 4.0)
  unweighted_gpa?: number; // unweighted GPA (4.0 scale)
  weighted_gpa?: number; // weighted GPA (5.0 scale)
  sat_score?: number; // 400 - 1600 or undefined if test optional
  act_score?: number; // 1 - 36 or undefined if test optional
  test_optional?: boolean; // student applied or is applying test-optional
  class_rank?: string; // e.g. "top_5", "top_10", "top_25", "top_50", "not_ranked"
  volunteer_hours?: number; // Community service & volunteer hours completed
  work_hours?: number; // Part-time work hours per week
  extracurricular?: string; // Legacy fallback
  citizenship?: string; // citizenship / residency status
  locationPreference?: "all" | "local" | "nationwide";
  need_based?: boolean; // eligible for Pell / financial aid
  first_gen?: boolean; // first in family to attend college
  gender?: string;
  ethnicity?: string;
  min_amount?: number; // Minimum scholarship dollar amount selected in quiz or profile
  target_amount?: string;
  deadline?: string;
  omittedFields: string[]; // e.g. ['sat_score', 'unweighted_gpa', 'volunteer_hours', 'state', 'amount']
  createdAt: number;
}

export type ApplicationStatus =
  | "bookmarked"
  | "in_progress"
  | "submitted"
  | "awarded"
  | "declined"
  | "interested";

export interface SavedScholarshipRecord {
  scholarshipId: string;
  profileId: string;
  status: ApplicationStatus;
  notes: string;
  savedAt: number;
  awardReceived?: number;
  savedItem?: Scholarship;
  checklist: {
    essayCompleted: boolean;
    recommendationLetters: boolean;
    transcriptSubmitted: boolean;
    portalSubmitted: boolean;
  };
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string; // e.g., "scholarships.com", "fastweb", "college_board"
  source: string; // Source platform
  amount: number;
  amountDisplay: string;
  amountRangeKey: "1000" | "1000-2500" | "2500-5000" | "5000-10000" | "10000-plus";
  deadline: string; // e.g. "2026-11-15"
  deadlineMonth: string; // e.g. "november"
  description: string;
  url: string; // Direct link to scholarship
  field_of_study: string; // Area of study or discipline (e.g. "Computer Science & IT", "All Fields")
  level: string; // Education level (e.g. "High School Senior", "Undergraduate")
  location: string; // Geographic location (e.g. "Nationwide", "Florida", "California")
  scraped_at: string; // ISO timestamp
  minimunGpa?: number; // Minimum GPA required (e.g. 3.0, 3.5)
  organization: string; // Sponsor organization name
  schoolYears: string[]; // e.g. ["high-school-senior", "high-school-junior"]
  states: string[]; // e.g. ["florida"] or ["all"]
  fields: string[]; // e.g. ["computer-science", "engineering"] or ["all"]
  gender?: "female" | "male" | "any";
  ethnicity?: string[]; // e.g. ["hispanic", "all"]
  gpaRequirement?: number; // minimum GPA alias
  renewable: boolean;
  needBased: boolean;
  meritBased: boolean;
  requirements: string[];
  essayPrompt?: string;
  applicationUrl: string;
  sponsorType: "Federal" | "State" | "Corporate" | "Foundation" | "Civic";
  sourceUrl?: string;
}

export const US_STATES = [
  { value: "alabama", label: "Alabama" },
  { value: "alaska", label: "Alaska" },
  { value: "arizona", label: "Arizona" },
  { value: "arkansas", label: "Arkansas" },
  { value: "california", label: "California" },
  { value: "colorado", label: "Colorado" },
  { value: "connecticut", label: "Connecticut" },
  { value: "delaware", label: "Delaware" },
  { value: "district-of-columbia", label: "District of Columbia" },
  { value: "florida", label: "Florida" },
  { value: "georgia", label: "Georgia" },
  { value: "hawaii", label: "Hawaii" },
  { value: "idaho", label: "Idaho" },
  { value: "illinois", label: "Illinois" },
  { value: "indiana", label: "Indiana" },
  { value: "iowa", label: "Iowa" },
  { value: "kansas", label: "Kansas" },
  { value: "kentucky", label: "Kentucky" },
  { value: "louisiana", label: "Louisiana" },
  { value: "maine", label: "Maine" },
  { value: "maryland", label: "Maryland" },
  { value: "massachusetts", label: "Massachusetts" },
  { value: "michigan", label: "Michigan" },
  { value: "minnesota", label: "Minnesota" },
  { value: "mississippi", label: "Mississippi" },
  { value: "missouri", label: "Missouri" },
  { value: "montana", label: "Montana" },
  { value: "nebraska", label: "Nebraska" },
  { value: "nevada", label: "Nevada" },
  { value: "new-hampshire", label: "New Hampshire" },
  { value: "new-jersey", label: "New Jersey" },
  { value: "new-mexico", label: "New Mexico" },
  { value: "new-york", label: "New York" },
  { value: "north-carolina", label: "North Carolina" },
  { value: "north-dakota", label: "North Dakota" },
  { value: "ohio", label: "Ohio" },
  { value: "oklahoma", label: "Oklahoma" },
  { value: "oregon", label: "Oregon" },
  { value: "pennsylvania", label: "Pennsylvania" },
  { value: "rhode-island", label: "Rhode Island" },
  { value: "south-carolina", label: "South Carolina" },
  { value: "south-dakota", label: "South Dakota" },
  { value: "tennessee", label: "Tennessee" },
  { value: "texas", label: "Texas" },
  { value: "utah", label: "Utah" },
  { value: "vermont", label: "Vermont" },
  { value: "virginia", label: "Virginia" },
  { value: "washington", label: "Washington" },
  { value: "west-virginia", label: "West Virginia" },
  { value: "wisconsin", label: "Wisconsin" },
  { value: "wyoming", label: "Wyoming" },
];

export const ACADEMIC_FIELDS = [
  { value: "accounting", label: "Accounting" },
  { value: "agriculture-agribusiness", label: "Agriculture & Agribusiness" },
  { value: "architecture", label: "Architecture" },
  { value: "art", label: "Art & Design" },
  { value: "biology", label: "Biology & Life Sciences" },
  { value: "business", label: "Business" },
  { value: "business-administration", label: "Business Administration" },
  { value: "chemical-engineering", label: "Chemical Engineering" },
  { value: "chemistry", label: "Chemistry" },
  { value: "civil-engineering", label: "Civil Engineering" },
  { value: "communications", label: "Communications & Media" },
  { value: "computer-science", label: "Computer Science & IT" },
  { value: "criminal-justice", label: "Criminal Justice" },
  { value: "education", label: "Education & Teaching" },
  { value: "electrical-engineering", label: "Electrical Engineering" },
  { value: "engineering", label: "Engineering (General / CTE)" },
  { value: "english", label: "English & Literature" },
  { value: "environmental-science", label: "Environmental Science" },
  { value: "finance", label: "Finance" },
  { value: "history", label: "History" },
  { value: "journalism", label: "Journalism" },
  { value: "law", label: "Law & Pre-Law" },
  { value: "mathematics", label: "Mathematics & Statistics" },
  { value: "mechanical-engineering", label: "Mechanical Engineering" },
  { value: "medicine", label: "Medicine & Pre-Med" },
  { value: "music", label: "Music & Performing Arts" },
  { value: "nursing", label: "Nursing & Allied Health" },
  { value: "physics", label: "Physics & Astronomy" },
  { value: "political-science", label: "Political Science & Government" },
  { value: "psychology", label: "Psychology" },
  { value: "public-health", label: "Public Health" },
  { value: "social-work", label: "Social Work & Human Services" },
];

export const SCHOOL_YEARS = [
  { value: "high-school-freshman", label: "High School Freshman (9th Grade)" },
  { value: "high-school-sophomore", label: "High School Sophomore (10th Grade)" },
  { value: "high-school-junior", label: "High School Junior (11th Grade)" },
  { value: "high-school-senior", label: "High School Senior (12th Grade)" },
  { value: "college-freshman", label: "College Freshman (Incoming)" },
  { value: "college-sophomore", label: "College Sophomore" },
  { value: "college-junior", label: "College Junior" },
  { value: "college-senior", label: "College Senior" },
  { value: "graduate-student", label: "Graduate Student" },
];

export const AWARD_RANGES = [
  { value: "1000", label: "Under $1,000", min: 0, max: 1000 },
  { value: "1000-2500", label: "$1,000 – $2,500", min: 1000, max: 2500 },
  { value: "2500-5000", label: "$2,500 – $5,000", min: 2500, max: 5000 },
  { value: "5000-10000", label: "$5,000 – $10,000", min: 5000, max: 10000 },
  { value: "10000-plus", label: "$10,000 & Above", min: 10000, max: 100000 },
];

export const MIN_AMOUNT_PRESETS = [
  { value: 0, label: "Any Amount ($0+)" },
  { value: 500, label: "$500+ Minimum" },
  { value: 1000, label: "$1,000+ Minimum" },
  { value: 2500, label: "$2,500+ Minimum" },
  { value: 5000, label: "$5,000+ Minimum" },
  { value: 10000, label: "$10,000+ Minimum" },
];

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export const ETHNICITIES = [
  { value: "african-american", label: "African American / Black" },
  { value: "hispanic", label: "Hispanic / Latino" },
  { value: "asian", label: "Asian / Pacific Islander" },
  { value: "native-american", label: "Native American / Indigenous" },
  { value: "caucasian", label: "Caucasian / White" },
];

export const DEADLINE_MONTHS = [
  { value: "january", label: "January" },
  { value: "february", label: "February" },
  { value: "march", label: "March" },
  { value: "april", label: "April" },
  { value: "may", label: "May" },
  { value: "june", label: "June" },
  { value: "july", label: "July" },
  { value: "august", label: "August" },
  { value: "september", label: "September" },
  { value: "october", label: "October" },
  { value: "november", label: "November" },
  { value: "december", label: "December" },
];

export const DEADLINE_MONTH_ORDER: Record<string, number> = {
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

export const SORT_OPTIONS = [
  { value: "", label: "Best Match: Highest to Lowest (Default)" },
  { value: "match_asc", label: "Best Match: Lowest to Highest" },
  { value: "deadline_asc", label: "Due Date: Closest to Farthest (Soonest)" },
  { value: "deadline_desc", label: "Due Date: Farthest to Closest (Latest)" },
  { value: "amount_desc", label: "Award Amount: Highest to Lowest ($)" },
  { value: "amount_asc", label: "Award Amount: Lowest to Highest ($)" },
  { value: "gpa_asc", label: "GPA Requirement: Lowest to Highest" },
  { value: "gpa_desc", label: "GPA Requirement: Highest to Lowest" },
  { value: "title_asc", label: "Scholarship Title: A to Z" },
  { value: "title_desc", label: "Scholarship Title: Z to A" },
];

export const PROVIDERS = [
  { value: "all", label: "All Providers & Platforms" },
  { value: "scholarships.com", label: "Scholarships.com" },
  { value: "fastweb", label: "Fastweb" },
  { value: "college_board", label: "College Board BigFuture" },
];

export const EDUCATION_LEVELS = [
  { value: "all", label: "All Education Levels" },
  { value: "high-school", label: "High School (9th - 12th)" },
  { value: "high-school-senior", label: "High School Senior" },
  { value: "undergraduate", label: "Undergraduate / College" },
  { value: "graduate", label: "Graduate Student" },
];

export const GPA_PRESETS = [
  { value: 0, label: "Any GPA / No Minimum" },
  { value: 2.5, label: "2.5+ Minimum" },
  { value: 3.0, label: "3.0+ Minimum" },
  { value: 3.5, label: "3.5+ Minimum" },
  { value: 3.8, label: "3.8+ Minimum" },
];

export const CLASS_RANKS = [
  { value: "top_5", label: "Top 5% of Class" },
  { value: "top_10", label: "Top 10% of Class" },
  { value: "top_25", label: "Top 25% of Class" },
  { value: "top_50", label: "Top 50% of Class" },
  { value: "not_ranked", label: "School Does Not Rank / Not Sure" },
];

export const CITIZENSHIP_OPTIONS = [
  { value: "us_citizen", label: "U.S. Citizen" },
  { value: "permanent_resident", label: "U.S. Permanent Resident (Green Card)" },
  { value: "daca_undocumented", label: "DACA / Undocumented Student" },
  { value: "international", label: "International Student / Visa Holder" },
];

export const EXTRACURRICULAR_OPTIONS = [
  { value: "community_service", label: "Community Service & Volunteering" },
  { value: "stem_robotics", label: "STEM, Robotics & Coding" },
  { value: "athletics_sports", label: "Athletics & Varsity Sports" },
  { value: "arts_music", label: "Visual Arts, Theater & Music" },
  { value: "leadership_gov", label: "Student Government, Debate & Leadership" },
  { value: "work_family", label: "Part-time Job & Family Responsibilities" },
  { value: "entrepreneurship", label: "Entrepreneurship & Business Clubs (DECA/FBLA)" },
];


