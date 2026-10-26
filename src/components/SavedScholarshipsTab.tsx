import React, { useState } from "react";
import {
  Bookmark,
  DollarSign,
  Trash2,
  ExternalLink,
  Building,
  CheckCircle2,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  Scholarship,
  SavedScholarshipRecord,
  ApplicationStatus,
} from "../types/scholarship";
import { SCHOLARSHIPS_DATA } from "../data/scholarshipsData";
import { getDirectApplyUrl } from "../services/apifyService";

interface SavedScholarshipsTabProps {
  savedScholarships: Record<string, SavedScholarshipRecord>;
  extraScholarships?: Scholarship[];
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onToggleChecklist: (
    id: string,
    key: "essayCompleted" | "recommendationLetters" | "transcriptSubmitted" | "portalSubmitted"
  ) => void;
  onRemove: (id: string) => void;
  onOpenFeedTab: () => void;
}

export const SavedScholarshipsTab: React.FC<SavedScholarshipsTabProps> = ({
  savedScholarships,
  extraScholarships = [],
  onUpdateStatus,
  onUpdateNotes,
  onToggleChecklist,
  onRemove,
  onOpenFeedTab,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const savedList = Object.values(savedScholarships).map((record) => {
    const scholarship =
      record.savedItem ||
      extraScholarships.find((s) => s.id === record.scholarshipId) ||
      SCHOLARSHIPS_DATA.find((s) => s.id === record.scholarshipId) || ({
        id: record.scholarshipId,
        title: "Scholarship Opportunity",
        organization: "Program Foundation",
        provider: "scholarships.com",
        source: "scholarships.com",
        amount: 2500,
        amountDisplay: "$2,500",
        amountRangeKey: "2500-5000",
        deadline: "2027-04-01",
        deadlineMonth: "april",
        applicationUrl: "https://www.scholarships.com",
        url: "https://www.scholarships.com",
        field_of_study: "All Disciplines",
        level: "High School / College",
        location: "Nationwide",
        scraped_at: "2026-10-25T12:00:00Z",
        minimunGpa: 0,
        description: "Scholarship saved to student portfolio.",
        sponsorType: "State",
        schoolYears: ["high-school-senior"],
        states: ["all"],
        fields: ["all"],
        renewable: false,
        needBased: false,
        meritBased: true,
        requirements: ["Submitted via portfolio"],
      } as Scholarship);

    const normalizedStatus: ApplicationStatus =
      record.status === "interested" ? "bookmarked" : record.status;

    return { record: { ...record, status: normalizedStatus }, scholarship };
  });

  const totalPotentialFunding = savedList.reduce(
    (sum, item) => sum + (item.scholarship.amount || 0),
    0
  );

  const bookmarkedCount = savedList.filter(
    (item) => item.record.status === "bookmarked"
  ).length;

  const inProgressCount = savedList.filter(
    (item) => item.record.status === "in_progress"
  ).length;

  const submittedCount = savedList.filter(
    (item) => item.record.status === "submitted"
  ).length;

  const awardedCount = savedList.filter(
    (item) => item.record.status === "awarded"
  ).length;

  const filteredList = savedList.filter((item) => {
    if (filterStatus === "all") return true;
    return item.record.status === filterStatus;
  });

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    onUpdateStatus(id, newStatus);
    if (newStatus === "awarded") {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#f59e0b", "#6366f1"],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Cards Grid (Exactly matching the uploaded screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: TOTAL POTENTIAL FUNDING */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TOTAL POTENTIAL FUNDING
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              ${totalPotentialFunding.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Across {savedList.length} bookmarked opportunities
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-extrabold text-2xl">
            $
          </div>
        </div>

        {/* Right Card: APPLICATION PIPELINE STATUS */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            APPLICATION PIPELINE STATUS
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Bookmarked */}
            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-center">
              <div className="text-xl font-bold text-purple-900">
                {bookmarkedCount}
              </div>
              <div className="text-xs text-purple-700 font-medium mt-0.5">
                Bookmarked
              </div>
            </div>

            {/* In Progress */}
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
              <div className="text-xl font-bold text-blue-900">
                {inProgressCount}
              </div>
              <div className="text-xs text-blue-700 font-medium mt-0.5">
                In Progress
              </div>
            </div>

            {/* Submitted */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center">
              <div className="text-xl font-bold text-indigo-900">
                {submittedCount}
              </div>
              <div className="text-xs text-indigo-700 font-medium mt-0.5">
                Submitted
              </div>
            </div>

            {/* Awarded */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
              <div className="text-xl font-bold text-emerald-900">
                {awardedCount}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-0.5">
                Awarded
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar (Matching the screenshot pill group) */}
      <div className="bg-slate-100/70 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            filterStatus === "all"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>All Saved</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-md font-bold">
            {savedList.length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus("bookmarked")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            filterStatus === "bookmarked"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Bookmarked</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-md font-bold">
            {bookmarkedCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus("in_progress")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            filterStatus === "in_progress"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>In Progress</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-md font-bold">
            {inProgressCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus("submitted")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            filterStatus === "submitted"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Submitted</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-md font-bold">
            {submittedCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus("awarded")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            filterStatus === "awarded"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Awarded</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-md font-bold">
            {awardedCount}
          </span>
        </button>
      </div>

      {/* Saved Scholarships List */}
      {savedList.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-sm">
          <Bookmark className="w-10 h-10 text-blue-600 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-slate-900">No saved scholarships yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse the Scholarship Feed and click the bookmark icon on any scholarship to track deadlines and total potential funding.
          </p>
          <button
            onClick={onOpenFeedTab}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Explore Scholarship Feed →
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
          <p className="text-sm">No scholarships found under this filter status.</p>
          <button
            onClick={() => setFilterStatus("all")}
            className="mt-2 text-xs text-blue-600 underline font-semibold"
          >
            Show all saved scholarships
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map(({ record, scholarship }) => {
            const checklist = record.checklist || {
              essayCompleted: false,
              recommendationLetters: false,
              transcriptSubmitted: false,
              portalSubmitted: false,
            };

            return (
              <div
                key={scholarship.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-3.5"
              >
                {/* Top line: Tagline and Due Date */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">
                      {scholarship.sponsorType} Grant Program
                    </span>
                    <span>·</span>
                    <span>Due {new Date(scholarship.deadline).toLocaleDateString()}</span>
                    <span>·</span>
                    <span className="text-blue-600 font-semibold">Priority Match</span>
                  </div>
                </div>

                {/* Main Content Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {scholarship.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{scholarship.organization}</span>
                    </p>
                  </div>

                  {/* Right side: POTENTIAL AWARD & STATUS STAGE */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start md:self-auto shrink-0">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        POTENTIAL AWARD
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-emerald-600">
                        {scholarship.amountDisplay || `$${scholarship.amount.toLocaleString()}`}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        STATUS STAGE
                      </div>
                      <select
                        value={record.status}
                        onChange={(e) =>
                          handleStatusChange(scholarship.id, e.target.value as ApplicationStatus)
                        }
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl outline-none cursor-pointer"
                      >
                        <option value="bookmarked">Bookmarked 🔖</option>
                        <option value="in_progress">In Progress ✍️</option>
                        <option value="submitted">Submitted 📤</option>
                        <option value="awarded">Awarded 🥳</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 pt-3">
                      <a
                        href={getDirectApplyUrl(scholarship)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 rounded-xl transition-colors"
                        title="Open official scholarship application page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => onRemove(scholarship.id)}
                        className="p-2 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-colors"
                        title="Delete from saved awards"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checklist Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Milestones:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.essayCompleted}
                      onChange={() => onToggleChecklist(scholarship.id, "essayCompleted")}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>Essay Drafted</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.recommendationLetters}
                      onChange={() =>
                        onToggleChecklist(scholarship.id, "recommendationLetters")
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>Letters of Rec</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.transcriptSubmitted}
                      onChange={() =>
                        onToggleChecklist(scholarship.id, "transcriptSubmitted")
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>Transcript Sent</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
