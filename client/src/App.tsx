import { useState } from 'react';
import { ArrowRight, FileText, Headphones, Layers, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
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
    <main className="min-h-screen overflow-hidden bg-[#09023b] text-white selection:bg-[#f3c928] selection:text-[#09023b]">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 lg:px-8" aria-label="Main navigation"><a href="#top" className="text-xl font-black tracking-[-.05em]"><span className="text-[#f3c928]">A</span>SEP<span className="text-[#9a7cff]">.</span></a><div className="hidden gap-8 text-sm font-semibold text-[#d9d0ff] md:flex"><a className="brand-link" href="#services">Services</a><a className="brand-link" href="#how-it-works">Our process</a><a className="brand-link" href="#trust">Why ASEP</a></div><a href="#start" className="brand-action rounded-md bg-[#f3c928] px-4 py-2.5 text-sm font-extrabold text-[#09023b] hover:bg-white">Let's talk</a></nav>
      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 lg:grid-cols-[.95fr_1.05fr] lg:px-8 lg:pb-24 lg:pt-16"><div><p className="flex items-center gap-2 text-sm font-bold text-[#c6b6ff]"><Sparkles className="h-4 w-4 text-[#f3c928]" /> AI sales executive platform</p><h1 className="mt-5 max-w-xl text-balance font-display text-[clamp(3.25rem,7vw,5.9rem)] font-black leading-[.94] tracking-[-.04em]">One Stop Solution <span className="text-[#9a7cff]">For All Your Tech</span> Company Needs</h1><p className="mt-6 max-w-lg text-lg leading-8 text-[#ded8fa]">Turn each enquiry into a thoughtful, qualified conversation — then give your people the context to close with confidence.</p><button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Open chat"]')?.click()} className="brand-action mt-8 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#f3c928] px-5 font-extrabold text-[#09023b] hover:bg-white">Start a conversation <ArrowRight className="h-4 w-4" /></button></div><div className="relative mx-auto w-full max-w-xl"><div className="absolute inset-x-12 bottom-4 h-20 rounded-full bg-[#6c3cf0] blur-3xl" aria-hidden="true" /><img src="/asep-team-hero.png" alt="A collaborative team building digital products together" className="relative mx-auto w-full max-w-[540px] object-contain" /></div></section>
      <section className="bg-white py-16 text-[#120b3f]"><div className="mx-auto grid max-w-6xl gap-10 px-5 text-center md:grid-cols-3 md:text-left"><div><p className="text-5xl font-black tracking-[-.05em] text-[#6c3cf0]">1,000+</p><p className="mt-2 font-semibold text-[#5a5575]">client conversations designed to move work forward</p></div><div><p className="text-5xl font-black tracking-[-.05em] text-[#6c3cf0]">24/7</p><p className="mt-2 font-semibold text-[#5a5575]">a helpful first response, even outside office hours</p></div><div><p className="text-5xl font-black tracking-[-.05em] text-[#6c3cf0]">1 brief</p><p className="mt-2 font-semibold text-[#5a5575]">one shared picture before your team takes over</p></div></div></section>
      <section id="services" className="bg-white py-20 text-[#120b3f]"><div className="mx-auto max-w-6xl px-5"><div className="max-w-2xl"><p className="font-bold text-[#6c3cf0]">Works the way your business does</p><h2 className="mt-3 text-balance text-4xl font-black leading-tight tracking-[-.035em] sm:text-5xl">Everything you need to turn interest into momentum.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3"><Feature icon={<MessageSquareText />} title="Understand" copy="Ask useful questions in a friendly, natural rhythm." color="bg-[#6c3cf0]" /><Feature icon={<FileText />} title="Organize" copy="Collect the requirements that turn a chat into a brief." color="bg-[#f3c928]" dark /><Feature icon={<Headphones />} title="Connect" copy="Bring in your expert at exactly the right moment." color="bg-[#20bf8f]" /></div></div></section>
      <section id="how-it-works" className="bg-[#100447] py-20"><div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2"><div><p className="font-bold text-[#c6b6ff]">A clearer path from hello to handoff</p><h2 className="mt-3 text-balance text-4xl font-black leading-tight tracking-[-.035em] sm:text-5xl">A smart assistant that keeps your people in control.</h2><p className="mt-6 max-w-xl leading-8 text-[#d9d0ff]">Your client gets a fast answer. Your team receives the real context behind it. Nothing is buried, repeated, or lost in translation.</p></div><ol className="space-y-4"><Step number="01" title="Start with the goal" copy="Make the first question easy to answer." /><Step number="02" title="Shape the brief" copy="Capture budget, timing, constraints, and priorities." /><Step number="03" title="Move forward together" copy="Offer a proposal, meeting, or human handoff." /></ol></div></section>
      <section id="trust" className="bg-white py-20 text-[#120b3f]"><div className="mx-auto grid max-w-6xl gap-8 px-5 lg:grid-cols-[.85fr_1.15fr]"><div><p className="font-bold text-[#6c3cf0]">Why our clients choose ASEP</p><h2 className="mt-3 text-balance text-4xl font-black leading-tight tracking-[-.035em] sm:text-5xl">Helpful automation. Human relationships.</h2></div><div className="grid gap-5 sm:grid-cols-2"><Trust icon={<ShieldCheck />} title="Context never disappears" copy="Every handoff carries the conversation and the decisions already made." /><Trust icon={<Layers />} title="Your workflow stays yours" copy="Your team controls the next action and the final relationship." /></div></div></section>
      <section id="start" className="bg-[#09023b] px-5 py-20"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-2xl bg-[#6c3cf0] p-8 sm:p-12 lg:flex-row lg:items-end"><div><p className="font-bold text-[#e5dfff]">Ready when you are</p><h2 className="mt-3 max-w-2xl text-balance text-4xl font-black leading-tight tracking-[-.035em] sm:text-5xl">Let’s build the next conversation together.</h2></div><button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Open chat"]')?.click()} className="brand-action min-h-12 rounded-md bg-[#f3c928] px-5 font-extrabold text-[#09023b] hover:bg-white">Talk to ASEP</button></div></section>

      <button
        onClick={() => setViewMode('executive')}
        className="brand-action fixed bottom-5 left-5 z-40 rounded-md bg-white px-3 py-2 text-xs font-bold text-[#120b3f] shadow-lg"
      >
        Executive workspace
      </button>
      <ChatWidget />
    </main>
  );
}

const Feature = ({ icon, title, copy, color, dark = false }: { icon: React.ReactNode; title: string; copy: string; color: string; dark?: boolean }) => <article className={`rounded-2xl p-6 ${dark ? 'text-[#120b3f]' : 'text-white'} ${color}`}><span className={`grid h-12 w-12 place-items-center rounded-xl ${dark ? 'bg-[#120b3f]/10' : 'bg-white/20'}`}>{icon}</span><h3 className="mt-8 text-2xl font-black">{title}</h3><p className="mt-3 leading-7 opacity-90">{copy}</p></article>;
const Step = ({ number, title, copy }: { number: string; title: string; copy: string }) => <li className="flex gap-5 rounded-xl bg-white/10 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f3c928] text-sm font-black text-[#120b3f]">{number}</span><div><h3 className="font-extrabold">{title}</h3><p className="mt-1 leading-7 text-[#d9d0ff]">{copy}</p></div></li>;
const Trust = ({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) => <article className="rounded-2xl bg-[#f4f1ff] p-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#6c3cf0] text-white">{icon}</span><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-2 leading-7 text-[#5a5575]">{copy}</p></article>;

export default App;
