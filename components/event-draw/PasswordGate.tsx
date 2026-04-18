"use client";

import { useState, useRef, useEffect } from "react";
import { useEventDrawStore } from "@/lib/stores/eventDrawStore";

export default function PasswordGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const authenticate = useEventDrawStore((s) => s.authenticate);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticate(password)) return;
    setError(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setPassword("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}>
      {/* 배경 도형들 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-float" />
        <div className="absolute top-1/3 right-16 w-20 h-20 bg-yellow-300/20 rounded-2xl rotate-12 animate-float-delay" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-pink-300/15 rounded-full animate-float" />
        <div className="absolute bottom-1/3 right-1/3 w-16 h-16 bg-blue-300/15 rounded-xl rotate-45 animate-float-delay" />
        <div className="absolute top-1/4 left-1/3 w-12 h-12 bg-green-300/10 rounded-full animate-float" />
      </div>

      <div className={`relative w-full max-w-[420px] ${shake ? "animate-shake" : ""}`}>
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-white shadow-2xl mb-6 relative">
            <span className="text-5xl">🏆</span>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xs">✨</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
            Event Draw
          </h1>
          <p className="text-white/70 mt-2 font-bold text-base">
            공정기술그룹
          </p>
        </div>

        {/* 입력 카드 */}
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-lg font-extrabold text-slate-800">비밀번호를 입력하세요</h2>
            <p className="text-sm text-slate-400 mt-1">행사 관리자만 접속할 수 있습니다</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="PASSWORD"
                className={`w-full h-14 px-5 pr-12 bg-slate-100 border-2 rounded-2xl text-slate-800 text-lg font-bold tracking-widest placeholder-slate-300 text-center focus:outline-none transition-all ${
                  error
                    ? "border-red-400 bg-red-50 focus:ring-4 focus:ring-red-100"
                    : "border-transparent focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-bold mb-3 text-center">
                비밀번호가 올바르지 않습니다
              </p>
            )}

            <button
              type="submit"
              disabled={!password}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white text-lg font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-600/40 active:scale-[0.97] disabled:shadow-none"
            >
              입장하기
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delay { animation: float 6s ease-in-out 2s infinite; }
      `}</style>
    </div>
  );
}
