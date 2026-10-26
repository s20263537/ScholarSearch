import React, { useState } from "react";
import {
  User,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  GraduationCap,
  BookOpen,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Award,
  FileCheck,
  Globe,
  RotateCcw,
  Check,
  HeartHandshake,
  Briefcase,
} from "lucide-react";
import {
  Scholarship,
  StudentProfile,
  US_STATES,
  ACADEMIC_FIELDS,
  SCHOOL_YEARS,
  AWARD_RANGES,
  MIN_AMOUNT_PRESETS,
  GENDERS,
  ETHNICITIES,
  CLASS_RANKS,
  CITIZENSHIP_OPTIONS,
  EXTRACURRICULAR_OPTIONS,
} from "../types/scholarship";
import {
  filterAndScoreScholarships,
  discoverAiScholarshipsFromGemini,
  resolveProfileMinAmount,
} from "../services/apifyService";
import { SCHOLARSHIPS_DATA } from "../data/scholarshipsData";

interface ProfileManagerProps {
  profiles: StudentProfile[];
  activeProfileId: string;
  profileDiscoveredMap?: Record<string, Scholarship[]>;
  onAddProfileScholarships?: (profileId: string, newAwards: Scholarship[]) => number;
  onSelectProfile: (id: string) => void;
  onNavigateToFeed?: () => void;
  onUpdateProfile: (updated: StudentProfile) => void;
  onDeleteProfile: (id: string) => void;
  onOpenNewProfileQuiz: () => void;
  onResetAsNewUser?: () => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfileId,
  profileDiscoveredMap = {},
  onAddProfileScholarships,
  onSelectProfile,
  onNavigateToFeed,
  onUpdateProfile,
  onDeleteProfile,
  onOpenNewProfileQuiz,
  onResetAsNewUser,
}) => {
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [updatedNotice, setUpdatedNotice] = useState<string | null>(null);
  const [isSyncingProfileAi, setIsSyncingProfileAi] = useState<boolean>(false);

  if (!activeProfile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
        <p className="text-sm">No profiles found. Complete a quiz to start searching.</p>
        <button
          onClick={onOpenNewProfileQuiz}
          className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
        >
          Create Profile
        </button>
      </div>
    );
  }

  const syncAiForUpdatedProfile = async (updatedProfile: StudentProfile, isManualRequest = false) => {
    setIsSyncingProfileAi(true);
    try {
      const currentProfileAwards = profileDiscoveredMap[updatedProfile.id] || [];
      const currentFilteredCount = filterAndScoreScholarships(
        [...currentProfileAwards, ...SCHOLARSHIPS_DATA],
        updatedProfile,
        {}
      ).filteredCount;
      const existingTitles = Array.from(
        new Set([
          ...currentProfileAwards.map((s) => s.title),
          ...SCHOLARSHIPS_DATA.map((s) => s.title),
        ])
      );
      const nextBatchIndex = Math.floor(currentProfileAwards.length / 6) + 1;
      const aiRes = await discoverAiScholarshipsFromGemini(
        updatedProfile,
        {},
        existingTitles,
        nextBatchIndex,
        "",
        6
      );
      if (aiRes.success && Array.isArray(aiRes.items) && aiRes.items.length > 0 && onAddProfileScholarships) {
        const addedCount = onAddProfileScholarships(updatedProfile.id, aiRes.items);
        if (isManualRequest && addedCount > 0) {
          setUpdatedNotice(
            `AI added +${addedCount} brand-new eligible scholarships to ${updatedProfile.name}'s profile! Now showing ${currentFilteredCount + addedCount} eligible opportunities on your feed.`
          );
          setTimeout(() => setUpdatedNotice(null), 6000);
        }
      }
    } finally {
      setIsSyncingProfileAi(false);
    }
  };

  const notifyUpdate = (msg: string, _updatedProfile?: StudentProfile) => {
    setUpdatedNotice(msg);
    setTimeout(() => setUpdatedNotice(null), 5000);
  };

  const toggleOmit = (fieldKey: string) => {
    const currentOmitted = activeProfile.omittedFields || [];
    const isAlreadyOmitted = currentOmitted.includes(fieldKey);
    const newOmitted = isAlreadyOmitted
      ? currentOmitted.filter((k) => k !== fieldKey)
      : [...currentOmitted, fieldKey];

    const updated = {
      ...activeProfile,
      omittedFields: newOmitted,
    };
    onUpdateProfile(updated);
    notifyUpdate(
      isAlreadyOmitted
        ? `Unomitted ${fieldKey.replace(/_/g, " ")}. Restored to active feed.`
        : `Omitted ${fieldKey.replace(/_/g, " ")}. Feed updated with broadened search.`,
      updated
    );
  };

  const startEditing = (fieldKey: string, currentValue: string = "") => {
    setEditingField(fieldKey);
    setEditValue(currentValue);
  };

  const saveEdit = (fieldKey: string) => {
    let finalVal: any = editValue;
    if (fieldKey === "unweighted_gpa" || fieldKey === "gpa") {
      finalVal = parseFloat(editValue) || 3.5;
    } else if (fieldKey === "weighted_gpa") {
      finalVal = editValue ? parseFloat(editValue) : undefined;
    } else if (fieldKey === "sat_score" || fieldKey === "act_score") {
      finalVal = editValue ? parseInt(editValue, 10) : undefined;
    } else if (fieldKey === "volunteer_hours" || fieldKey === "work_hours") {
      finalVal = editValue ? parseInt(editValue, 10) : undefined;
    } else if (fieldKey === "min_amount") {
      const parsedAmt = parseInt(editValue.replace(/[^0-9]/g, ""), 10);
      finalVal = !isNaN(parsedAmt) && parsedAmt >= 0 ? parsedAmt : 0;
    } else if (fieldKey === "need_based" || fieldKey === "first_gen" || fieldKey === "test_optional") {
      finalVal = editValue === "true";
    }

    const updated = {
      ...activeProfile,
      [fieldKey]: finalVal,
      ...(fieldKey === "unweighted_gpa" ? { gpa: finalVal } : {}),
      ...(fieldKey === "min_amount" ? { target_amount: String(finalVal) } : {}),
    };
    onUpdateProfile(updated);
    setEditingField(null);
    notifyUpdate(
      `Updated ${fieldKey.replace(/_/g, " ")}! Eligible scholarships refreshed.`,
      updated
    );
  };

  const isOmitted = (fieldKey: string) => {
    return activeProfile.omittedFields?.includes(fieldKey) || false;
  };

  const getLabelFor = (key: string, val?: any) => {
    if (val === undefined || val === null || val === "") return "Not specified / Any";
    if (key === "state") {
      const match = US_STATES.find((s) => s.value === val);
      return match ? match.label : val;
    }
    if (key === "field") {
      const match = ACADEMIC_FIELDS.find((f) => f.value === val);
      return match ? match.label : val;
    }
    if (key === "school_year") {
      const match = SCHOOL_YEARS.find((y) => y.value === val);
      return match ? match.label : val;
    }
    if (key === "target_amount") {
      const match = AWARD_RANGES.find((a) => a.value === val);
      return match ? match.label : val;
    }
    if (key === "class_rank") {
      const match = CLASS_RANKS.find((r) => r.value === val);
      return match ? match.label : val;
    }
    if (key === "citizenship") {
      const match = CITIZENSHIP_OPTIONS.find((c) => c.value === val);
      return match ? match.label : val;
    }
    if (key === "volunteer_hours") {
      return `${val} hours completed`;
    }
    if (key === "work_hours") {
      return `${val} hrs/week`;
    }
    if (key === "extracurricular") {
      const match = EXTRACURRICULAR_OPTIONS.find((e) => e.value === val);
      return match ? match.label : val;
    }
    if (key === "gender") {
      const match = GENDERS.find((g) => g.value === val);
      return match ? match.label : val;
    }
    if (key === "ethnicity") {
      const match = ETHNICITIES.find((e) => e.value === val);
      return match ? match.label : val;
    }
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Update Banner */}
      {updatedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{updatedNotice}</span>
          </div>
          <button
            onClick={() => {
              if (onNavigateToFeed) {
                onNavigateToFeed();
              } else {
                onSelectProfile(activeProfile.id);
              }
            }}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>View Updated Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Section: Profile Switcher & Add New Profile */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Student Profiles
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Switch between saved student profiles to view tailored scholarship feeds or take a new quiz.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onResetAsNewUser && (
              <button
                onClick={onResetAsNewUser}
                className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                title="Wipe current profile data and start onboarding from scratch"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Start as New User (Reset)</span>
              </button>
            )}

            <button
              onClick={onOpenNewProfileQuiz}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Profile</span>
            </button>
          </div>
        </div>

        {/* Profile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const unweightedVal = p.unweighted_gpa ?? p.gpa ?? 3.5;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProfile(p.id);
                  notifyUpdate(`Switched active profile to ${p.name}. Feed updated.`);
                }}
                className={`cursor-pointer p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isActive
                    ? "bg-blue-50/40 border-blue-600 shadow-xs ring-1 ring-blue-500"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                      <User className="w-4 h-4 text-blue-600 shrink-0" />
                      {p.name}
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="truncate">
                      🎓 {getLabelFor("school_year", p.school_year)}
                    </p>
                    <p className="truncate">
                      📍 {getLabelFor("state", p.state)}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold text-[10px] rounded-md border border-blue-200">
                        GPA: {unweightedVal.toFixed(2)}
                      </span>
                      {p.weighted_gpa && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-md border border-slate-200">
                          W: {p.weighted_gpa.toFixed(2)}
                        </span>
                      )}
                      {p.sat_score && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-md border border-slate-200">
                          SAT: {p.sat_score}
                        </span>
                      )}
                      {p.volunteer_hours !== undefined && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200">
                          {p.volunteer_hours}h service
                        </span>
                      )}
                      {p.work_hours !== undefined && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200">
                          {p.work_hours}h/wk work
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-md border border-slate-200 capitalize">
                        {p.locationPreference === "local" ? "Local Only" : p.locationPreference === "nationwide" ? "Nationwide Only" : "All Scopes"}
                      </span>
                      {p.need_based && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded-md border border-emerald-200">
                          Pell
                        </span>
                      )}
                      {p.first_gen && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 text-[10px] font-semibold rounded-md border border-blue-200">
                          First-Gen
                        </span>
                      )}
                    </div>
                    {p.omittedFields?.length > 0 && (
                      <p className="text-[11px] text-amber-700 font-medium pt-1">
                        {p.omittedFields.length} criteria omitted
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400">
                    Added {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  {profiles.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProfile(p.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Profile Answers & Click to Omit / Unomit Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                Active Profile
              </span>
              <span className="text-sm font-bold text-slate-900">{activeProfile.name}</span>
              {isSyncingProfileAi && (
                <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  AI refreshing eligible matches...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Every change below immediately updates your eligible scholarships and re-ranks your feed.
            </p>
          </div>

          <button
            onClick={() => {
              if (onNavigateToFeed) {
                onNavigateToFeed();
              } else {
                onSelectProfile(activeProfile.id);
              }
            }}
            className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span>View Updated Scholarship Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Reactive Matched Scholarships Summary Bar */}
        {(() => {
          const profileAiAwards = profileDiscoveredMap[activeProfile.id] || [];
          const combinedForProfile = [...profileAiAwards, ...SCHOLARSHIPS_DATA];
          const liveMatchResult = filterAndScoreScholarships(combinedForProfile, activeProfile, {});
          const topMatches = liveMatchResult.scholarships.slice(0, 3);
          return (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {liveMatchResult.filteredCount} Eligible Scholarships Currently Matched to {activeProfile.name}
                  </span>
                  {profileAiAwards.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                      Includes +{profileAiAwards.length} AI-Discovered Saved to {activeProfile.name}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">Top Ranked Right Now:</span>
                  {topMatches.map((m, idx) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-white border border-blue-200 rounded-md font-medium text-slate-800"
                    >
                      #{idx + 1} {m.title} ({m.amountDisplay || `$${m.amount.toLocaleString()}`})
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => syncAiForUpdatedProfile(activeProfile, true)}
                disabled={isSyncingProfileAi}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSyncingProfileAi ? "animate-spin" : ""}`} />
                <span>
                  {isSyncingProfileAi
                    ? "Adding +6 Eligible Awards..."
                    : "AI Show More Scholarships (+6)"}
                </span>
              </button>
            </div>
          );
        })()}

        {/* Answers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Unweighted GPA (Blue/neutral styling) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("unweighted_gpa")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Unweighted GPA (4.0 Scale)
                </span>
              </div>
              <button
                onClick={() => toggleOmit("unweighted_gpa")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("unweighted_gpa")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("unweighted_gpa") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "unweighted_gpa" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="4.0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => saveEdit("unweighted_gpa")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-bold ${
                      isOmitted("unweighted_gpa") ? "text-slate-400 line-through" : "text-blue-700"
                    }`}
                  >
                    {(activeProfile.unweighted_gpa ?? activeProfile.gpa ?? 3.5).toFixed(2)} / 4.0
                  </span>
                  <button
                    onClick={() =>
                      startEditing(
                        "unweighted_gpa",
                        String(activeProfile.unweighted_gpa ?? activeProfile.gpa ?? 3.5)
                      )
                    }
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Weighted GPA (5.0 Scale) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("weighted_gpa")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Weighted GPA (5.0 Scale)
                </span>
              </div>
              <button
                onClick={() => toggleOmit("weighted_gpa")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("weighted_gpa")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("weighted_gpa") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "weighted_gpa" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="5.0"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Enter weighted GPA (e.g. 4.15)"
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => saveEdit("weighted_gpa")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : activeProfile.weighted_gpa ? (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("weighted_gpa") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {`${activeProfile.weighted_gpa.toFixed(2)} / 5.0 (AP/Honors)`}
                  </span>
                  <button
                    onClick={() =>
                      startEditing("weighted_gpa", String(activeProfile.weighted_gpa))
                    }
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="5.0"
                    placeholder="Enter weighted GPA (e.g. 4.15) / 5.0"
                    onFocus={() => startEditing("weighted_gpa", "")}
                    onChange={(e) => startEditing("weighted_gpa", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                  />
                  <button
                    onClick={() => startEditing("weighted_gpa", "")}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg shrink-0"
                  >
                    Enter
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. SAT Score */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("sat_score")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  SAT Total Score
                </span>
              </div>
              <button
                onClick={() => toggleOmit("sat_score")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("sat_score")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("sat_score") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "sat_score" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="10"
                    min="400"
                    max="1600"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g. 1350"
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => saveEdit("sat_score")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("sat_score") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {activeProfile.sat_score ? `${activeProfile.sat_score} pts` : "Test Optional / None"}
                  </span>
                  <button
                    onClick={() =>
                      startEditing("sat_score", activeProfile.sat_score ? String(activeProfile.sat_score) : "")
                    }
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. ACT Score */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("act_score")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  ACT Composite Score
                </span>
              </div>
              <button
                onClick={() => toggleOmit("act_score")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("act_score")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("act_score") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "act_score" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="36"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => saveEdit("act_score")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("act_score") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {activeProfile.act_score ? `${activeProfile.act_score} Composite` : "Test Optional / None"}
                  </span>
                  <button
                    onClick={() =>
                      startEditing("act_score", activeProfile.act_score ? String(activeProfile.act_score) : "")
                    }
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5. School Year */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("school_year")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  School Year / Grade
                </span>
              </div>
              <button
                onClick={() => toggleOmit("school_year")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("school_year")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("school_year") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "school_year" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs text-slate-800 outline-none"
                  >
                    {SCHOOL_YEARS.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => saveEdit("school_year")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("school_year") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {getLabelFor("school_year", activeProfile.school_year)}
                  </span>
                  <button
                    onClick={() => startEditing("school_year", activeProfile.school_year)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 6. Residence State */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("state")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Residence State
                </span>
              </div>
              <button
                onClick={() => toggleOmit("state")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("state")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("state") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "state" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs text-slate-800 outline-none"
                  >
                    {US_STATES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => saveEdit("state")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold capitalize ${
                      isOmitted("state") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {getLabelFor("state", activeProfile.state)}
                  </span>
                  <button
                    onClick={() => startEditing("state", activeProfile.state)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 7. Geographic Scope Preference */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("scope_preference")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Geographic Scope Preference
                </span>
              </div>
              <button
                onClick={() => toggleOmit("scope_preference")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("scope_preference")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("scope_preference") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "scope_preference" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs text-slate-800 outline-none"
                  >
                    <option value="all">All Opportunities (Nationwide + Local)</option>
                    <option value="local">Local State Awards Only</option>
                    <option value="nationwide">Nationwide Awards Only</option>
                  </select>
                  <button
                    onClick={() => saveEdit("scope_preference")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold capitalize ${
                      isOmitted("scope_preference") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {activeProfile.locationPreference === "local"
                      ? `Local (${getLabelFor("state", activeProfile.state)} Only)`
                      : activeProfile.locationPreference === "nationwide"
                      ? "Nationwide Only"
                      : "All Opportunities (Nationwide + Local)"}
                  </span>
                  <button
                    onClick={() => startEditing("scope_preference", activeProfile.locationPreference || "all")}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 9. Pell / Demonstrated Need Status */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("need_based")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Pell Grant / Financial Need
                </span>
              </div>
              <button
                onClick={() => toggleOmit("need_based")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("need_based")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("need_based") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${
                  isOmitted("need_based") ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {activeProfile.need_based ? "Demonstrated Need / Pell Eligible" : "Not applying for need-based grants"}
              </span>
              <button
                onClick={() => {
                  const updated = {
                    ...activeProfile,
                    need_based: !activeProfile.need_based,
                  };
                  onUpdateProfile(updated);
                  notifyUpdate("Updated Financial Need status! Feed refreshed.", updated);
                }}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                Toggle
              </button>
            </div>
          </div>

          {/* 10. First-Generation Student */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("first_gen")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  First-Generation College Student
                </span>
              </div>
              <button
                onClick={() => toggleOmit("first_gen")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("first_gen")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("first_gen") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${
                  isOmitted("first_gen") ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {activeProfile.first_gen ? "Yes, First in Family" : "Not First-Generation"}
              </span>
              <button
                onClick={() => {
                  const updated = {
                    ...activeProfile,
                    first_gen: !activeProfile.first_gen,
                  };
                  onUpdateProfile(updated);
                  notifyUpdate("Updated First-Generation status! Feed refreshed.", updated);
                }}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                Toggle
              </button>
            </div>
          </div>

          {/* 11a. Community Service & Volunteer Hours */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("volunteer_hours")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Volunteer & Community Service Hours
                </span>
              </div>
              <button
                onClick={() => toggleOmit("volunteer_hours")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("volunteer_hours")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("volunteer_hours") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "volunteer_hours" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => saveEdit("volunteer_hours")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("volunteer_hours") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {activeProfile.volunteer_hours !== undefined
                      ? `${activeProfile.volunteer_hours} volunteer hours completed`
                      : "0 hours"}
                  </span>
                  <button
                    onClick={() =>
                      startEditing(
                        "volunteer_hours",
                        activeProfile.volunteer_hours !== undefined
                          ? String(activeProfile.volunteer_hours)
                          : ""
                      )
                    }
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 11b. Part-Time Work Hours */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("work_hours")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Part-Time Work / Job Hours (per week)
                </span>
              </div>
              <button
                onClick={() => toggleOmit("work_hours")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("work_hours")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("work_hours") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "work_hours" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    onClick={() => saveEdit("work_hours")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("work_hours") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {activeProfile.work_hours !== undefined
                      ? `${activeProfile.work_hours} hrs/week employment`
                      : "0 hrs/week"}
                  </span>
                  <button
                    onClick={() =>
                      startEditing(
                        "work_hours",
                        activeProfile.work_hours !== undefined ? String(activeProfile.work_hours) : ""
                      )
                    }
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 12. Citizenship / Residency Status */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("citizenship")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Citizenship & Residency
                </span>
              </div>
              <button
                onClick={() => toggleOmit("citizenship")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("citizenship")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("citizenship") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "citizenship" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs text-slate-800 outline-none"
                  >
                    {CITIZENSHIP_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => saveEdit("citizenship")}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("citizenship") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {getLabelFor("citizenship", activeProfile.citizenship)}
                  </span>
                  <button
                    onClick={() => startEditing("citizenship", activeProfile.citizenship || "")}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 13. Minimum Award Amount ($) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isOmitted("amount")
                ? "bg-slate-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Minimum Award Amount ($ USD)
                </span>
              </div>
              <button
                onClick={() => toggleOmit("amount")}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isOmitted("amount")
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isOmitted("amount") ? "Click to unomit" : "Click to omit"}
              </button>
            </div>

            <div className="mt-2.5">
              {editingField === "min_amount" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {MIN_AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEditValue(String(preset.value))}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                          editValue === String(preset.value)
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="250"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Custom min $ (e.g. 2500)"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none"
                    />
                    <button
                      onClick={() => saveEdit("min_amount")}
                      className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isOmitted("amount") ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {(() => {
                      const resolvedMin = resolveProfileMinAmount({
                        ...activeProfile,
                        omittedFields: [],
                      });
                      return resolvedMin && resolvedMin > 0
                        ? `At least $${resolvedMin.toLocaleString()}+`
                        : "Any Amount ($0+)";
                    })()}
                  </span>
                  <button
                    onClick={() => {
                      const resolvedMin = resolveProfileMinAmount({
                        ...activeProfile,
                        omittedFields: [],
                      });
                      startEditing("min_amount", resolvedMin ? String(resolvedMin) : "0");
                    }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
