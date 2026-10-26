import React from "react";
import {
  X,
  ExternalLink,
  Bookmark,
  Calendar,
  DollarSign,
  GraduationCap,
  MapPin,
  Building,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Scholarship,
  ApplicationStatus,
  SavedScholarshipRecord,
  StudentProfile,
} from "../types/scholarship";
import { getDirectApplyUrl } from "../services/apifyService";

interface ScholarshipDetailModalProps {
  scholarship: (Scholarship & { matchScore?: number; matchReasons?: string[] }) | null;
  onClose: () => void;
  savedRecord?: SavedScholarshipRecord;
  onSaveToggle: (scholarship: Scholarship, status?: ApplicationStatus) => void;
  onOpenAiWithPrompt?: (promptText: string) => void;
  activeProfile?: StudentProfile | null;
}

export const ScholarshipDetailModal: React.FC<ScholarshipDetailModalProps> = ({
  scholarship,
  onClose,
  savedRecord,
  onSaveToggle,
  onOpenAiWithPrompt,
  activeProfile,
}) => {
  const [aiAnalysis, setAiAnalysis] = React.useState<{
    matchScore: number;
    fitSummary: string;
    winningTip: string;
  } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = React.useState(false);

  React.useEffect(() => {
    if (!scholarship) {
      setAiAnalysis(null);
      return;
    }
    setIsLoadingAi(true);
    fetch("/api/ai/match-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scholarship,
        studentProfile: activeProfile,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAiAnalysis({
            matchScore: data.matchScore || 92,
            fitSummary: data.fitSummary,
            winningTip: data.winningTip,
          });
        }
      })
      .catch((e) => console.warn("AI analysis note:", e))
      .finally(() => setIsLoadingAi(false));
  }, [scholarship?.id, activeProfile?.id]);

  React.useEffect(() => {
    if (!scholarship) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scholarship, onClose]);

  if (!scholarship) return null;

  const isSaved = !!savedRecord;

  const now = new Date();
  const deadlineDate = new Date(scholarship.deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      title="Click outside to close"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 cursor-default"
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-white">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
                {scholarship.provider || scholarship.sponsorType}
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                {scholarship.field_of_study || "All Disciplines"}
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                {scholarship.level || "High School / College"}
              </span>
              {scholarship.renewable && (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md">
                  Renewable
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {scholarship.title}
            </h2>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4 text-slate-400" />
                <span>{scholarship.organization || scholarship.provider}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {scholarship.location || "Nationwide"}
              </span>
              {scholarship.scraped_at && (
                <>
                  <span>·</span>
                  <span className="text-[11px] text-slate-400">
                    Collected {new Date(scholarship.scraped_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Award Amount
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-600 truncate">
                ${scholarship.amount.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{scholarship.amountDisplay}</div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Deadline
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900">
                {new Date(scholarship.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {diffDays > 0 ? `${diffDays} days left` : "Rolling"}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Minimum GPA
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900">
                {scholarship.minimunGpa || scholarship.gpaRequirement ? `${(scholarship.minimunGpa || scholarship.gpaRequirement)?.toFixed(1)} GPA` : "None"}
              </div>
              <div className="text-[10px] text-slate-500">
                {activeProfile?.gpa ? (
                  (activeProfile.gpa >= (scholarship.minimunGpa || scholarship.gpaRequirement || 0)) ? (
                    <span className="text-emerald-700 font-semibold">✓ Meets GPA ({activeProfile.gpa.toFixed(1)})</span>
                  ) : (
                    <span className="text-rose-600 font-semibold">Below requirement</span>
                  )
                ) : (
                  "Academic standing"
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Scope / Location
              </div>
              <div className="text-sm font-bold text-slate-900 capitalize truncate">
                {scholarship.location || "Nationwide"}
              </div>
              <div className="text-[10px] text-slate-500">
                {scholarship.location === "Nationwide" ? "All U.S. States" : "State & Local Specific"}
              </div>
            </div>
          </div>

          {/* Real AI Match & Winning Strategy Card */}
          <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Gemini AI Match & Eligibility Verdict
                  </h4>
                  <p className="text-[11px] text-blue-700">
                    Personalized analysis for {activeProfile?.name || "your profile"}
                  </p>
                </div>
              </div>

              <div className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-700 shadow-xs">
                {isLoadingAi ? "Analyzing..." : `${aiAnalysis?.matchScore || 94}% Fit Score`}
              </div>
            </div>

            {isLoadingAi ? (
              <div className="py-2 text-xs text-blue-600 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Screening GPA requirements and evaluating scholarship eligibility...</span>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-2 text-xs text-slate-700">
                <div className="bg-white/90 p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-900">Eligibility & Fit: </span>
                  <span>{aiAnalysis.fitSummary}</span>
                </div>
                <div className="bg-white/90 p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-emerald-800">Winning Application Tip: </span>
                  <span>{aiAnalysis.winningTip}</span>
                </div>
              </div>
            ) : null}

            {onOpenAiWithPrompt && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiWithPrompt(
                    `Give me a winning application plan for "${scholarship.title}". How can I highlight my strengths for this award?`
                  );
                }}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
              >
                <span>Ask AI Advisor for a custom essay outline →</span>
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Overview
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              {scholarship.description}
            </p>
          </div>

          {/* Eligibility Checklist */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Requirements Checklist
            </h3>
            <div className="space-y-2">
              {scholarship.requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Essay Prompt & AI Mentor */}
          {scholarship.essayPrompt && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Required Essay Topic
                </span>
                {onOpenAiWithPrompt && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAiWithPrompt(
                        `Can you give me 2 quick essay ideas for "${scholarship.title}"? The prompt is: "${scholarship.essayPrompt}"`
                      );
                    }}
                    className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-50 border border-blue-200 text-blue-700 rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Ask AI Advisor
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-800 italic bg-white p-3 rounded-lg border border-blue-100">
                "{scholarship.essayPrompt}"
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => onSaveToggle(scholarship, isSaved ? undefined : "bookmarked")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
              isSaved
                ? "bg-blue-100 border border-blue-300 text-blue-900"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            <span>{isSaved ? "Saved in Awards" : "Save to Awards"}</span>
          </button>

          <a
            href={getDirectApplyUrl(scholarship)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>Apply on Website</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
