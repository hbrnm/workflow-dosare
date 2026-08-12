import React, { useState, useRef, useEffect } from "react";
import { Sparkles, MessageSquare, Send, X, Loader2, Bot, User } from "lucide-react";
import { askSupervizorAtelier } from "../../utils/aiCopilot";

export default function AiCopilotWidget({ claims = [], isOpen: externalIsOpen, onClose: externalOnClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Salut! Sunt Supervizorul tău de Atelier. Pune-mi orice întrebare despre dosarele din service!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next && externalOnClose) externalOnClose();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { sender: "user", text: query.trim() };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const answer = await askSupervizorAtelier(query.trim(), claims);
      setMessages((prev) => [...prev, { sender: "bot", text: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Eroare: ${err.message || "Nu s-a putut genera răspunsul."}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Care mașini au piese sosite?",
    "Câte dosare sunt blocate?",
    "Câte mașini sunt programate azi?",
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full shadow-2xl transition-all transform hover:scale-105 cursor-pointer font-semibold text-xs border border-indigo-400/30"
          title="Deschide Supervizor Atelier"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-indigo-200" />
          <span>Supervizor Atelier</span>
        </button>
      )}

      {/* Chat Box Shell */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[500px] max-h-[80vh] text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Supervizor Atelier</h4>
                <p className="text-[10px] text-slate-400">Asistent virtual pentru stoc și dosare</p>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs scrollbar-thin">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none font-medium"
                      : m.isError
                      ? "bg-rose-950/50 border border-rose-500/30 text-rose-200 rounded-bl-none"
                      : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === "user" && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs italic">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Supervizorul analizează dosarele...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-2 bg-slate-950/40 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none">
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-full whitespace-nowrap transition-colors border border-slate-700/50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Întreabă despre dosare..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
