import React, { useState, useEffect, useMemo } from "react";
import {
  Compass,
  Bookmark,
  Calculator,
  User,
  Search,
  RotateCcw,
} from "lucide-react";
import {
  StudentProfile,
  SavedScholarshipRecord,
  Scholarship,
  ApplicationStatus,
  ApifyScholarshipInput,
} from "./types/scholarship";
import { OnboardingQuiz } from "./components/OnboardingQuiz";
import { ScholarshipFeed } from "./components/ScholarshipFeed";
import { SavedScholarshipsTab } from "./components/SavedScholarshipsTab";
import { FinancialAidCalculator } from "./components/FinancialAidCalculator";
import { ProfileManager } from "./components/ProfileManager";
import { AiChatbot } from "./components/AiChatbot";
import { filterAndScoreScholarships } from "./services/apifyService";
import { SCHOLARSHIPS_DATA } from "./data/scholarshipsData";

const PROFILES_STORAGE_KEY = "scholarsearch_profiles_v2";
const ACTIVE_PROFILE_KEY = "scholarsearch_active_profile_v2";
const SAVED_SCHOLARSHIPS_KEY = "scholarsearch_saved_v2";
const PROFILE_DISCOVERED_AWARDS_KEY = "scholarsearch_profile_awards_v4";

export default function App() {
  const [profiles, setProfiles] = useState<StudentProfile[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (!saved) return [];
      const parsed: StudentProfile[] = JSON.parse(saved);
      return parsed.map((p) => ({
        ...p,
        gpa: typeof p.gpa === "number" ? p.gpa : (p.unweighted_gpa || 3.5),
        unweighted_gpa: p.unweighted_gpa ?? (typeof p.gpa === "number" ? p.gpa : 3.5),
        scope_preference: p.locationPreference || "all",
        omittedFields: p.omittedFields || [],
      }));
    } catch {
      return [];
    }
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
    } catch {
      return "";
    }
  });

  const [profileDiscoveredMap, setProfileDiscoveredMap] = useState<
    Record<string, Scholarship[]>
  >(() => {
    try {
      const saved = localStorage.getItem(PROFILE_DISCOVERED_AWARDS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [savedScholarships, setSavedScholarships] = useState<
    Record<string, SavedScholarshipRecord>
  >(() => {
    try {
      const saved = localStorage.getItem(SAVED_SCHOLARSHIPS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState<
    "feed" | "calculator" | "saved" | "profiles"
  >("feed");

  const [showQuiz, setShowQuiz] = useState<boolean>(false);

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatbotInitialPrompt, setChatbotInitialPrompt] = useState<string>("");
  const [activeFeedFilters, setActiveFeedFilters] = useState<ApifyScholarshipInput>({});
  const [chatResetCounter, setChatResetCounter] = useState<number>(0);

  useEffect(() => {
    if (profiles.length === 0) {
      setShowQuiz(true);
    } else if (!activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (err) {
      console.warn("Storage error saving profiles:", err);
    }
  }, [profiles]);

  useEffect(() => {
    try {
      if (activeProfileId) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
      }
    } catch (err) {
      console.warn("Storage error saving active profile ID:", err);
    }
  }, [activeProfileId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PROFILE_DISCOVERED_AWARDS_KEY,
        JSON.stringify(profileDiscoveredMap)
      );
    } catch (err) {
      console.warn("Storage error saving profile discovered awards:", err);
    }
  }, [profileDiscoveredMap]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_SCHOLARSHIPS_KEY, JSON.stringify(savedScholarships));
    } catch (err) {
      console.warn("Storage error saving saved scholarships:", err);
    }
  }, [savedScholarships]);

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;

  const activeProfileDiscoveredScholarships = useMemo(() => {
    if (!activeProfile) return [];
    return profileDiscoveredMap[activeProfile.id] || [];
  }, [activeProfile, profileDiscoveredMap]);

  const totalEligibleCountForActiveProfile = useMemo(() => {
    if (!activeProfile) return SCHOLARSHIPS_DATA.length;
    const combined = [...activeProfileDiscoveredScholarships, ...SCHOLARSHIPS_DATA];
    return filterAndScoreScholarships(combined, activeProfile, activeFeedFilters).filteredCount;
  }, [activeProfile, activeProfileDiscoveredScholarships, activeFeedFilters]);

  const activeProfileSavedScholarships = useMemo(() => {
    const currentProfId = activeProfile?.id || "";
    const result: Record<string, SavedScholarshipRecord> = {};
    if (!currentProfId) return result;

    const isPrimaryProfile = profiles[0]?.id === currentProfId;
    for (const record of Object.values(savedScholarships)) {
      if (
        record.profileId === currentProfId ||
        (!record.profileId && isPrimaryProfile)
      ) {
        result[record.scholarshipId] = record;
      }
    }
    return result;
  }, [savedScholarships, activeProfile?.id, profiles]);

  const handleAddProfileScholarships = (
    profileId: string,
    newAwards: Scholarship[]
  ): number => {
    if (!profileId || !Array.isArray(newAwards) || newAwards.length === 0) return 0;

    const currentForProfile = profileDiscoveredMap[profileId] || [];
    const existingIds = new Set(currentForProfile.map((s) => s.id));
    const existingTitles = new Set(
      currentForProfile.map((s) => s.title.toLowerCase().trim())
    );

    const uniqueToAdd: Scholarship[] = [];
    for (let idx = 0; idx < newAwards.length; idx++) {
      const item = newAwards[idx];
      let finalId = item.id || `gemini_ai_${profileId}_${Date.now()}_${idx}`;
      if (existingIds.has(finalId)) {
        finalId = `${finalId}_${Date.now()}_${idx}`;
      }

      let finalTitle = (
        item.title ||
        `AI Matched Scholarship #${currentForProfile.length + uniqueToAdd.length + 1}`
      ).trim();

      let editionCounter = 1;
      while (existingTitles.has(finalTitle.toLowerCase())) {
        finalTitle = `${item.title} (Scholar Award #${
          currentForProfile.length + uniqueToAdd.length + editionCounter
        })`;
        editionCounter++;
      }

      existingIds.add(finalId);
      existingTitles.add(finalTitle.toLowerCase());
      uniqueToAdd.push({
        ...item,
        id: finalId,
        title: finalTitle,
        source: item.source || "gemini_ai_discovery",
      });
    }

    if (uniqueToAdd.length === 0) return 0;

    setProfileDiscoveredMap((prev) => {
      const prevList = prev[profileId] || [];
      const updatedList = [...uniqueToAdd, ...prevList];
      const nextMap = {
        ...prev,
        [profileId]: updatedList,
      };
      try {
        localStorage.setItem(
          PROFILE_DISCOVERED_AWARDS_KEY,
          JSON.stringify(nextMap)
        );
      } catch {
      }
      return nextMap;
    });

    return uniqueToAdd.length;
  };

  const handleQuizComplete = (newProfile: StudentProfile) => {
    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    setShowQuiz(false);
    setActiveTab("feed");
  };

  const handleUpdateProfile = (updated: StudentProfile) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleDeleteProfile = (id: string) => {
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    setProfileDiscoveredMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setSavedScholarships((prev) => {
      const copy: Record<string, SavedScholarshipRecord> = {};
      for (const [k, rec] of Object.entries(prev)) {
        if (rec.profileId !== id) {
          copy[k] = rec;
        }
      }
      return copy;
    });
    if (activeProfileId === id && remaining.length > 0) {
      setActiveProfileId(remaining[0].id);
    }
  };

  const handleResetAsNewUser = () => {
    try {
      localStorage.removeItem(PROFILES_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      localStorage.removeItem(SAVED_SCHOLARSHIPS_KEY);
      localStorage.removeItem(PROFILE_DISCOVERED_AWARDS_KEY);
      localStorage.removeItem("scholarsearch_profile_chats_v1");
      localStorage.removeItem("scholarsearch_live_cache_v3");
      localStorage.removeItem("scholarsearch_ai_discovered_v1");
    } catch (e) {
      console.warn("Storage reset error:", e);
    }
    setProfiles([]);
    setActiveProfileId("");
    setProfileDiscoveredMap({});
    setSavedScholarships({});
    setActiveFeedFilters({});
    setChatResetCounter((c) => c + 1);
    setActiveTab("feed");
    setShowQuiz(true);
  };

  const getCompositeSavedKey = (profId: string, schId: string) => `${profId}__${schId}`;

  const handleSaveToggle = (
    scholarship: Scholarship,
    status: ApplicationStatus = "bookmarked"
  ) => {
    const currentProfId = activeProfile?.id || activeProfileId || "default";
    const compositeKey = getCompositeSavedKey(currentProfId, scholarship.id);

    setSavedScholarships((prev) => {
      const existing =
        prev[compositeKey] ||
        (prev[scholarship.id] &&
        (prev[scholarship.id].profileId === currentProfId || !prev[scholarship.id].profileId)
          ? prev[scholarship.id]
          : undefined);

      const copy = { ...prev };
      if (copy[scholarship.id] && copy[scholarship.id].profileId === currentProfId) {
        delete copy[scholarship.id];
      }

      if (existing) {
        copy[compositeKey] = {
          ...existing,
          profileId: currentProfId,
          status: status || existing.status,
          savedItem: scholarship,
        };
      } else {
        copy[compositeKey] = {
          scholarshipId: scholarship.id,
          profileId: currentProfId,
          status,
          notes: "",
          savedAt: Date.now(),
          savedItem: scholarship,
          checklist: {
            essayCompleted: false,
            recommendationLetters: false,
            transcriptSubmitted: false,
            portalSubmitted: false,
          },
        };
      }
      return copy;
    });
  };

  const handleUpdateSavedStatus = (id: string, status: ApplicationStatus) => {
    const currentProfId = activeProfile?.id || activeProfileId || "default";
    const compositeKey = getCompositeSavedKey(currentProfId, id);

    setSavedScholarships((prev) => {
      const targetKey = prev[compositeKey] ? compositeKey : prev[id] ? id : null;
      if (!targetKey) return prev;
      return {
        ...prev,
        [targetKey]: {
          ...prev[targetKey],
          status,
        },
      };
    });
  };

  const handleUpdateSavedNotes = (id: string, notes: string) => {
    const currentProfId = activeProfile?.id || activeProfileId || "default";
    const compositeKey = getCompositeSavedKey(currentProfId, id);

    setSavedScholarships((prev) => {
      const targetKey = prev[compositeKey] ? compositeKey : prev[id] ? id : null;
      if (!targetKey) return prev;
      return {
        ...prev,
        [targetKey]: {
          ...prev[targetKey],
          notes,
        },
      };
    });
  };

  const handleToggleChecklist = (
    id: string,
    key: "essayCompleted" | "recommendationLetters" | "transcriptSubmitted" | "portalSubmitted"
  ) => {
    const currentProfId = activeProfile?.id || activeProfileId || "default";
    const compositeKey = getCompositeSavedKey(currentProfId, id);

    setSavedScholarships((prev) => {
      const targetKey = prev[compositeKey] ? compositeKey : prev[id] ? id : null;
      if (!targetKey) return prev;
      const target = prev[targetKey];
      return {
        ...prev,
        [targetKey]: {
          ...target,
          checklist: {
            ...target.checklist,
            [key]: !target.checklist[key],
          },
        },
      };
    });
  };

  const handleRemoveSaved = (id: string) => {
    const currentProfId = activeProfile?.id || activeProfileId || "default";
    const compositeKey = getCompositeSavedKey(currentProfId, id);

    setSavedScholarships((prev) => {
      const copy = { ...prev };
      delete copy[compositeKey];
      if (copy[id] && (copy[id].profileId === currentProfId || !copy[id].profileId)) {
        delete copy[id];
      }
      return copy;
    });
  };

  const handleOpenAiWithPrompt = (promptText: string) => {
    setChatbotInitialPrompt(promptText);
    setIsChatOpen(true);
  };

  const allExtraScholarships = useMemo(() => {
    return Object.values(profileDiscoveredMap).flat();
  }, [profileDiscoveredMap]);

  const savedCount = Object.keys(activeProfileSavedScholarships).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Header (Matching screenshot style) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo: Royal blue rounded square with compass/search icon + ScholarSearch in bold */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                <Compass className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ScholarSearch
              </span>
            </div>

            {/* Center Navigation Links (Matching screenshot design with active blue underline) */}
            <nav className="hidden md:flex items-center gap-8 h-full">
              {/* Scholarship Feed */}
              <button
                onClick={() => setActiveTab("feed")}
                className={`h-full flex items-center text-sm font-semibold transition-colors relative ${
                  activeTab === "feed"
                    ? "text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Scholarship Feed</span>
                {activeTab === "feed" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full" />
                )}
              </button>

              {/* Saved Awards */}
              <button
                onClick={() => setActiveTab("saved")}
                className={`h-full flex items-center gap-2 text-sm font-semibold transition-colors relative ${
                  activeTab === "saved"
                    ? "text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Saved Awards</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    activeTab === "saved"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {savedCount}
                </span>
                {activeTab === "saved" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full" />
                )}
              </button>

              {/* Affordability Calculator */}
              <button
                onClick={() => setActiveTab("calculator")}
                className={`h-full flex items-center gap-1.5 text-sm font-semibold transition-colors relative ${
                  activeTab === "calculator"
                    ? "text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Affordability Calculator</span>
                {activeTab === "calculator" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full" />
                )}
              </button>

              {/* Profiles & Settings */}
              <button
                onClick={() => setActiveTab("profiles")}
                className={`h-full flex items-center text-sm font-semibold transition-colors relative ${
                  activeTab === "profiles"
                    ? "text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Profiles & Settings</span>
                {activeTab === "profiles" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full" />
                )}
              </button>
            </nav>

            {/* Right Side: Reset as New User & User avatar pill */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleResetAsNewUser}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Reset all data and start fresh as a brand new user"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Start as New User</span>
                <span className="sm:hidden">Reset</span>
              </button>

              <button
                onClick={() => setActiveTab("profiles")}
                className="px-3.5 py-1.5 bg-slate-100/90 hover:bg-slate-200 border border-slate-200 rounded-full text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors"
                title="Active Profile (Click to switch or customize)"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {activeProfile?.name ? activeProfile.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="font-semibold text-slate-800 hidden md:inline">{activeProfile?.name || "Student Profile"}</span>
              </button>
            </div>
          </div>

          {/* Mobile Tab Navigation Bar */}
          <div className="md:hidden flex items-center gap-2 pb-2.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("feed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                activeTab === "feed"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
                activeTab === "saved"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              <span>Saved Awards</span>
              <span className="text-[10px] font-bold">({savedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("calculator")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                activeTab === "calculator"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => setActiveTab("profiles")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                activeTab === "profiles"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Profiles
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {activeTab === "feed" && (
          <ScholarshipFeed
            activeProfile={activeProfile}
            savedScholarships={activeProfileSavedScholarships}
            profileDiscoveredScholarships={activeProfileDiscoveredScholarships}
            onAddProfileScholarships={(newAwards) =>
              activeProfile
                ? handleAddProfileScholarships(activeProfile.id, newAwards)
                : 0
            }
            onSaveToggle={handleSaveToggle}
            onOpenAiWithPrompt={handleOpenAiWithPrompt}
            onOpenProfileTab={() => setActiveTab("profiles")}
            onFiltersChange={setActiveFeedFilters}
          />
        )}

        {activeTab === "saved" && (
          <SavedScholarshipsTab
            savedScholarships={activeProfileSavedScholarships}
            extraScholarships={allExtraScholarships}
            onUpdateStatus={handleUpdateSavedStatus}
            onUpdateNotes={handleUpdateSavedNotes}
            onToggleChecklist={handleToggleChecklist}
            onRemove={handleRemoveSaved}
            onOpenFeedTab={() => setActiveTab("feed")}
          />
        )}

        {activeTab === "calculator" && <FinancialAidCalculator />}

        {activeTab === "profiles" && (
          <ProfileManager
            profiles={profiles}
            activeProfileId={activeProfileId}
            profileDiscoveredMap={profileDiscoveredMap}
            onAddProfileScholarships={handleAddProfileScholarships}
            onSelectProfile={(id) => {
              setActiveProfileId(id);
            }}
            onNavigateToFeed={() => setActiveTab("feed")}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onOpenNewProfileQuiz={() => setShowQuiz(true)}
            onResetAsNewUser={handleResetAsNewUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ScholarSearch</span>
            <span>·</span>
            <span>National High School Scholarships & Aid Finder</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowQuiz(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Retake Onboarding Quiz
            </button>
            <span>·</span>
            <button
              onClick={handleResetAsNewUser}
              className="text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset as Brand New User</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Onboarding Quiz Modal (Opens fresh every time) */}
      <OnboardingQuiz
        isOpen={showQuiz}
        onComplete={handleQuizComplete}
        onClose={() => setShowQuiz(false)}
        isFirstProfile={profiles.length === 0}
      />

      {/* Conversational AI Scholarship Advisor */}
      <AiChatbot
        activeProfile={activeProfile}
        activeFilters={activeFeedFilters}
        currentTab={activeTab}
        profileDiscoveredScholarships={activeProfileDiscoveredScholarships}
        totalEligibleCount={totalEligibleCountForActiveProfile}
        onAddProfileScholarships={(newAwards) =>
          activeProfile
            ? handleAddProfileScholarships(activeProfile.id, newAwards)
            : 0
        }
        onSwitchToFeed={() => setActiveTab("feed")}
        initialPrompt={chatbotInitialPrompt}
        onClearInitialPrompt={() => setChatbotInitialPrompt("")}
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen(!isChatOpen)}
        resetCounter={chatResetCounter}
      />
    </div>
  );
}
