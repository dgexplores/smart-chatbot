import { useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, ChevronRight, FileText, Headphones, MessageSquareText, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import ChatWidget from './components/chat/ChatWidget.tsx';
import Dashboard from './components/dashboard/Dashboard.tsx';
import Login from './components/auth/Login.tsx';

function App() {
  const [viewMode, setViewMode] = useState<'customer' | 'executive'>('customer');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setViewMode('customer');
  };

  if (viewMode === 'executive') {
    if (!token) {
      return (
        <div className="relative">
          <Login onLoginSuccess={handleLoginSuccess} serverUrl={serverUrl} />
          {/* Floating View Switcher */}
          <button
            onClick={() => setViewMode('customer')}
            className="fixed top-3 right-4 z-50 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all"
          >
            👤 Switch to Customer View
          </button>
        </div>
      );
    }

    return (
      <div className="relative">
        <Dashboard />
        {/* Floating View Switchers */}
        <div className="fixed top-3 right-4 z-50 flex gap-2">
          <button
            onClick={() => setViewMode('customer')}
            className="bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all"
          >
            👤 Switch to Customer View
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-950 text-red-200 border border-red-900 hover:bg-red-900 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07032b] selection:bg-[#f8d447] selection:text-[#07032b]">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 lg:px-8" aria-label="Main navigation">
        <a href="#top" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight"><span className="grid h-8 w-8 place-items-center bg-[#f8d447] text-[#07032b]">A</span>ASEP<span className="text-[#9e83ff]">.</span></a>
        <div className="hidden items-center gap-8 text-sm font-semibold text-[#c9c3e8] md:flex"><a href="#services" className="hover:text-white">Capabilities</a><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#trust" className="hover:text-white">Why ASEP</a></div>
        <a href="#start" className="rounded-md bg-[#f8d447] px-4 py-2 text-sm font-extrabold text-[#07032b] transition-transform hover:-translate-y-0.5">Start a project</a>
      </nav>

      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pb-28 lg:pt-20">
        <div className="absolute -left-32 top-4 h-72 w-72 rounded-full bg-[#7047f5]/25 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="mb-5 flex items-center gap-2 text-sm font-bold text-[#f8d447]"><span className="h-2 w-2 rounded-full bg-[#38d7b4]" /> AI sales, with human judgment</p>
          <h1 className="max-w-3xl font-display text-5xl font-black leading-[.96] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">Turn every serious conversation into a clear next step.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#c9c3e8]">ASEP qualifies prospects, shapes requirements, and puts your team in the conversation exactly when expertise matters most.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="#start" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#7047f5] px-5 font-extrabold text-white shadow-[0_8px_0_#3e238f] transition-transform hover:-translate-y-1"><Sparkles className="h-4 w-4" />Talk to ASEP <ArrowRight className="h-4 w-4" /></a><a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#4c417f] px-5 font-bold text-white hover:bg-white/10">See the workflow <ChevronRight className="h-4 w-4" /></a></div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 text-sm font-semibold text-[#dcd7f4]"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#38d7b4]" />Always-on discovery</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#38d7b4]" />Live human handoff</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="ASEP conversation preview">
          <div className="absolute -inset-4 bg-[#7047f5]/20 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-xl border border-[#5a4a99] bg-[#100846] shadow-[14px_14px_0_#f8d447]">
            <div className="flex items-center justify-between border-b border-[#312467] bg-[#130a52] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#7047f5]"><Bot className="h-5 w-5" /></span><div><p className="font-bold">ASEP Concierge</p><p className="text-xs text-[#38d7b4]">● Online now</p></div></div><span className="rounded-full bg-[#f8d447] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#07032b]">Smart brief</span></div>
            <div className="space-y-5 p-5"><div className="max-w-[84%] rounded-lg rounded-tl-none bg-[#211567] p-4 text-sm leading-6 text-[#eeeaff]">Welcome. Tell me what you’re building, who it’s for, and the outcome you need.</div><div className="ml-auto max-w-[78%] rounded-lg rounded-br-none bg-[#7047f5] p-4 text-sm leading-6">We need a customer portal in six weeks.</div><div className="rounded-lg border border-[#40347d] bg-[#0b0437] p-4"><p className="text-sm font-bold text-[#f8d447]">I can map that into a project brief.</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span className="rounded bg-[#211567] p-2 text-[#dcd7f4]">Scope: Portal</span><span className="rounded bg-[#211567] p-2 text-[#dcd7f4]">Timeline: 6 weeks</span></div></div></div>
            <div className="border-t border-[#312467] p-4"><div className="flex items-center justify-between rounded-md bg-white px-4 py-3 text-sm text-[#645c88]"><span>Ask a question…</span><SendIcon /></div></div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-[#f8f7ff] py-20 text-[#11094a]"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="font-bold text-[#4d2fc1]">Built for consultations that matter</p><h2 className="mt-3 font-display text-4xl font-black leading-tight tracking-[-.03em] sm:text-5xl">A better front door for your expertise.</h2></div><p className="max-w-2xl self-end text-lg leading-8 text-[#524b73]">From the first message to a ready-to-review brief, ASEP keeps discovery focused and makes the next move obvious for clients and your team.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3"><Feature icon={<MessageSquareText />} title="Discover" copy="Guide prospects through the questions that clarify the actual job." /><Feature icon={<FileText />} title="Qualify" copy="Capture budget, timeline, requirements, and the signals your team needs." /><Feature icon={<Headphones />} title="Hand off" copy="Bring in a specialist with context intact, not another cold start." /></div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-10 lg:grid-cols-2"><div className="rounded-xl bg-[#7047f5] p-8 sm:p-10"><p className="font-bold text-[#e6ddff]">A conversation that goes somewhere</p><h2 className="mt-4 font-display text-4xl font-black leading-tight tracking-[-.03em] sm:text-5xl">Fast for the visitor. Useful for the team.</h2><a href="#start" className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#f8d447] px-4 py-3 font-extrabold text-[#07032b]">Open the assistant <ArrowRight className="h-4 w-4" /></a></div><ol className="space-y-4"><Step number="01" title="Start with the business goal" copy="ASEP uses plain language and helpful prompts to remove the blank-page problem." /><Step number="02" title="Build the project picture" copy="Requirements, constraints, timeline, and budget become a shared working brief." /><Step number="03" title="Route the right next action" copy="Receive a proposal, book a callback, or hand off to a consultant in real time." /></ol></div></section>

      <section id="trust" className="border-y border-[#2c2162] bg-[#0c0539] py-20"><div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[.9fr_1.1fr] lg:px-8"><div><p className="font-bold text-[#f8d447]">Confident, not automated away</p><h2 className="mt-4 font-display text-4xl font-black leading-tight tracking-[-.03em] sm:text-5xl">Your team stays in control.</h2></div><div className="grid gap-4 sm:grid-cols-2"><Trust icon={<ShieldCheck />} title="Context stays visible" copy="The handoff includes the conversation, qualification signals, and requirements." /><Trust icon={<Zap />} title="Momentum stays high" copy="Visitors get a useful response now, and people get involved at the right moment." /></div></div></section>

      <section id="start" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="flex flex-col items-start justify-between gap-8 rounded-xl bg-[#f8d447] p-8 text-[#08042f] sm:p-12 lg:flex-row lg:items-end"><div><p className="font-bold">Ready when your visitors are</p><h2 className="mt-3 max-w-2xl font-display text-4xl font-black leading-tight tracking-[-.03em] sm:text-5xl">Describe the project. ASEP will take it from there.</h2></div><button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Open chat"]')?.click()} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-[#08042f] px-5 font-extrabold text-white hover:bg-[#211567]">Open chat <ArrowRight className="h-4 w-4" /></button></div></section>

      <button
        onClick={() => setViewMode('executive')}
        className="fixed bottom-6 left-5 z-40 rounded-md border border-[#6658a3] bg-[#130a52] px-3 py-2 text-xs font-bold text-white hover:bg-[#211567]"
      >
        Executive workspace
      </button>
      <ChatWidget />
    </main>
  );
}

const SendIcon = () => <span className="grid h-6 w-6 place-items-center rounded bg-[#7047f5] text-xs font-black text-white">↑</span>;
const Feature = ({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) => <article className="border-t-4 border-[#7047f5] bg-white p-6"><span className="grid h-11 w-11 place-items-center bg-[#f8d447] text-[#11094a]">{icon}</span><h3 className="mt-6 font-display text-2xl font-extrabold">{title}</h3><p className="mt-3 leading-7 text-[#5b5479]">{copy}</p></article>;
const Step = ({ number, title, copy }: { number: string; title: string; copy: string }) => <li className="grid grid-cols-[auto_1fr] gap-5 border-b border-[#302466] py-5"><span className="font-display text-xl font-black text-[#f8d447]">{number}</span><div><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-1 leading-7 text-[#c9c3e8]">{copy}</p></div></li>;
const Trust = ({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) => <article className="bg-[#130a52] p-6"><span className="text-[#38d7b4]">{icon}</span><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-[#c9c3e8]">{copy}</p></article>;

export default App;
