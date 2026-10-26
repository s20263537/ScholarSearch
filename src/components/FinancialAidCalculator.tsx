import React, { useState } from "react";
import {
  Calculator,
  DollarSign,
  ShieldCheck,
  TrendingDown,
  Info,
  Award,
  BookOpen,
  PieChart,
} from "lucide-react";

export const FinancialAidCalculator: React.FC = () => {
  const [householdAgi, setHouseholdAgi] = useState<number>(68000);
  const [familySize, setFamilySize] = useState<number>(4);
  const [parentAssets, setParentAssets] = useState<number>(15000);
  const [studentSavings, setStudentSavings] = useState<number>(2000);
  const [selectedPreset, setSelectedPreset] = useState<string>("in_state_public");
  const [customCoa, setCustomCoa] = useState<number>(27000);

  const presets: Record<string, { label: string; coa: number; tuition: number; roomBoard: number; type: string }> = {
    community_cte: {
      label: "2-Year Community College / Technical Trade (CTE)",
      coa: 12500,
      tuition: 4200,
      roomBoard: 6500,
      type: "Career & Technical Education",
    },
    in_state_public: {
      label: "In-State Public 4-Year University",
      coa: 27500,
      tuition: 9800,
      roomBoard: 14200,
      type: "Public University",
    },
    out_of_state_public: {
      label: "Out-of-State Public University",
      coa: 45000,
      tuition: 26500,
      roomBoard: 14500,
      type: "Out-of-State Public",
    },
    private_nonprofit: {
      label: "Private Non-Profit 4-Year College",
      coa: 62000,
      tuition: 43000,
      roomBoard: 15500,
      type: "Private University",
    },
    custom: {
      label: "Custom College Cost of Attendance",
      coa: customCoa,
      tuition: Math.round(customCoa * 0.55),
      roomBoard: Math.round(customCoa * 0.35),
      type: "Custom",
    },
  };

  const activePreset = presets[selectedPreset] || presets.in_state_public;
  const targetCoa = selectedPreset === "custom" ? customCoa : activePreset.coa;

  const calculateEstimates = () => {
    const incomeProtection = 35000 + (familySize - 2) * 5200;
    const discretionaryIncome = Math.max(0, householdAgi - incomeProtection);
    const parentContributionFromIncome = discretionaryIncome * 0.22;
    const assetProtectionAllowance = 10000;
    const discretionaryAssets = Math.max(0, parentAssets - assetProtectionAllowance);
    const parentContributionFromAssets = discretionaryAssets * 0.12;
    const studentContribution = Math.max(0, studentSavings * 0.2);

    let calculatedSai = Math.round(
      parentContributionFromIncome + parentContributionFromAssets + studentContribution
    );

    if (householdAgi <= 35000) {
      calculatedSai = -1500;
    } else if (householdAgi <= 45000) {
      calculatedSai = 0;
    }

    let estimatedPell = 0;
    if (calculatedSai <= 0) {
      estimatedPell = 7395;
    } else if (calculatedSai < 7395) {
      estimatedPell = Math.round(7395 - calculatedSai);
      if (estimatedPell < 740) estimatedPell = 740;
    }

    const federalDirectLoans = 5500;
    const federalWorkStudy = calculatedSai < 15000 ? 3000 : 0;

    let estimatedStateGrant = 0;
    if (householdAgi <= 60000) {
      estimatedStateGrant = 2500;
    } else if (householdAgi <= 85000) {
      estimatedStateGrant = 1200;
    }

    let institutionalAid = 0;
    if (selectedPreset === "private_nonprofit") {
      institutionalAid = Math.round(Math.max(5000, targetCoa * 0.35 - Math.max(0, calculatedSai * 0.5)));
    } else if (selectedPreset === "in_state_public") {
      institutionalAid = calculatedSai < 10000 ? 2500 : 1000;
    }

    const totalGiftAid = estimatedPell + estimatedStateGrant + institutionalAid;
    const totalSelfHelp = federalWorkStudy + federalDirectLoans;
    const totalAidPackage = totalGiftAid + totalSelfHelp;

    const netPrice = Math.max(0, targetCoa - totalGiftAid);
    const remainingCashGap = Math.max(0, targetCoa - totalAidPackage);

    return {
      sai: calculatedSai,
      estimatedPell,
      federalWorkStudy,
      federalDirectLoans,
      estimatedStateGrant,
      institutionalAid,
      totalGiftAid,
      netPrice,
      remainingCashGap,
    };
  };

  const results = calculateEstimates();

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              College Affordability & SAI Calculator
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Estimate your FAFSA Student Aid Index, Federal Pell Grant eligibility, and net price out-of-pocket.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl shrink-0 text-center md:text-right">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            Goal
          </div>
          <div className="text-base font-extrabold text-emerald-700 flex items-center justify-center md:justify-end gap-1 mt-0.5">
            <ShieldCheck className="w-4 h-4" /> Debt-Free Degree
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Real-Time Calculation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters (Cols 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-blue-600" /> Family Financial Inputs
          </h3>

          {/* Household Adjusted Gross Income */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Household Adjusted Gross Income (AGI):
              </label>
              <span className="text-sm font-bold text-blue-600">
                ${householdAgi.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="15000"
              max="250000"
              step="5000"
              value={householdAgi}
              onChange={(e) => setHouseholdAgi(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>$15,000 (Pell Max)</span>
              <span>$100,000</span>
              <span>$250,000</span>
            </div>
          </div>

          {/* Family Size */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Household Size:
              </label>
              <span className="text-sm font-bold text-blue-600">{familySize} People</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFamilySize(num)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    familySize === num
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Parent Assets */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Parent Cash & Non-Retirement Savings:
              </label>
              <span className="text-sm font-bold text-blue-600">
                ${parentAssets.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="150000"
              step="5000"
              value={parentAssets}
              onChange={(e) => setParentAssets(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              *Excludes primary residence and retirement accounts.
            </p>
          </div>

          {/* Student Savings */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Student Own Savings / Bank Account:
              </label>
              <span className="text-sm font-bold text-blue-600">
                ${studentSavings.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20000"
              step="1000"
              value={studentSavings}
              onChange={(e) => setStudentSavings(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* College Cost Presets */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Institution Type & Annual Cost:
            </label>
            <div className="space-y-2">
              {Object.entries(presets).map(([key, item]) => (
                <div
                  key={key}
                  onClick={() => setSelectedPreset(key)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedPreset === key
                      ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.type}</div>
                  </div>
                  <div className="text-xs font-extrabold text-blue-600 shrink-0">
                    ${(key === "custom" ? customCoa : item.coa).toLocaleString()}/yr
                  </div>
                </div>
              ))}
            </div>

            {selectedPreset === "custom" && (
              <div className="mt-3">
                <label className="text-[11px] text-slate-500">Custom annual cost ($):</label>
                <input
                  type="number"
                  value={customCoa}
                  onChange={(e) => setCustomCoa(Number(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-blue-500 rounded-lg text-xs text-slate-800 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Results (Cols 7) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Net Price Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Estimated Student Aid Index (SAI)
                </span>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {results.sai <= 0 ? `${results.sai} (Max Need Eligibility)` : results.sai.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official federal need benchmark
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Estimated Net Price
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                  ${results.netPrice.toLocaleString()}/yr
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total cost minus free gift aid
                </p>
              </div>
            </div>

            {/* Aid Breakdown List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Estimated Annual Aid Breakdown:
              </span>

              {/* Pell */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-600" /> Federal Pell Grant (Free)
                  </div>
                  <div className="text-[10px] text-slate-500">Need-based federal grant aid</div>
                </div>
                <div className="text-sm font-extrabold text-emerald-600">
                  ${results.estimatedPell.toLocaleString()}
                </div>
              </div>

              {/* State Grant */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> State Need-Based Grants
                  </div>
                  <div className="text-[10px] text-slate-500">State assistance programs</div>
                </div>
                <div className="text-sm font-extrabold text-emerald-600">
                  ${results.estimatedStateGrant.toLocaleString()}
                </div>
              </div>

              {/* Institutional Aid */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" /> College Institutional Aid
                  </div>
                  <div className="text-[10px] text-slate-500">Endowments & merit discounts</div>
                </div>
                <div className="text-sm font-extrabold text-emerald-600">
                  ${results.institutionalAid.toLocaleString()}
                </div>
              </div>

              {/* Work-Study */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Federal Work-Study
                  </div>
                  <div className="text-[10px] text-slate-500">Campus student wages</div>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  ${results.federalWorkStudy.toLocaleString()}
                </div>
              </div>

              {/* Direct Loan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-slate-400" /> Federal Student Loan (Direct)
                  </div>
                  <div className="text-[10px] text-slate-500">Standard freshman federal loan cap</div>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  ${results.federalDirectLoans.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Gap box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-900">
                  Target Scholarship Amount to Wipe Out Costs
                </div>
                <p className="text-xs text-blue-700 mt-0.5">
                  Win scholarships from ScholarSearch to graduate completely debt-free.
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-blue-600 uppercase font-semibold">Remaining Gap</span>
                <div className="text-xl font-black text-blue-900">
                  ${results.remainingCashGap.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
