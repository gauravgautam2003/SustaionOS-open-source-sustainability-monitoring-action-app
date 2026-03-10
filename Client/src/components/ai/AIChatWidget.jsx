import React, { useState, useRef, useEffect, useContext } from "react";
import { MessageCircle, X } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const AIChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! I can give you tips to improve sustainability metrics." },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const { darkMode } = useContext(ThemeContext);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("http://localhost:5000/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });
      const data = await res.json();

      const aiMessage = { 
        sender: "ai", 
        text: data.suggestions 
          ? data.suggestions.map((s) => `• ${s.title}: ${s.message}`).join("\n") 
          : "Sorry, I couldn't generate a response." 
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "ai", text: "Error: Failed to reach AI server." }]);
      console.error("AI Chat Error:", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* Chat Box */}
      {open && (
        <div className={`w-80 h-96 rounded-xl shadow-xl flex flex-col overflow-hidden animate-fadeIn ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          
          {/* Header */}
          <div className={`flex justify-between items-center p-3 ${darkMode ? "bg-gray-900/50" : "bg-gray-200/50"}`}>
            <h3 className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>AI Assistant</h3>
            <X
              className={`cursor-pointer hover:text-red-500 transition ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              onClick={() => setOpen(false)}
            />
          </div>

          {/* Messages */}
          <div className={`flex-1 p-3 overflow-y-auto text-sm space-y-2 ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg max-w-[80%] whitespace-pre-wrap ${
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-3 flex gap-2 border-t ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none ${darkMode ? "bg-gray-900 text-white border border-gray-700" : "bg-white text-black border border-gray-300"}`}
            />
            <button
              onClick={sendMessage}
              className="bg-primary px-3 py-2 rounded-lg text-black font-medium hover:scale-105 transition"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Chat Button */}
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