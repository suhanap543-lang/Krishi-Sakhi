import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { apiFetch } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
import { translate, getLanguageCode } from "../utils/translate";
import { sarvamSTTTranslate, translateInputToEnglish } from "../utils/sarvamApi";

// ---------------------------------------------------------------------------
// Info Cards rendered inside chat messages
// ---------------------------------------------------------------------------
function InfoCard({ card }) {
  if (!card) return null;

  const base = "rounded-xl border p-3 text-xs";

  if (card.type === "fertilizer") {
    return (
      <div className={`${base} bg-purple-50 border-purple-200`}>
        <p className="font-bold text-purple-700 mb-2 flex items-center gap-1">
          {card.icon} {card.title}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(card.data || {}).map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg p-2 border border-purple-100">
              <p className="text-purple-400 capitalize font-medium">{k}</p>
              <p className="text-gray-700 font-semibold mt-0.5">{String(v)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === "schedule") {
    return (
      <div className={`${base} bg-amber-50 border-amber-200`}>
        <p className="font-bold text-amber-700 mb-2 flex items-center gap-1">
          {card.icon} {card.title}
        </p>
        <div className="space-y-1">
          {Object.entries(card.data || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5 border border-amber-100">
              <span className="text-amber-600 capitalize font-medium">{k}</span>
              <span className="text-gray-700 font-semibold">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === "warning") {
    return (
      <div className={`${base} bg-red-50 border-red-200`}>
        <p className="font-bold text-red-600 mb-2 flex items-center gap-1">
          {card.icon} {card.title}
        </p>
        <ul className="space-y-1">
          {(card.items || []).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-red-700">
              <span className="mt-0.5 shrink-0">⚠</span> {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (card.type === "tip") {
    return (
      <div className={`${base} bg-green-50 border-green-200`}>
        <p className="font-bold text-green-700 mb-2 flex items-center gap-1">
          {card.icon} {card.title}
        </p>
        <ul className="space-y-1">
          {(card.items || []).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-green-700">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span> {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (card.type === "market") {
    return (
      <div className={`${base} bg-blue-50 border-blue-200`}>
        <p className="font-bold text-blue-700 mb-2 flex items-center gap-1">
          {card.icon} {card.title}
        </p>
        <div className="space-y-1">
          {Object.entries(card.data || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5 border border-blue-100">
              <span className="text-blue-500 capitalize font-medium">{k.replace(/([A-Z])/g, " $1")}</span>
              <span className="text-gray-700 font-semibold">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generic card fallback
  if (card.type === "activity_logged") {
    return (
      <div className={`${base} bg-emerald-50 border-emerald-300`}>
        <p className="font-bold text-emerald-700 mb-2 flex items-center gap-1">
          ✅ {card.title || 'Activity Logged!'}
        </p>
        <div className="space-y-1">
          {Object.entries(card.data || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5 border border-emerald-100">
              <span className="text-emerald-600 capitalize font-medium">{k.replace(/_/g, ' ')}</span>
              <span className="text-gray-700 font-semibold">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${base} bg-gray-50 border-gray-200`}>
      <p className="font-bold text-gray-700 mb-1 flex items-center gap-1">
        {card.icon} {card.title}
      </p>
      {card.items && (
        <ul className="space-y-0.5">
          {card.items.map((item, i) => (
            <li key={i} className="text-gray-600 flex gap-1">
              <span>•</span> {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crop recommendation banner shown at top of chat
// ---------------------------------------------------------------------------
function CropBanner({ crop }) {
  if (!crop) return null;
  const EMOJI = { rice: "🌾", wheat: "🌿", maize: "🌽", cotton: "🌸", sugarcane: "🎋", banana: "🍌", mango: "🥭", grapes: "🍇", default: "🌱" };
  const emoji = EMOJI[crop.toLowerCase()] ?? EMOJI.default;
  return (
    <div className="mx-4 mt-2 mb-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl px-4 py-2 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="text-white text-xs opacity-80">Latest ML Recommendation</p>
          <p className="text-white font-bold capitalize text-sm">{crop}</p>
        </div>
      </div>
      <span className="text-white text-xs opacity-70 bg-white/20 rounded-full px-2 py-0.5">
        Active Context
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chat Component
// ---------------------------------------------------------------------------
export default function Chat() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("ammachi_chat_history");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse chat history:", e);
    }
    return [];
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { language, translateUI } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [recommendedCrop, setRecommendedCrop] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslatingVoice, setIsTranslatingVoice] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const session = (() => {
    try { return JSON.parse(localStorage.getItem("ammachi_session") || "{}"); }
    catch { return {}; }
  })();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          text: `Namaste${session.name ? `, ${session.name}` : ""}! 🙏\n\nI'm **Krishi Sakhi** — your intelligent farming companion powered by AI.\n\nI have access to your **farm data**, **crop recommendations**, **soil analysis**, **government schemes**, **market prices**, and **local agricultural officers**.\n\n🌾 Ask me about fertilizers, crop care, weather, pests, or market prices!`,
          sender: "bot",
          timestamp: new Date(),
          type: "welcome",
          cards: null,
        },
      ]);
    }
    fetchSuggestions();
    fetchLatestRecommendation();
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem("ammachi_chat_history", JSON.stringify(messages));
      }
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [messages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchLatestRecommendation = async () => {
    if (!session.userId) return;
    try {
      const res = await apiFetch(`/api/recommendations/history/${session.userId}`);
      const data = await res.json();
      if (data.success && data.recommendations?.length > 0) {
        setRecommendedCrop(data.recommendations[0].recommendedCrop);
      }
    } catch (e) {
      console.error("Recommendation fetch error:", e);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await apiFetch(`/api/chatbot/suggestions?farmer_id=${session.userId || ""}`);
      const data = await res.json();
      if (data.success) setSuggestions(data.data || []);
    } catch {
      setSuggestions([
        "What fertilizer should I use for my recommended crop?",
        "Show me a crop calendar",
        "How to improve my soil health?",
        "What government schemes can I apply for?",
        "Log a farm activity",
      ]);
    }
  };

  // ── Clear chat history ──
  const clearChat = () => {
    const welcomeMsg = {
      id: Date.now(),
      text: `Namaste${session.name ? `, ${session.name}` : ""}! \u{1F64F}\n\nI'm **Krishi Sakhi** \u2014 your intelligent farming companion.\n\nI have access to your **farm data**, **crop recommendations**, **soil analysis**, **government schemes**, **market prices**, and **local agricultural officers**.\n\n\u{1F33E} Ask me about fertilizers, crop care, weather, pests, or market prices!`,
      sender: "bot",
      timestamp: new Date(),
      type: "welcome",
      cards: null,
    };
    setMessages([welcomeMsg]);
    localStorage.removeItem("ammachi_chat_history");
    fetchSuggestions();
  };

  // ── Sarvam AI Voice Recording (replaces browser SpeechRecognition) ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        clearTimeout(recordingTimerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 100) {
          setIsRecording(false);
          return;
        }

        setIsTranslatingVoice(true);
        try {
          const result = await sarvamSTTTranslate(audioBlob);
          const translatedText = result.translated_text || result.transcript || '';
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SpeechRecognition) {
            if (translatedText) {
              setInputMessage(translatedText);
            }
          }
        } catch (err) {
          console.error('Sarvam STT error:', err);
        } finally {
          setIsTranslatingVoice(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);

      // Auto-stop after 30 seconds (Sarvam API limit)
      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearTimeout(recordingTimerRef.current);
    setIsListening(false);
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  // ── Send message ──
  const sendMessage = async (overrideMsg?: string) => {
    const text = overrideMsg || inputMessage.trim();
    if (!text) return;

    const userMsg = { id: Date.now(), text, sender: "user", timestamp: new Date(), cards: null };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Translate user input to English for Gemini (if not already English)
    let messageForGemini = text;
    if (language !== 'English') {
      try {
        messageForGemini = await translateInputToEnglish(text, language);
      } catch (err) {
        console.warn('Translation to English failed, sending original:', err);
      }
    }

    const history = messages
      .slice(-10)
      .filter((m) => m.sender === "user" || m.sender === "bot")
      .filter((m) => m.type !== "welcome")
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        text: m.text || "",
      }));

    try {
      const res = await apiFetch("/api/chatbot/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageForGemini,
          language: language || "English",
          farmer_id: session.userId,
          conversation_history: history,
        }),
      });

      const raw = await res.text();
      if (!raw) throw new Error("Empty response from server");
      const data = JSON.parse(raw);

      // Update recommended crop if returned in context
      if (data.context_used?.recommendedCrop) {
        setRecommendedCrop(data.context_used.recommendedCrop);
      }

      // Build cards array, injecting activity_logged card if applicable
      let responseCards = data.cards || [];
      if (data.activityLogged && data.loggedActivityData) {
        const ACTIVITY_LABELS = {
          sowing: '🌱 Sowing', irrigation: '💧 Irrigation', fertilizer: '🌿 Fertilizer',
          pesticide: '🚿 Pesticide', weeding: '🌾 Weeding', harvesting: '🌾 Harvesting',
          pest_issue: '🐛 Pest Issue', disease_issue: '🦠 Disease Issue', other: '📝 Other'
        };
        responseCards = [
          ...responseCards,
          {
            type: 'activity_logged',
            title: 'Activity Logged Successfully!',
            icon: '✅',
            data: {
              'Type': ACTIVITY_LABELS[data.loggedActivityData.activity_type] || data.loggedActivityData.activity_type,
              'Note': data.loggedActivityData.text_note,
              'Date': new Date(data.loggedActivityData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            }
          }
        ];
      }

      const botMsg = {
        id: Date.now() + 1,
        text: data.reply,
        sender: "bot",
        timestamp: new Date(),
        type: data.is_fallback ? "fallback" : "advice",
        cards: responseCards.length > 0 ? responseCards : null,
      };
      setMessages((prev) => [...prev, botMsg]);

      // Update suggestions based on crop context
      if (data.context_used?.hasCropRecommendation) {
        fetchSuggestions();
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: generateSmartResponse(text),
          sender: "bot",
          timestamp: new Date(),
          type: "fallback",
          cards: null,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  // ── Render markdown-like message text ──
  const renderMessageContent = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      let rendered = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      if (/^[\-\•\▸]\s/.test(rendered.trim())) {
        rendered = rendered.replace(/^[\s]*[\-\•\▸]\s*/, "");
        return (
          <div key={i} className="flex gap-2 items-start my-0.5">
            <span className="text-emerald-500 font-bold mt-0.5 shrink-0">▸</span>
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
          </div>
        );
      }
      if (/^\d+[\.\)]\s/.test(rendered.trim())) {
        const num = rendered.match(/^[\s]*(\d+)[\.\)]/)[1];
        rendered = rendered.replace(/^[\s]*\d+[\.\)]\s*/, "");
        return (
          <div key={i} className="flex gap-2 items-start my-0.5">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {num}
            </span>
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
          </div>
        );
      }
      if (/^#{1,3}\s/.test(line)) {
        const headerText = line.replace(/^#{1,3}\s/, "");
        return (
          <div key={i} className="text-emerald-700 font-extrabold mt-2 mb-1"
            dangerouslySetInnerHTML={{ __html: headerText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
          />
        );
      }
      rendered = rendered.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
      );
      if (!line.trim()) return <div key={i} className="h-2" />;
      return <div key={i} className="my-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  const generateSmartResponse = (message) => {
    const lo = message.toLowerCase();
    if (lo.includes("fertilizer") || lo.includes("npk"))
      return `For your recommended crop **${recommendedCrop || "crop"}**, apply NPK as per soil test results. Visit the Smart Recommendations page for detailed soil analysis.`;
    if (lo.includes("scheme") || lo.includes("government"))
      return "Explore **PM-KISAN**, **PMFBY**, and **Kisan Credit Card** in the Schemes section.";
    if (lo.includes("price") || lo.includes("market"))
      return "Check live prices in the **Market** section for your nearest mandi.";
    if (lo.includes("disease") || lo.includes("pest"))
      return "Upload a photo on the **Detect** page for AI-powered disease detection.";
    return "I'm your **Krishi Sakhi** assistant! Ask me about fertilizers, crop care, schemes, or market prices. 🌾";
  };

  // ── Render ──
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 h-screen min-w-0 ml-0 md:ml-64">

        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              KS
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Krishi Sakhi</p>
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                AI Farming Assistant
              </p>
            </div>
          </div>
          {recommendedCrop && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span className="text-xs text-emerald-600 font-medium">🌱 Crop:</span>
              <span className="text-xs font-bold text-emerald-700 capitalize">{recommendedCrop}</span>
            </div>
          )}
          <button
            onClick={clearChat}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-600 transition"
          >
            Clear
          </button>
        </div>

        {/* ── Crop banner (mobile) ── */}
        {recommendedCrop && (
          <CropBanner crop={recommendedCrop} />
        )}

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Bot avatar */}
              {msg.sender === "bot" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-1">
                  KS
                </div>
              )}

              <div className={`flex flex-col gap-2 max-w-[78%]`}>
                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed
                    ${msg.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                    }`}
                >
                  {renderMessageContent(msg.text)}
                </div>

                {/* ── Info cards ── */}
                {msg.cards && msg.cards.length > 0 && (
                  <div className="space-y-2">
                    {msg.cards.map((card, ci) => (
                      <InfoCard key={ci} card={card} />
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-[10px] text-gray-400 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* User avatar */}
              {msg.sender === "user" && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0 ml-2 mt-1">
                  {session.name?.[0]?.toUpperCase() || "F"}
                </div>
              )}
            </div>
          ))}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                KS
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggestions ── */}
        {suggestions.length > 0 && messages.length <= 2 && (
          <div className="shrink-0 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-white border-t border-gray-100">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="shrink-0 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input bar ── */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleInput}
              onKeyDown={handleKeyPress}
              placeholder={recommendedCrop ? `Ask about ${recommendedCrop} or anything farming…` : "Ask anything about farming…"}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-32"
            />

            {/* Voice button — Sarvam AI STT-Translate */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranslatingVoice}
              title={isRecording ? translateUI('Stop recording') : isTranslatingVoice ? translateUI('Translating...') : translateUI('Voice input (any Indian language)')}
              className={`p-2 rounded-xl transition shrink-0 ${isTranslatingVoice ? "bg-amber-100 text-amber-500 animate-pulse" :
                  isRecording ? "bg-red-100 text-red-500 animate-pulse" :
                    "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                }`}
            >
              {isTranslatingVoice ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="9" y="2" width="6" height="13" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              )}
            </button>
            {isRecording && (
              <span className="text-[10px] text-red-500 font-medium animate-pulse">REC</span>
            )}

            {/* Send button */}
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Active crop context indicator */}
          {recommendedCrop && (
            <p className="text-[10px] text-center text-gray-400 mt-1.5">
              🌱 Context: <span className="font-medium text-emerald-600 capitalize">{recommendedCrop}</span> recommendation active
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
