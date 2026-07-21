import { useState } from 'react';
import { ArrowUpRight, Bot, FileText, Headphones, MessageSquareText, ShieldCheck } from 'lucide-react';
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
    <main className="min-h-screen overflow-hidden bg-[#f4f4f0] text-[#080808] selection:bg-[#e61919] selection:text-white">
      <div className="border-b-2 border-[#080808] bg-[#e61919] px-5 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-white">Asep / Client qualification system / Revision 02.6</div>
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between border-x border-[#080808] px-5 py-4 lg:px-8" aria-label="Main navigation">
        <a href="#top" className="font-display text-2xl font-black tracking-[-0.06em]">ASEP<sup className="ml-1 text-sm text-[#e61919]">®</sup></a>
        <div className="hidden items-center divide-x divide-[#080808] border-x border-[#080808] text-xs font-black uppercase tracking-[0.08em] md:flex"><a href="#services" className="industrial-link px-5 py-3">System</a><a href="#how-it-works" className="industrial-link px-5 py-3">Protocol</a><a href="#trust" className="industrial-link px-5 py-3">Control</a></div>
        <a href="#start" className="industrial-link border border-[#080808] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.08em]">Initiate</a>
      </nav>

      <section id="top" className="mx-auto grid max-w-7xl border-x border-[#080808] lg:grid-cols-[1.15fr_.85fr]">
        <div className="border-b border-[#080808] px-5 py-14 lg:border-b-0 lg:border-r lg:px-8 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#e61919]">[ STATUS: OPERATIVE / HUMAN-LED ]</p>
          <h1 className="mt-7 max-w-4xl font-display text-[clamp(3.1rem,8.7vw,6rem)] font-black leading-[.86] tracking-[-.06em]">MAKE THE NEXT MOVE<br /><span className="text-[#e61919]">OBVIOUS.</span></h1>
          <p className="mt-8 max-w-xl text-lg font-semibold leading-8 text-[#252525]">ASEP turns an uncertain first message into a brief your team can act on. It learns the job, captures the constraints, and hands off with context.</p>
          <div className="mt-10 flex flex-wrap gap-3"><button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Open chat"]')?.click()} className="industrial-action inline-flex min-h-12 items-center gap-2 bg-[#e61919] px-5 text-sm font-black uppercase tracking-[0.05em] text-white hover:bg-[#080808]">Open assistant <ArrowUpRight className="h-4 w-4" /></button><a href="#how-it-works" className="industrial-link inline-flex min-h-12 items-center border border-[#080808] bg-white px-5 text-sm font-black uppercase tracking-[0.05em]">Read protocol</a></div>
        </div>
        <aside className="bg-[#080808] p-5 text-[#f4f4f0] lg:p-8" aria-label="Conversation telemetry">
          <div className="flex items-center justify-between border-b border-[#f4f4f0] pb-4 font-mono text-[11px] font-bold uppercase tracking-[0.1em]"><span>Live brief / 001</span><span className="text-[#ff4a4a]">● Active</span></div>
          <div className="mt-12"><p className="font-mono text-xs uppercase tracking-[0.1em] text-[#bdbdb8]">Visitor signal</p><p className="mt-3 text-xl font-bold leading-8">“We need a customer portal in six weeks.”</p></div>
          <dl className="mt-10 grid grid-cols-2 gap-px bg-[#595959] text-sm"><div className="bg-[#080808] p-4"><dt className="font-mono text-[10px] uppercase tracking-wider text-[#bdbdb8]">Scope</dt><dd className="mt-2 font-bold">Portal</dd></div><div className="bg-[#080808] p-4"><dt className="font-mono text-[10px] uppercase tracking-wider text-[#bdbdb8]">Timing</dt><dd className="mt-2 font-bold">6 weeks</dd></div><div className="bg-[#080808] p-4"><dt className="font-mono text-[10px] uppercase tracking-wider text-[#bdbdb8]">Route</dt><dd className="mt-2 font-bold">Consultant</dd></div><div className="bg-[#e61919] p-4 text-white"><dt className="font-mono text-[10px] uppercase tracking-wider">Status</dt><dd className="mt-2 font-bold">Ready</dd></div></dl>
          <div className="mt-10 border-t border-[#f4f4f0] pt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-[#bdbdb8]">[ intake → qualify → handoff ]</div>
        </aside>
      </section>

      <section id="services" className="border-y border-[#080808] bg-white"><div className="mx-auto max-w-7xl border-x border-[#080808]"><div className="grid lg:grid-cols-[.72fr_1.28fr]"><header className="border-b border-[#080808] p-5 lg:border-b-0 lg:border-r lg:p-8"><p className="font-mono text-xs font-bold uppercase tracking-[.12em] text-[#e61919]">System components</p><h2 className="mt-5 font-display text-5xl font-black leading-[.9] tracking-[-.05em]">BUILT FOR REAL CONVERSATIONS.</h2></header><p className="max-w-3xl self-end p-5 text-lg font-semibold leading-8 text-[#252525] lg:p-8">No generic chatbot theatre. Each part has a job: discover the need, qualify the work, and let an expert take over without restarting the conversation.</p></div><div className="grid gap-px border-t border-[#080808] bg-[#080808] md:grid-cols-3"><Feature icon={<MessageSquareText />} code="UNIT / 01" title="Discover" copy="Ask the right questions in plain language, with enough structure to make progress." /><Feature icon={<FileText />} code="UNIT / 02" title="Qualify" copy="Turn scope, timeline, budget, and requirements into a concise working brief." /><Feature icon={<Headphones />} code="UNIT / 03" title="Hand off" copy="Bring in the right person while the full context is still on the table." /></div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl border-x border-[#080808]"><div className="grid lg:grid-cols-[.9fr_1.1fr]"><div className="bg-[#e61919] p-6 text-white lg:border-r lg:border-[#080808] lg:p-8"><p className="font-mono text-xs font-bold uppercase tracking-[.12em]">Protocol / visitor to brief</p><h2 className="mt-6 font-display text-6xl font-black leading-[.85] tracking-[-.06em]">SPEED<br />WITH<br />CONTEXT.</h2></div><ol className="divide-y divide-[#080808] bg-[#f4f4f0]"><Step number="A" title="Start with the real objective" copy="A focused prompt gets the visitor past the blank page and into the actual business problem." /><Step number="B" title="Build the brief as you talk" copy="Requirements and constraints are captured in the same conversation, not scattered across forms." /><Step number="C" title="Choose the right next action" copy="The result is a proposal, meeting, or expert handoff — with clear context attached." /></ol></div></section>

      <section id="trust" className="border-y border-[#080808] bg-[#080808] text-[#f4f4f0]"><div className="mx-auto grid max-w-7xl border-x border-[#f4f4f0] lg:grid-cols-[.8fr_1.2fr]"><div className="border-b border-[#f4f4f0] p-6 lg:border-b-0 lg:border-r lg:p-8"><p className="font-mono text-xs font-bold uppercase tracking-[.12em] text-[#ff4a4a]">Operator control</p><h2 className="mt-6 font-display text-5xl font-black leading-[.88] tracking-[-.05em]">THE HUMAN IS STILL THE EXPERT.</h2></div><div className="grid gap-px bg-[#f4f4f0] sm:grid-cols-2"><Trust icon={<ShieldCheck />} title="Context stays visible" copy="A complete conversation and the qualification signals move with the handoff." /><Trust icon={<Bot />} title="Automation stays accountable" copy="ASEP prepares the work; your team decides what happens next." /></div></div></section>

      <section id="start" className="mx-auto max-w-7xl border-x border-[#080808] bg-white p-6 lg:p-8"><div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]"><div><p className="font-mono text-xs font-bold uppercase tracking-[.12em] text-[#e61919]">Ready for intake</p><h2 className="mt-5 max-w-3xl font-display text-5xl font-black leading-[.9] tracking-[-.05em]">DESCRIBE THE JOB. WE’LL BUILD THE NEXT STEP.</h2></div><button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Open chat"]')?.click()} className="industrial-action min-h-12 bg-[#080808] px-5 text-sm font-black uppercase tracking-[.06em] text-white hover:bg-[#e61919]">Start a conversation</button></div></section>

      <button
        onClick={() => setViewMode('executive')}
        className="industrial-link fixed bottom-5 left-5 z-40 border border-[#080808] bg-white px-3 py-2 text-xs font-black uppercase tracking-[.06em]"
      >
        Executive workspace
      </button>
      <ChatWidget />
    </main>
  );
}

const Feature = ({ icon, code, title, copy }: { icon: React.ReactNode; code: string; title: string; copy: string }) => <article className="bg-white p-6"><span className="text-[#e61919]">{icon}</span><p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#e61919]">{code}</p><h3 className="mt-3 font-display text-3xl font-black tracking-[-.04em]">{title}</h3><p className="mt-4 max-w-sm leading-7 text-[#252525]">{copy}</p></article>;
const Step = ({ number, title, copy }: { number: string; title: string; copy: string }) => <li className="grid grid-cols-[auto_1fr] gap-5 p-6 lg:p-8"><span className="font-display text-4xl font-black text-[#e61919]">{number}</span><div><h3 className="text-xl font-black">{title}</h3><p className="mt-2 max-w-xl leading-7 text-[#252525]">{copy}</p></div></li>;
const Trust = ({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) => <article className="bg-[#080808] p-6 lg:p-8"><span className="text-[#ff4a4a]">{icon}</span><h3 className="mt-10 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-[#e5e5df]">{copy}</p></article>;

export default App;
