import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  X,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ApifyScholarshipInput, Scholarship, StudentProfile } from "../types/scholarship";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  addedScholarships?: Scholarship[];
  updatedTotalCount?: number;
}

interface AiChatbotProps {
  activeProfile: StudentProfile | null;
  activeFilters?: ApifyScholarshipInput;
  currentTab: string;
  profileDiscoveredScholarships: Scholarship[];
  totalEligibleCount: number;
  onAddProfileScholarships: (newAwards: Scholarship[]) => number;
  onSwitchToFeed?: () => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  resetCounter?: number;
}

const CHAT_STORAGE_KEY = "scholarsearch_profile_chats_v1";

const createIntroMessage = (profileName?: string): Message => ({
  id: `intro-${profileName || "default"}`,
  role: "assistant",
  content: `Hey${profileName ? ` ${profileName}` : ""}! Ask me anything or say "show more scholarships" to add new matches.`,
  timestamp: Date.now(),
});

export const AiChatbot: React.FC<AiChatbotProps> = ({
  activeProfile,
  activeFilters = {},
  currentTab,
  profileDiscoveredScholarships,
  totalEligibleCount,
  onAddProfileScholarships,
  onSwitchToFeed,
  initialPrompt,
  onClearInitialPrompt,
  isOpen,
  onToggleOpen,
  resetCounter = 0,
}) => {
  const profileKey = activeProfile?.id || "default";

  const [chatByProfile, setChatByProfile] = useState<Record<string, Message[]>>(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (resetCounter > 0) {
      setChatByProfile({});
    }
  }, [resetCounter]);

  const messages: Message[] =
    chatByProfile[profileKey] && chatByProfile[profileKey].length > 0
      ? chatByProfile[profileKey]
      : [createIntroMessage(activeProfile?.name)];

  const setProfileMessages = (
    updater: Message[] | ((prev: Message[]) => Message[]),
    targetKey: string = profileKey,
    targetName: string | undefined = activeProfile?.name
  ) => {
    setChatByProfile((prevMap) => {
      const currentList =
        prevMap[targetKey] && prevMap[targetKey].length > 0
          ? prevMap[targetKey]
          : [createIntroMessage(targetName)];
      const nextList = typeof updater === "function" ? updater(currentList) : updater;
      const nextMap = {
        ...prevMap,
        [targetKey]: nextList,
      };
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextMap));
      } catch (e) {
        console.warn("Could not save profile chat history:", e);
      }
      return nextMap;
    });
  };

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, profileKey]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      if (!isOpen) onToggleOpen();
      handleSend(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSend = async (textToSend?: string) => {
    const userText = (textToSend || inputValue).trim();
    if (!userText || isLoading) return;

    const currentKey = profileKey;
    const currentProfileName = activeProfile?.name;

    const userMessage: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setProfileMessages(newMessages, currentKey, currentProfileName);
    setInputValue("");
    setIsLoading(true);

    try {
      const existingTitles = profileDiscoveredScholarships.map((s) => s.title);
      const nextBatchIndex = Math.floor(profileDiscoveredScholarships.length / 6) + 1;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          studentProfile: activeProfile,
          filters: activeFilters,
          currentTab,
          existingTitles,
          batchIndex: nextBatchIndex,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to receive response");
      }

      const data = await response.json();
      let addedItems: Scholarship[] = [];
      let addedCount = 0;

      if (Array.isArray(data.discoveredScholarships) && data.discoveredScholarships.length > 0) {
        addedItems = data.discoveredScholarships;
        addedCount = onAddProfileScholarships(addedItems);
      }

      const newTotal = totalEligibleCount + addedCount;

      const assistantMessage: Message = {
        id: "msg_reply_" + Date.now(),
        role: "assistant",
        content:
          data.reply ||
          (addedCount > 0
            ? `Added +${addedCount} new scholarships to ${currentProfileName || "your"} profile (${newTotal} total shown, sorted into your feed).`
            : "How else can I help you today?"),
        timestamp: Date.now(),
        addedScholarships: addedCount > 0 ? addedItems : undefined,
        updatedTotalCount: addedCount > 0 ? newTotal : undefined,
      };

      setProfileMessages((prev) => [...prev, assistantMessage], currentKey, currentProfileName);
    } catch (err: any) {
      console.error("Chatbot request error:", err);
      const fallbackMessage: Message = {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content: "I ran into a temporary connection hiccup—please send your message again!",
        timestamp: Date.now(),
      };
      setProfileMessages((prev) => [...prev, fallbackMessage], currentKey, currentProfileName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setProfileMessages(
      [
        {
          id: "intro-reset-" + Date.now(),
          role: "assistant",
          content: `Conversation cleared for ${activeProfile?.name || "this profile"}! Ask me anything.`,
          timestamp: Date.now(),
        },
      ],
      profileKey,
      activeProfile?.name
    );
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-blue-500 cursor-pointer"
          title="Open AI Assistant"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs sm:text-sm font-bold">Ask AI Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md h-[540px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">ScholarSearch AI</h3>
                <p className="text-[10px] text-slate-500">
                  {activeProfile
                    ? `${activeProfile.name} · ${totalEligibleCount} Eligible Awards Active`
                    : "Ask Anything · Powered by Gemini"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
            {messages.map((m) => {
              const isAssistant = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${isAssistant ? "" : "flex-row-reverse"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                      isAssistant
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isAssistant ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] p-3 rounded-xl text-xs sm:text-sm leading-relaxed space-y-2 ${
                      isAssistant
                        ? "bg-white border border-slate-200 text-slate-800 shadow-xs"
                        : "bg-blue-600 text-white shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>

                    {/* If this message added scholarships to the profile, display a confirmation card */}
                    {m.addedScholarships && m.addedScholarships.length > 0 && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            +{m.addedScholarships.length} New Awards Saved to {activeProfile?.name || "Profile"}
                          </span>
                          {m.updatedTotalCount && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full">
                              Now Showing {m.updatedTotalCount}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 pt-0.5">
                          {m.addedScholarships.slice(0, 3).map((s) => (
                            <div
                              key={s.id}
                              className="text-[11px] bg-white/90 px-2 py-1 rounded border border-emerald-200/80 flex items-center justify-between gap-2"
                            >
                              <span className="font-semibold text-slate-800 truncate">
                                {s.title}
                              </span>
                              <span className="font-bold text-emerald-700 shrink-0">
                                {s.amountDisplay || `$${s.amount.toLocaleString()}`}
                              </span>
                            </div>
                          ))}
                          {m.addedScholarships.length > 3 && (
                            <div className="text-[10px] text-emerald-700 font-semibold pl-1">
                              + {m.addedScholarships.length - 3} more added to your Scholarship Feed
                            </div>
                          )}
                        </div>
                        {currentTab !== "feed" && onSwitchToFeed && (
                          <button
                            onClick={onSwitchToFeed}
                            className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>View Updated Scholarship Feed</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl w-fit">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span className="text-xs text-slate-500">Advisor is thinking & checking eligible awards...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Ask anything or say "Show me more scholarships"...'
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
