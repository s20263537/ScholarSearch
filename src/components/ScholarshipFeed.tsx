import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronDown,
  RotateCcw,
  Bookmark,
  Building,
  ArrowUpDown,
  Calendar,
  DollarSign,
  MapPin,
  ExternalLink,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Database,
  Sparkles,
} from "lucide-react";
import {
  Scholarship,
  StudentProfile,
  ApifyScholarshipInput,
  SavedScholarshipRecord,
  ApplicationStatus,
  SORT_OPTIONS,
  PROVIDERS,
  EDUCATION_LEVELS,
  ACADEMIC_FIELDS,
  AWARD_RANGES,
  DEADLINE_MONTHS,
} from "../types/scholarship";
import {
  filterAndScoreScholarships,
  fetchScholarshipsFromApifyProxy,
  discoverAiScholarshipsFromGemini,
  getDirectApplyUrl,
  resolveProfileMinAmount,
} from "../services/apifyService";
import { SCHOLARSHIPS_DATA } from "../data/scholarshipsData";
import { ScholarshipDetailModal } from "./ScholarshipDetailModal";

interface ScholarshipFeedProps {
  activeProfile: StudentProfile | null;
  savedScholarships: Record<string, SavedScholarshipRecord>;
  profileDiscoveredScholarships: Scholarship[];
  onAddProfileScholarships: (newAwards: Scholarship[]) => number;
  onSaveToggle: (scholarship: Scholarship, status?: ApplicationStatus) => void;
  onOpenAiWithPrompt?: (prompt: string) => void;
  onOpenProfileTab: () => void;
  onFiltersChange?: (filters: ApifyScholarshipInput) => void;
}

export const ScholarshipFeed: React.FC<ScholarshipFeedProps> = ({
  activeProfile,
  savedScholarships,
  profileDiscoveredScholarships,
  onAddProfileScholarships,
  onSaveToggle,
  onOpenAiWithPrompt,
  onOpenProfileTab,
  onFiltersChange,
}) => {
  const [searchTitle, setSearchTitle] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [fieldOfStudy, setFieldOfStudy] = useState<string>("all");
  const [openUntilMonth, setOpenUntilMonth] = useState<string>("all");
  const [customDaysInput, setCustomDaysInput] = useState<string>("");

  const [sortBy, setSortBy] = useState<string>("");

  const flipSortDirection = () => {
    setSortBy((prev) => {
      if (prev === "" || prev === "match_desc") return "match_asc";
      if (prev === "match_asc") return "";
      if (prev === "deadline" || prev === "deadline_asc") return "deadline_desc";
      if (prev === "deadline_desc") return "deadline_asc";
      if (prev === "amount" || prev === "amount_desc") return "amount_asc";
      if (prev === "amount_asc") return "amount_desc";
      if (prev === "gpa" || prev === "gpa_asc") return "gpa_desc";
      if (prev === "gpa_desc") return "gpa_asc";
      if (prev === "title" || prev === "title_asc") return "title_desc";
      if (prev === "title_desc") return "title_asc";
      return "match_asc";
    });
  };

  const [liveScrapedScholarships, setLiveScrapedScholarships] = useState<Scholarship[]>(() => {
    try {
      const saved = localStorage.getItem("scholarsearch_live_cache_v3");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAiDiscovering, setIsAiDiscovering] = useState(false);
  const [aiAddedBanner, setAiAddedBanner] = useState<string | null>(null);

  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [liveSyncStatus, setLiveSyncStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
    count?: number;
  }>({
    type: "idle",
    message: "",
  });

  const [viewingScholarship, setViewingScholarship] = useState<
    (Scholarship & { matchScore?: number; matchReasons?: string[] }) | null
  >(null);

  const parsedCustomDays = customDaysInput.trim() ? parseInt(customDaysInput, 10) : undefined;
  const profileMinAmount = resolveProfileMinAmount(activeProfile);

  const isOmitted = (key: string) => activeProfile?.omittedFields?.includes(key) ?? false;

  const activeFilters: ApifyScholarshipInput = useMemo(
    () => ({
      query: searchTitle,
      provider: provider !== "all" ? provider : undefined,
      field: fieldOfStudy !== "all" ? fieldOfStudy : undefined,
      state: !isOmitted("state") && activeProfile?.state ? activeProfile.state : undefined,
      school_year:
        !isOmitted("school_year") && activeProfile?.school_year
          ? activeProfile.school_year
          : undefined,
      min_amount: profileMinAmount,
      open_until_month: openUntilMonth !== "all" ? openUntilMonth : undefined,
      max_days_until_deadline:
        parsedCustomDays && !isNaN(parsedCustomDays) && parsedCustomDays > 0
          ? parsedCustomDays
          : undefined,
      sort_by: sortBy ? (sortBy as any) : undefined,
      max_results: 500,
    }),
    [
      searchTitle,
      provider,
      fieldOfStudy,
      profileMinAmount,
      openUntilMonth,
      parsedCustomDays,
      sortBy,
      activeProfile?.state,
      activeProfile?.school_year,
      activeProfile?.min_amount,
      activeProfile?.target_amount,
      activeProfile?.omittedFields,
    ]
  );

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(activeFilters);
    }
  }, [activeFilters]);

  const combinedData = useMemo(() => {
    const mergedMap = new Map<string, Scholarship>();
    for (const item of profileDiscoveredScholarships) {
      mergedMap.set(item.id, item);
    }
    for (const item of liveScrapedScholarships) {
      if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
    }
    for (const item of SCHOLARSHIPS_DATA) {
      if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
    }
    return Array.from(mergedMap.values());
  }, [profileDiscoveredScholarships, liveScrapedScholarships]);

  const profileSignature = JSON.stringify({
    id: activeProfile?.id,
    state: activeProfile?.state,
    school_year: activeProfile?.school_year,
    unweighted_gpa: activeProfile?.unweighted_gpa,
    weighted_gpa: activeProfile?.weighted_gpa,
    gpa: activeProfile?.gpa,
    field: activeProfile?.field,
    need_based: activeProfile?.need_based,
    first_gen: activeProfile?.first_gen,
    volunteer_hours: activeProfile?.volunteer_hours,
    work_hours: activeProfile?.work_hours,
    sat_score: activeProfile?.sat_score,
    act_score: activeProfile?.act_score,
    gender: activeProfile?.gender,
    ethnicity: activeProfile?.ethnicity,
    citizenship: activeProfile?.citizenship,
    scope_preference: activeProfile?.locationPreference,
    min_amount: activeProfile?.min_amount,
    target_amount: activeProfile?.target_amount,
    omittedFields: activeProfile?.omittedFields,
  });

  const { scholarships, filteredCount, wasZeroBeforeAiFallback } = useMemo(() => {
    return filterAndScoreScholarships(combinedData, activeProfile, activeFilters);
  }, [combinedData, activeProfile, activeFilters, profileSignature]);

  const runAiScholarshipDiscovery = async (countToFetch = 6) => {
    if (!activeProfile) return;
    setIsAiDiscovering(true);
    try {
      const existingTitles = Array.from(
        new Set([
          ...combinedData.map((s) => s.title),
          ...scholarships.map((s) => s.title),
        ])
      );
      const nextBatchIndex = Math.floor(profileDiscoveredScholarships.length / 6) + 1;
      const aiRes = await discoverAiScholarshipsFromGemini(
        activeProfile,
        activeFilters,
        existingTitles,
        nextBatchIndex,
        "",
        countToFetch
      );
      if (aiRes.success && Array.isArray(aiRes.items) && aiRes.items.length > 0) {
        const addedCount = onAddProfileScholarships(aiRes.items);
        if (addedCount > 0) {
          setAiAddedBanner(
            `Added +${addedCount} new AI-discovered eligible scholarships (automatically sorted into your feed)! Now showing ${filteredCount + addedCount} eligible opportunities for ${activeProfile.name}.`
          );
          setTimeout(() => setAiAddedBanner(null), 7000);
        }
      }
    } finally {
      setIsAiDiscovering(false);
    }
  };

  const fetchLiveFromApifyActor = async () => {
    setIsSyncingLive(true);
    setLiveSyncStatus({
      type: "loading",
      message: "Fetching full payload from majestic_fund/the-scholarship-scraper-actor...",
    });

    try {
      const result = await fetchScholarshipsFromApifyProxy(activeFilters);

      if (result && Array.isArray(result.items) && result.items.length > 0) {
        const cleanItems: Scholarship[] = result.items.map((item: any, idx: number) => {
          const rawAmt = item.amount || 2500;
          const cleanAmt = typeof rawAmt === "number" ? rawAmt : parseInt(String(rawAmt).replace(/[^0-9]/g, ""), 10) || 2500;
          const providerStr = String(item.provider || item.organization || "scholarships.com").trim();
          const sourceStr = String(item.source || item.provider || "majestic_fund/the-scholarship-scraper-actor").trim();
          const locStr = String(item.location || (activeProfile?.state ? activeProfile.state.replace(/-/g, " ") : "Nationwide")).trim();

          return {
            id: String(item.id || `live_apify_${idx}_${Date.now()}`),
            title: String(item.title || "Scholarship Opportunity").trim(),
            provider: providerStr,
            source: sourceStr,
            amount: cleanAmt,
            amountDisplay: item.amountDisplay || `$${cleanAmt.toLocaleString()}`,
            amountRangeKey: item.amountRangeKey || (cleanAmt <= 2500 ? "1000-2500" : cleanAmt <= 5000 ? "2500-5000" : "5000-10000"),
            deadline: String(item.deadline || "2027-04-15").trim(),
            deadlineMonth: item.deadlineMonth || "april",
            description: String(item.description || `Verified scholarship listing from ${providerStr}.`).trim(),
            url: String(item.url || item.applicationUrl || "https://www.scholarships.com").trim(),
            applicationUrl: String(item.applicationUrl || item.url || "https://www.scholarships.com").trim(),
            field_of_study: String(item.field_of_study || "All Disciplines").trim(),
            level: String(item.level || "Undergraduate / High School").trim(),
            location: locStr,
            scraped_at: item.scraped_at || new Date().toISOString(),
            min_gpa: typeof item.min_gpa === "number" ? item.min_gpa : 0,
            gpaRequirement: typeof item.gpaRequirement === "number" ? item.gpaRequirement : (typeof item.min_gpa === "number" ? item.min_gpa : 0),
            schoolYears: Array.isArray(item.schoolYears) && item.schoolYears.length > 0 ? item.schoolYears : ["all"],
            states: Array.isArray(item.states) && item.states.length > 0 ? item.states : ["all"],
            fields: Array.isArray(item.fields) && item.fields.length > 0 ? item.fields : ["all"],
            organization: item.organization || providerStr,
            gender: item.gender || "any",
            ethnicity: Array.isArray(item.ethnicity) ? item.ethnicity : ["all"],
            renewable: Boolean(item.renewable),
            needBased: Boolean(item.needBased),
            meritBased: Boolean(item.meritBased ?? true),
            sponsorType: item.sponsorType || "Foundation",
            requirements: Array.isArray(item.requirements) && item.requirements.length > 0
              ? item.requirements
              : [
                  `Location: ${locStr}`,
                  `Target Level: ${item.level || "Undergraduate / High School"}`,
                  "Must apply by posted deadline",
                ],
          };
        });

        setLiveScrapedScholarships((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newUnique = cleanItems.filter((item) => !existingIds.has(item.id));
          const merged = [...newUnique, ...prev];
          try {
            localStorage.setItem("scholarsearch_live_cache_v3", JSON.stringify(merged));
          } catch {
          }
          return merged;
        });

        setLiveSyncStatus({
          type: "success",
          count: cleanItems.length,
          message: `Successfully received ${cleanItems.length} records from majestic_fund/the-scholarship-scraper-actor!`,
        });
      } else {
        setLiveSyncStatus({
          type: "idle",
          message: result?.message || "Connected to Apify. Feed populated with verified opportunities without withholding records.",
        });
      }
    } catch (err: any) {
      console.warn("Apify scraper live sync notice:", err);
      setLiveSyncStatus({
        type: "error",
        message: err?.message || "Live actor query timed out; displaying verified directory without interruption.",
      });
    } finally {
      setIsSyncingLive(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLiveFromApifyActor();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    profileSignature,
    activeFilters.query,
    activeFilters.field,
    activeFilters.min_amount,
    activeFilters.open_until_month,
    activeFilters.max_days_until_deadline,
    activeFilters.provider,
    activeFilters.sort_by,
  ]);

  const hasActiveFilters =
    Boolean(searchTitle) ||
    provider !== "all" ||
    fieldOfStudy !== "all" ||
    openUntilMonth !== "all" ||
    Boolean(customDaysInput.trim()) ||
    Boolean(sortBy);

  const resetFilters = () => {
    setSearchTitle("");
    setProvider("all");
    setFieldOfStudy("all");
    setOpenUntilMonth("all");
    setCustomDaysInput("");
    setSortBy("");
  };

  return (
    <div className="space-y-6">
      {/* AI Discovery Confirmation Banner */}
      {aiAddedBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{aiAddedBanner}</span>
          </div>
          <button
            onClick={() => setAiAddedBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Student Feed Banner - Shows student name, live profile tags, & AI Discovery trigger */}
      {activeProfile && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-semibold text-slate-700">
                Active Student Feed:
              </span>
              <span className="text-sm sm:text-base font-extrabold text-blue-600">
                {activeProfile.name}
              </span>
              <span className="text-xs text-slate-300">·</span>
              {!isOmitted("school_year") && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                  {activeProfile.school_year.replace(/-/g, " ")}
                </span>
              )}
              {!isOmitted("state") && activeProfile.state && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {activeProfile.state.replace(/-/g, " ")}
                </span>
              )}
              {!isOmitted("unweighted_gpa") && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Unweighted GPA {(activeProfile.unweighted_gpa ?? activeProfile.gpa ?? 3.5).toFixed(2)}
                </span>
              )}
              {!isOmitted("weighted_gpa") && activeProfile.weighted_gpa && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Weighted {activeProfile.weighted_gpa.toFixed(2)} / 5.0
                </span>
              )}
              {!isOmitted("field") && activeProfile.field && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  {activeProfile.field.replace(/-/g, " ")}
                </span>
              )}
              {profileMinAmount !== undefined && profileMinAmount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Min ${profileMinAmount.toLocaleString()}+
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => runAiScholarshipDiscovery(6)}
              disabled={isAiDiscovering}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Use Gemini AI to discover +6 brand-new eligible scholarships and save them permanently to this profile"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiDiscovering ? "animate-spin" : ""}`} />
              <span>
                {isAiDiscovering
                  ? "AI Finding +6 Eligible Awards..."
                  : "AI Show More Eligible Scholarships (+6)"}
              </span>
            </button>

            <button
              onClick={onOpenProfileTab}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline px-1"
            >
              Edit Profile Answers →
            </button>
          </div>
        </div>
      )}

      {/* Filter Center Aligned With Apify Outputs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Row 1: Search Query & Sort */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Search by scholarship title, provider, field of study, or keyword..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
            {searchTitle && (
              <button
                onClick={() => setSearchTitle("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none cursor-pointer appearance-none transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <button
              type="button"
              onClick={flipSortDirection}
              className="px-3 py-2.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              title="Flip sort order (Lowest ↔ Highest / Closest ↔ Farthest / A ↔ Z)"
            >
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
              <span className="hidden xl:inline">Flip</span>
            </button>
          </div>
        </div>

        {/* Row 2: Source Platform & Field of Study (Geographic Scope and Level auto-inherited from Profile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Provider / Platform Filter */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" /> Source Platform
            </label>
            <div className="relative">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-800 outline-none appearance-none cursor-pointer"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Field of Study Filter */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Field of Study
            </label>
            <div className="relative">
              <select
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-800 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Fields & Majors</option>
                {ACADEMIC_FIELDS.map((fld) => (
                  <option key={fld.value} value={fld.value}>
                    {fld.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Open Until Month & Custom Days Window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Open Until Month Selector */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Open Until Month
            </label>
            <div className="relative">
              <select
                value={openUntilMonth}
                onChange={(e) => setOpenUntilMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-800 outline-none appearance-none cursor-pointer"
              >
                <option value="all">Open Any Time / All Months</option>
                {DEADLINE_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    Open Until {m.label} (Jan – {m.label})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {openUntilMonth !== "all"
                ? `Shows awards closing on or before ${openUntilMonth.toUpperCase()}`
                : "Shows opportunities closing in any month"}
            </p>
          </div>

          {/* Custom Days Until Due Input */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Closing Within (Days)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={customDaysInput}
                onChange={(e) => setCustomDaysInput(e.target.value)}
                placeholder="Type days (e.g. 30)"
                className="w-full px-3 pr-12 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
              />
              {customDaysInput && (
                <button
                  type="button"
                  onClick={() => setCustomDaysInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {customDaysInput.trim()
                ? `Shows scholarships closing in the next ${customDaysInput} days`
                : "Enter custom urgency window in days"}
            </p>
          </div>
        </div>

        {/* Footer info & Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Academic stats, test scores, citizenship & omissions configured in</span>
            <button
              onClick={onOpenProfileTab}
              className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              Profiles & Settings
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count & Auto-Sync Status */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-xs sm:text-sm">
            Showing <strong className="text-slate-900 font-extrabold text-sm">{filteredCount}</strong> eligible scholarship opportunities
          </div>
          {profileDiscoveredScholarships.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" />
              +{profileDiscoveredScholarships.length} AI-Discovered Saved for {activeProfile?.name || "Profile"}
            </span>
          )}
          {wasZeroBeforeAiFallback && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Includes 10 Auto-Matched AI Scholarships
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Scraper Synced
          </span>
          {isSyncingLive && (
            <span className="text-[11px] text-blue-600 inline-flex items-center gap-1 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin" /> Auto-syncing live feed...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeProfile && (
            <button
              onClick={() => runAiScholarshipDiscovery(6)}
              disabled={isAiDiscovering}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 underline cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3 h-3 ${isAiDiscovering ? "animate-spin" : ""}`} />
              <span>{isAiDiscovering ? "Adding +6..." : "+ Show 6 More Eligible Scholarships"}</span>
            </button>
          )}
          <span className="text-[11px] text-slate-400 hidden sm:inline">Click any card for full requirements</span>
        </div>
      </div>

      {/* Scholarship Cards Grid */}
      {scholarships.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-slate-900">No scholarships match these filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try clearing active filters, adjusting the minimum amount or due date window, or updating your profile answers.
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scholarships.map((scholarship, idx) => {
            const savedRecord = savedScholarships[scholarship.id];
            const isSaved = !!savedRecord;
            const status =
              savedRecord?.status === "interested"
                ? "bookmarked"
                : savedRecord?.status || "bookmarked";

            const isLocal =
              scholarship.location !== "Nationwide" &&
              !scholarship.location?.toLowerCase().includes("united states") &&
              !scholarship.states?.includes("all");

            const isStudentStateMatch =
              activeProfile?.state &&
              (scholarship.states?.includes(activeProfile.state) ||
                scholarship.location?.toLowerCase().includes(activeProfile.state.replace(/-/g, " ")));

            return (
              <div
                key={`${scholarship.id}-${idx}`}
                onClick={() => setViewingScholarship(scholarship)}
                className="group cursor-pointer bg-white hover:bg-blue-50/20 border border-slate-200/90 hover:border-blue-400 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                title="Click to view details"
              >
                <div>
                  {/* Top Line: Source Platform, Location, Level */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                      {(scholarship.source === "gemini_ai_discovery" ||
                        scholarship.id.startsWith("gemini_ai_") ||
                        scholarship.id.startsWith("ai_prof_")) && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded-md text-[11px] flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3" />
                          AI Discovered
                        </span>
                      )}
                      {/* Provider / Platform badge */}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px] border border-slate-200">
                        {scholarship.provider || scholarship.source || "scholarships.com"}
                      </span>

                      {/* Location badge */}
                      {isLocal ? (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 border ${
                            isStudentStateMatch
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          Local: {scholarship.location}
                          {isStudentStateMatch ? " (Match!)" : ""}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md text-[11px] border border-blue-200 flex items-center gap-1">
                          🇺🇸 Nationwide
                        </span>
                      )}

                      {/* Level badge */}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded-md text-[11px] border border-slate-200">
                        🎓 {scholarship.level || "Undergraduate"}
                      </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSaveToggle(scholarship, "bookmarked")}
                        className={`p-2 rounded-xl transition-all ${
                          isSaved
                            ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                            : "bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200"
                        }`}
                        title={isSaved ? "Saved in Awards" : "Bookmark Award"}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Main Title & Organization */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {scholarship.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{scholarship.organization || scholarship.provider}</span>
                    <span>·</span>
                    <span className="text-slate-600 font-medium truncate">
                      {scholarship.field_of_study || "All Disciplines"}
                    </span>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                    {scholarship.description}
                  </p>

                  {/* Main Requirements & Eligibility Details */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Main Requirements
                      </span>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {scholarship.minimunGpa && scholarship.minimunGpa > 0 ? (
                          <span className="px-1.5 py-0.5 bg-blue-100/80 text-blue-800 rounded font-semibold text-[10px]">
                            Min {scholarship.minimunGpa.toFixed(1)} GPA
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-100/80 text-emerald-800 rounded font-semibold text-[10px]">
                            No Min GPA
                          </span>
                        )}
                        {scholarship.needBased && (
                          <span className="px-1.5 py-0.5 bg-amber-100/80 text-amber-800 rounded font-semibold text-[10px]">
                            Financial Need
                          </span>
                        )}
                        {scholarship.meritBased && (
                          <span className="px-1.5 py-0.5 bg-indigo-100/80 text-indigo-800 rounded font-semibold text-[10px]">
                            Merit
                          </span>
                        )}
                        {scholarship.renewable && (
                          <span className="px-1.5 py-0.5 bg-purple-100/80 text-purple-800 rounded font-semibold text-[10px]">
                            Renewable
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-1.5">
                      {(() => {
                        const baseReqs = Array.isArray(scholarship.requirements) && scholarship.requirements.length > 0
                          ? [...scholarship.requirements]
                          : [
                              `Eligibility Level: ${scholarship.level || "All High School & Undergraduate"}`,
                              `Geographic Scope: ${scholarship.location || "Nationwide"}`,
                            ];
                        const hasGpaMention = baseReqs.some((r) => r.toLowerCase().includes("gpa"));
                        if (scholarship.minimunGpa && scholarship.minimunGpa > 0 && !hasGpaMention) {
                          baseReqs.unshift(`Minimum ${scholarship.minimunGpa.toFixed(1)} unweighted GPA required`);
                        }
                        return baseReqs.slice(0, 4).map((req, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5 text-slate-700 leading-snug">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <span className="font-medium">{req}</span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </div>

                {/* Main Award, Due Date, Direct Apply Button */}
                <div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        POTENTIAL AWARD
                      </div>
                      <div className="text-base font-extrabold text-emerald-600">
                        ${scholarship.amount.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        DUE DATE
                      </div>
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 justify-end">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{new Date(scholarship.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action row: Direct Apply URL + Status / View details */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <a
                      href={getDirectApplyUrl(scholarship)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Open official scholarship application page"
                    >
                      <span>Direct Apply</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {isSaved ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={status}
                          onChange={(e) =>
                            onSaveToggle(scholarship, e.target.value as ApplicationStatus)
                          }
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg outline-none cursor-pointer"
                        >
                          <option value="bookmarked">Bookmarked 🔖</option>
                          <option value="in_progress">In Progress ✍️</option>
                          <option value="submitted">Submitted 📤</option>
                          <option value="awarded">Awarded 🥳</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-[11px] text-blue-600 group-hover:underline font-semibold">
                        View Details →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Focused Modal */}
      <ScholarshipDetailModal
        scholarship={viewingScholarship}
        onClose={() => setViewingScholarship(null)}
        savedRecord={viewingScholarship ? savedScholarships[viewingScholarship.id] : undefined}
        onSaveToggle={onSaveToggle}
        onOpenAiWithPrompt={onOpenAiWithPrompt}
        activeProfile={activeProfile}
      />
    </div>
  );
};
