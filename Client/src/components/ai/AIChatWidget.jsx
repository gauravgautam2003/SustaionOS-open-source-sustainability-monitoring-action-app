import React, { useState, useRef, useEffect, useContext } from "react";
import { MessageCircle, X } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const suggestions = [
  "Why energy usage high?",
  "Predict tomorrow energy usage",
  "Show sustainability score",
  "How reduce carbon footprint?"
];

const AIChatWidget = () => {

  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! I can give you tips to improve sustainability metrics." },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const { darkMode } = useContext(ThemeContext);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear chat
  const clearChat = () => {
    setMessages([
      { sender: "ai", text: "Hi! I can give you tips to improve sustainability metrics." },
    ]);
  };

  const sendMessage = async (customText) => {

    const text = customText || input;

    if (!text.trim() || loading) return;

    const userMessage = { sender: "user", text };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      return updated.slice(-20);
    });

    setInput("");
    setLoading(true);

    try {

      const res = await fetch("http://localhost:5000/api/ai/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: text })
      });

      const data = await res.json();

      let responseText = "Sorry, I couldn't generate a response.";

      if (data.answer) {
        responseText = data.answer;
      }
      else if (data.suggestions) {
        responseText = data.suggestions
          .map(s => `• ${s.title}: ${s.message}`)
          .join("\n");
      }

      const aiMessage = {
        sender: "ai",
        text: responseText
      };

      setMessages(prev => {
        const updated = [...prev, aiMessage];
        return updated.slice(-20);
      });

    } catch (err) {

      setMessages(prev => {
        const updated = [
          ...prev,
          { sender: "ai", text: "Error: Failed to reach AI server." }
        ];
        return updated.slice(-20);
      });

      console.error("AI Chat Error:", err);

    } finally {

      setLoading(false);

    }

  };

  const handleKeyPress = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }

  };

  return (

    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {open && (

        <div
          className={`w-80 h-[420px] rounded-xl shadow-xl flex flex-col overflow-hidden
          ${darkMode ? "bg-gray-800" : "bg-white"}`}
        >

          {/* Header */}

          <div
            className={`flex justify-between items-center p-3
            ${darkMode ? "bg-gray-900/50" : "bg-gray-200/50"}`}
          >

            <h3 className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
              AI Assistant
            </h3>

            <div className="flex gap-2">

              <button
                onClick={clearChat}
                className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
              >
                Clear
              </button>

              <X
                className={`cursor-pointer hover:text-red-500 transition
                ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                onClick={() => setOpen(false)}
              />

            </div>

          </div>

          {/* Messages */}

          <div
            className={`flex-1 p-3 overflow-y-auto text-sm space-y-2
            ${darkMode ? "text-gray-300" : "text-gray-800"}`}
          >

            {messages.map((msg, idx) => (

              <div
                key={idx}
                className={`p-2 rounded-lg max-w-[80%] whitespace-pre-wrap
                ${
                  msg.sender === "user"
                    ? "bg-primary text-black ml-auto"
                    : darkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-900"
                }`}
              >
                {msg.text}
              </div>

            ))}

            {loading && (
              <div
                className={`p-2 rounded-lg max-w-[80%]
                ${darkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-900"}`}
              >
                AI is thinking...
              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* Suggested Questions - Only First Time */}

          {messages.length === 1 && !loading && (

            <div className="px-3 pb-2 flex flex-wrap gap-2">

              {suggestions.map((q, i) => (

                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-2 py-1 rounded bg-primary/20 hover:bg-primary/40"
                >
                  {q}
                </button>

              ))}

            </div>

          )}

          {/* Input */}

          <div
            className={`p-3 flex gap-2 border-t
            ${darkMode ? "border-gray-700" : "border-gray-300"}`}
          >

            <input
              type="text"
              placeholder="Ask about energy, water, carbon..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none
              ${
                darkMode
                  ? "bg-gray-900 text-white border border-gray-700"
                  : "bg-white text-black border border-gray-300"
              }`}
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading}
              className="bg-primary px-3 py-2 rounded-lg text-black font-medium hover:scale-105 transition disabled:opacity-50"
            >
              Send
            </button>

          </div>

        </div>

      )}

      {/* Floating Button */}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-black hover:scale-110 transition"
      >
        <MessageCircle size={28} />
      </button>

    </div>

  );
};

export default AIChatWidget;