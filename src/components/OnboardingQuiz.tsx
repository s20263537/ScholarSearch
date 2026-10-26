import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  MapPin,
  User,
  AlertCircle,
  X,
  Compass,
  Award,
  FileCheck,
  Clock,
  HeartHandshake,
  Briefcase,
  DollarSign,
} from "lucide-react";
import {
  StudentProfile,
  US_STATES,
  SCHOOL_YEARS,
  GENDERS,
  ETHNICITIES,
  CLASS_RANKS,
  CITIZENSHIP_OPTIONS,
  MIN_AMOUNT_PRESETS,
} from "../types/scholarship";

interface OnboardingQuizProps {
  isOpen: boolean;
  onComplete: (profile: StudentProfile) => void;
  onClose?: () => void;
  isFirstProfile?: boolean;
}

export const OnboardingQuiz: React.FC<OnboardingQuizProps> = ({
  isOpen,
  onComplete,
  onClose,
  isFirstProfile = false,
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [name, setName] = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  const [state, setState] = useState("");
  const [scopePreference, setScopePreference] = useState<"all" | "local" | "nationwide" | "">("");
  const [minAmountInput, setMinAmountInput] = useState<string>("0");

  const [unweightedGpaInput, setUnweightedGpaInput] = useState<string>("");
  const [weightedGpaInput, setWeightedGpaInput] = useState<string>("");
  const [hasWeightedGpa, setHasWeightedGpa] = useState<boolean>(false);
  const [classRank, setClassRank] = useState<string>("");

  const [isTestOptional, setIsTestOptional] = useState<boolean>(false);
  const [satScore, setSatScore] = useState<string>("");
  const [actScore, setActScore] = useState<string>("");

  const [needBased, setNeedBased] = useState<boolean>(false);
  const [firstGen, setFirstGen] = useState<boolean>(false);
  const [volunteerHours, setVolunteerHours] = useState<string>("");
  const [workHours, setWorkHours] = useState<string>("");
  const [citizenship, setCitizenship] = useState<string>("");
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName("");
      setSchoolYear("");
      setState("");
      setScopePreference("");
      setMinAmountInput("0");
      setUnweightedGpaInput("");
      setWeightedGpaInput("");
      setHasWeightedGpa(false);
      setClassRank("");
      setIsTestOptional(false);
      setSatScore("");
      setActScore("");
      setNeedBased(false);
      setFirstGen(false);
      setVolunteerHours("");
      setWorkHours("");
      setCitizenship("");
      setGender("");
      setEthnicity("");
      setErrorMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMsg("");

    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg("Please enter the student's name.");
        return;
      }
      if (!schoolYear) {
        setErrorMsg("Please select your current grade or school level.");
        return;
      }
    }

    if (step === 2) {
      if (!state) {
        setErrorMsg("Please select your state of residence.");
        return;
      }
      if (!scopePreference) {
        setErrorMsg("Please select your geographic scope preference (All, Local State Only, or Nationwide).");
        return;
      }
    }

    if (step === 3) {
      if (!unweightedGpaInput.trim()) {
        setErrorMsg("Please enter your unweighted GPA (e.g. 3.50).");
        return;
      }
      const parsedUnweighted = parseFloat(unweightedGpaInput);
      if (isNaN(parsedUnweighted) || parsedUnweighted < 0.5 || parsedUnweighted > 4.0) {
        setErrorMsg("Please enter a valid unweighted GPA between 0.5 and 4.0");
        return;
      }
      if (weightedGpaInput.trim()) {
        const parsedWeighted = parseFloat(weightedGpaInput);
        if (isNaN(parsedWeighted) || parsedWeighted < 0.5 || parsedWeighted > 5.0) {
          setErrorMsg("Please enter a valid weighted GPA between 0.5 and 5.0 (out of 5.0).");
          return;
        }
      }
    }

    if (step === 4) {
      if (!isTestOptional) {
        if (satScore.trim()) {
          const sat = parseInt(satScore, 10);
          if (isNaN(sat) || sat < 400 || sat > 1600) {
            setErrorMsg("SAT score must be between 400 and 1600 (or select Test-Optional).");
            return;
          }
        }
        if (actScore.trim()) {
          const act = parseInt(actScore, 10);
          if (isNaN(act) || act < 1 || act > 36) {
            setErrorMsg("ACT score must be between 1 and 36 (or leave empty).");
            return;
          }
        }
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const unweighted = unweightedGpaInput.trim() ? parseFloat(unweightedGpaInput) : 3.5;
    const weighted = weightedGpaInput.trim() ? parseFloat(weightedGpaInput) : undefined;
    const sat = !isTestOptional && satScore.trim() ? parseInt(satScore, 10) : undefined;
    const act = !isTestOptional && actScore.trim() ? parseInt(actScore, 10) : undefined;
    const parsedVolunteer = volunteerHours.trim() ? parseInt(volunteerHours, 10) : undefined;
    const parsedWork = workHours.trim() ? parseInt(workHours, 10) : undefined;
    const parsedMinAmount = minAmountInput.trim() ? Math.max(0, parseInt(minAmountInput, 10) || 0) : 0;

    const newProfile: StudentProfile = {
      id: "profile_" + Date.now(),
      name: name.trim() || "Student",
      school_year: schoolYear || "high-school-senior",
      state,
      gpa: unweighted,
      unweighted_gpa: unweighted,
      weighted_gpa: weighted,
      sat_score: sat,
      act_score: act,
      test_optional: isTestOptional,
      class_rank: classRank || undefined,
      volunteer_hours: isNaN(Number(parsedVolunteer)) ? undefined : parsedVolunteer,
      work_hours: isNaN(Number(parsedWork)) ? undefined : parsedWork,
      citizenship: citizenship || undefined,
      locationPreference: (scopePreference as any) || "all",
      need_based: needBased,
      first_gen: firstGen,
      gender: gender || undefined,
      ethnicity: ethnicity || undefined,
      min_amount: parsedMinAmount > 0 ? parsedMinAmount : undefined,
      target_amount: parsedMinAmount > 0 ? String(parsedMinAmount) : undefined,
      omittedFields: [],
      createdAt: Date.now(),
    };

    onComplete(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xs">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {isFirstProfile ? "Welcome to ScholarSearch" : "Student Profile Questionnaire"}
              </h2>
              <p className="text-xs text-slate-500">
                Answer a few quick questions to match relevant scholarships and aid
              </p>
            </div>
          </div>
          {!isFirstProfile && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>
              Question {step} of {totalSteps}
            </span>
            <span className="text-blue-600 font-bold">
              {Math.round((step / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[360px] flex flex-col justify-between">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Student Name & School Year */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  What is the student's name?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-sm text-slate-900 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  What grade or school level are you in?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {SCHOOL_YEARS.map((yr) => (
                    <button
                      key={yr.value}
                      type="button"
                      onClick={() => setSchoolYear(yr.value)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                        schoolYear === yr.value
                          ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{yr.label}</span>
                      {schoolYear === yr.value && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Residence State & Location Scope */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  What state do you live in?
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  State-specific scholarships and local endowments offer high statistical win rates.
                </p>

                <div className="relative">
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none cursor-pointer appearance-none transition-all"
                  >
                    <option value="">-- Choose your State (All 50 States & DC) --</option>
                    {US_STATES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Scope Selection: Nationwide vs Local vs All */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Geographic Scope Preference:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScopePreference("all")}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      scopePreference === "all"
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold">All Opportunities</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Nationwide + State awards</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopePreference("local")}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      scopePreference === "local"
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>Local State Only</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                        Higher Odds
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Only awards for your state</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopePreference("nationwide")}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      scopePreference === "nationwide"
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold">Nationwide Only</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Open to all U.S. students</div>
                  </button>
                </div>
              </div>

              {/* Minimum Award Amount ($) Selection in Quiz */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Minimum Scholarship Award Amount ($):
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Select a minimum dollar amount or enter a custom floor (you can also edit or omit this anytime in your profile).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
                  {MIN_AMOUNT_PRESETS.map((preset) => {
                    const isSelected = String(preset.value) === minAmountInput.trim();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setMinAmountInput(String(preset.value))}
                        className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{preset.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="250"
                    value={minAmountInput === "0" ? "" : minAmountInput}
                    onChange={(e) => setMinAmountInput(e.target.value || "0")}
                    placeholder="Or type custom minimum amount (e.g. 1500)"
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Both GPAs & Class Rank (Clean inputs, NO choices underneath, weighted out of 5) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Academic GPAs & Class Standing
                </label>
                <p className="text-xs text-slate-500">
                  Enter your unweighted GPA (4.0 scale) and optional weighted GPA (out of 5.0 for AP/honors courses).
                </p>
              </div>

              {/* Both GPAs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Unweighted GPA - Clean input without choice buttons */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unweighted GPA (4.0 Scale) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="1.0"
                      max="4.0"
                      value={unweightedGpaInput}
                      onChange={(e) => setUnweightedGpaInput(e.target.value)}
                      placeholder="e.g. 3.50"
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-sm font-bold text-slate-900 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                      / 4.0
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Used to screen scholarships against minimum grade eligibility.
                  </p>
                </div>

                {/* Weighted GPA - Always visible and directly editable (Out of 5.0) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Weighted GPA (5.0 Scale)
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Optional
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="5.0"
                      value={weightedGpaInput}
                      onChange={(e) => setWeightedGpaInput(e.target.value)}
                      placeholder="e.g. 4.15 (leave blank if N/A)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-sm font-bold text-slate-900 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                      / 5.0
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Enter your weighted GPA out of 5.0 for AP, IB, and honors coursework, or leave blank.
                  </p>
                </div>
              </div>

              {/* Class Rank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Class Rank / Standing:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CLASS_RANKS.map((rk) => (
                    <button
                      key={rk.value}
                      type="button"
                      onClick={() => setClassRank(rk.value)}
                      className={`p-2 rounded-xl border text-left text-xs transition-all ${
                        classRank === rk.value
                          ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {rk.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Standardized Test Scores (Clean inputs, NO choices underneath) */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  Standardized Test Scores (Optional)
                </label>
                <p className="text-xs text-slate-500">
                  Many scholarships are test-optional, but submitting scores can qualify for merit awards.
                </p>
              </div>

              {/* Test-Optional Toggle Card */}
              <div
                onClick={() => setIsTestOptional(!isTestOptional)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isTestOptional
                    ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Applying Test-Optional / Did Not Take SAT/ACT</div>
                  <div className="text-[11px] text-slate-500">
                    Search will prioritize holistic, essay, and GPA-based scholarships.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isTestOptional}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>

              {!isTestOptional && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* SAT Score - Clean input */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SAT Total Score (400 - 1600)
                    </label>
                    <input
                      type="number"
                      step="10"
                      min="400"
                      max="1600"
                      value={satScore}
                      onChange={(e) => setSatScore(e.target.value)}
                      placeholder="e.g. 1320"
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">Leave empty if not taken.</p>
                  </div>

                  {/* ACT Score - Clean input */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ACT Composite Score (1 - 36)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="36"
                      value={actScore}
                      onChange={(e) => setActScore(e.target.value)}
                      placeholder="e.g. 29"
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">Leave empty if not taken.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Background, Financial Need, Volunteer Hours & Work Hours (SAME BLUE COLOR WHEN CLICKED) */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Background, Aid, Volunteer & Work Hours
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Endowments frequently award students with demonstrated service, work experience, or financial need.
                </p>
              </div>

              {/* Need-based & First-Gen - BOTH SAME COLOR WHEN CLICKED */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setNeedBased(!needBased)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    needBased
                      ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Pell Grant / Financial Need</div>
                    <div className="text-[11px] text-slate-500">Qualify for need-based grants</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={needBased}
                    onChange={() => {}}
                    className="w-4 h-4 accent-blue-600"
                  />
                </div>

                <div
                  onClick={() => setFirstGen(!firstGen)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    firstGen
                      ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">First-Generation Student</div>
                    <div className="text-[11px] text-slate-500">First in family to attend college</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={firstGen}
                    onChange={() => {}}
                    className="w-4 h-4 accent-blue-600"
                  />
                </div>
              </div>

              {/* Volunteer Hours & Work Hours (Replacing primary extracurricular) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-blue-600" />
                    Volunteer / Community Service Hours
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={volunteerHours}
                      onChange={(e) => setVolunteerHours(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      hours completed
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Total high school or college service hours.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    Part-Time Work / Job Hours (per week)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      value={workHours}
                      onChange={(e) => setWorkHours(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      hrs / week
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Paid job or family responsibility hours (0 if none).</p>
                </div>
              </div>

              {/* Citizenship & Residency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Citizenship:
                  </label>
                  <select
                    value={citizenship}
                    onChange={(e) => setCitizenship(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Status (Optional) --</option>
                    {CITIZENSHIP_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender (Optional):
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
                  >
                    <option value="">Any / Not Specified</option>
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Heritage (Optional):
                  </label>
                  <select
                    value={ethnicity}
                    onChange={(e) => setEthnicity(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
                  >
                    <option value="">Any Background</option>
                    {ETHNICITIES.map((eth) => (
                      <option key={eth.value} value={eth.value}>
                        {eth.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                You're all set! Major, award amounts, and deadline filters are fully customizable right in your feed.
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setStep(step - 1);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center gap-2 active:scale-95"
            >
              <span>{step === totalSteps ? "Finish & View Matched Feed" : "Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
