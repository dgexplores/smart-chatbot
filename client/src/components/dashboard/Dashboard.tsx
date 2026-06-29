import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Users, MessageSquare, BookOpen, UserCheck, ShieldAlert, Send, FilePlus, Database, Phone, Bell, FileText, Calendar, Plus, ExternalLink } from 'lucide-react';

interface LeadData {
  _id: string;
  sessionId: string;
  customerName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  budget?: string;
  timeline?: string;
  leadScore: number;
  leadPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HOT';
  status: string;
  notes?: string;
  reminders?: { title: string; date: string; completed: boolean }[];
  updatedAt: string;
}

interface ChatMessage {
  sender: 'CUSTOMER' | 'AI' | 'EXECUTIVE' | 'SYSTEM';
  message: string;
  timestamp: string;
}

interface CrmPanelProps {
  lead: LeadData;
  serverUrl: string;
  fetchLeads: () => void;
  activeMeeting: any;
  activeProposal: any;
}

const CrmPanel: React.FC<CrmPanelProps> = ({ lead, serverUrl, fetchLeads, activeMeeting, activeProposal }) => {
  const [notes, setNotes] = useState(lead.notes || '');
  const [reminders, setReminders] = useState<any[]>(lead.reminders || []);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Sync state with lead prop changes
  useEffect(() => {
    setNotes(lead.notes || '');
    setReminders(lead.reminders || []);
  }, [lead]);

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    fetch(`${serverUrl}/api/v1/leads/${lead._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    })
      .then((res) => res.json())
      .then((data) => {
        setIsSavingNotes(false);
        if (data.success) {
          alert('Quick notes saved successfully!');
          fetchLeads();
        }
      })
      .catch((err) => {
        setIsSavingNotes(false);
        console.error('[CRM Panel] Error saving notes:', err);
      });
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderDate) return;

    const newReminder = {
      title: newReminderTitle,
      date: new Date(newReminderDate).toISOString(),
      completed: false
    };

    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);

    fetch(`${serverUrl}/api/v1/leads/${lead._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminders: updatedReminders })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNewReminderTitle('');
          setNewReminderDate('');
          fetchLeads();
        }
      })
      .catch((err) => console.error('[CRM Panel] Error setting reminder:', err));
  };

  const handleToggleReminder = (index: number) => {
    const updated = reminders.map((rem, i) => i === index ? { ...rem, completed: !rem.completed } : rem);
    setReminders(updated);

    fetch(`${serverUrl}/api/v1/leads/${lead._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminders: updated })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchLeads();
        }
      })
      .catch((err) => console.error('[CRM Panel] Error completing reminder:', err));
  };

  return (
    <div className="w-96 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto h-full">
      {/* CRM Section: Profile Card */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="font-bold text-sm text-slate-400 mb-3 uppercase tracking-wider">CRM Lead Card</h3>
        <div className="space-y-1">
          <h4 className="font-bold text-lg text-slate-200">{lead.customerName || 'Anonymous Visitor'}</h4>
          <p className="text-xs text-slate-400">{lead.companyName || 'No Company specified'}</p>
          <div className="flex gap-2 mt-2">
            <span className="bg-blue-500/10 text-primary-light border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
              Score: {lead.leadScore}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              lead.leadPriority === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              Priority: {lead.leadPriority}
            </span>
          </div>
        </div>

        {/* Action Call & Email Shortcuts */}
        <div className="mt-4 flex gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800/60 text-slate-200 hover:text-white py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all duration-200"
            >
              <Phone className="w-3.5 h-3.5 text-green-500" />
              Call Client
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800/60 text-slate-200 hover:text-white py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all duration-200"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Email Client
            </a>
          )}
        </div>
      </div>

      {/* Meet Link direct access */}
      {activeMeeting && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            Scheduled Callback
          </div>
          <p className="text-xs text-slate-300">
            📅 {new Date(activeMeeting.meetingDate).toLocaleString()}
          </p>
          <a
            href={activeMeeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200"
          >
            Join Google Meet
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Proposal Spec */}
      {activeProposal && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            Active Proposal
          </div>
          <p className="text-xs text-slate-300">
            Estimated Cost: <strong className="text-slate-100">₹{activeProposal.estimatedCost.toLocaleString('en-IN')}</strong>
          </p>
          <a
            href={activeProposal.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200"
          >
            View PDF Spec
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Quick Notes (Ground-Level Context) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-primary" />
          Quick Notes (Use Case)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write custom requirements, notes, or discount requests discussed with user..."
          className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary resize-none"
        />
        <button
          onClick={handleSaveNotes}
          disabled={isSavingNotes}
          className="w-full bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 rounded-xl transition-all duration-200"
        >
          {isSavingNotes ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Reminders list */}
      <div className="space-y-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Bell className="w-4 h-4 text-amber-500" />
          Set Callback Reminders
        </div>

        {/* Existing Reminders */}
        {reminders.length > 0 ? (
          <div className="space-y-1.5 overflow-y-auto max-h-40 border border-slate-900 rounded-xl p-2 bg-slate-900/10">
            {reminders.map((rem, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-900/30 border border-slate-900 p-2 rounded-lg text-xs gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={rem.completed}
                    onChange={() => handleToggleReminder(i)}
                    className="mt-0.5 cursor-pointer accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${rem.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                      {rem.title}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      🔔 {new Date(rem.date).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-600 italic">No reminders set yet for this lead.</p>
        )}

        {/* Add Reminder Form */}
        <form onSubmit={handleAddReminder} className="space-y-2 mt-auto">
          <input
            type="text"
            value={newReminderTitle}
            onChange={(e) => setNewReminderTitle(e.target.value)}
            placeholder="e.g. Call client back about discount"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary"
            required
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={newReminderDate}
              onChange={(e) => setNewReminderDate(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 focus:outline-none focus:border-primary"
              required
            />
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-3.5 rounded-xl flex items-center justify-center transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'chats' | 'knowledge'>('leads');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [takeoverActive, setTakeoverActive] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [activeMeeting, setActiveMeeting] = useState<any>(null);
  const [activeProposal, setActiveProposal] = useState<any>(null);
  
  // Knowledge Base fields
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('SERVICES');
  const [docContent, setDocContent] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Load Leads on start
  useEffect(() => {
    fetchLeads();

    // Connect to Sockets as Executive
    const socket = io(serverUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('executive:join');

    socket.on('lead:created', () => fetchLeads());
    socket.on('lead:updated', () => {
      fetchLeads();
      if (selectedSessionId) {
        fetch(`${serverUrl}/api/v1/sessions/${selectedSessionId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data) {
              if (data.meeting) setActiveMeeting(data.meeting);
              if (data.proposal) setActiveProposal(data.proposal);
            }
          });
      }
    });
    socket.on('notification:new', (notif) => {
      alert(`[Notification Alert] ${notif.title}: ${notif.message}`);
      fetchLeads();
    });

    socket.on('conversation:message_logged', ({ sessionId, message }) => {
      if (selectedSessionId === sessionId) {
        setChatHistory((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSessionId]);

  const fetchLeads = () => {
    fetch(`${serverUrl}/api/v1/leads`)
      .then((res) => {
        if (res.ok) return res.json();
        return { data: [] };
      })
      .then((res) => {
        if (res.data) setLeads(res.data);
      })
      .catch((err) => console.error('[Dashboard] Error fetching leads:', err));
  };

  // Load Chat details for a specific session
  const handleSelectLead = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setChatHistory([]);
    setTakeoverActive(false);
    setActiveMeeting(null);
    setActiveProposal(null);

    // Fetch conversation details to check takeover state
    fetch(`${serverUrl}/api/v1/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.messages) {
          setChatHistory(data.messages);
        }
        // Verify AI paused status
        if (data && data.conversation) {
          setTakeoverActive(data.conversation.conversationStatus === 'PAUSED');
        }
        if (data && data.meeting) {
          setActiveMeeting(data.meeting);
        }
        if (data && data.proposal) {
          setActiveProposal(data.proposal);
        }
      })
      .catch((err) => console.error('[Dashboard] Error loading session messages:', err));
  };

  // Toggle takeover
  const handleTakeoverToggle = () => {
    if (!selectedSessionId) return;

    if (!takeoverActive) {
      // Trigger takeover
      socketRef.current?.emit('executive:takeover', {
        sessionId: selectedSessionId,
        executiveId: 'default_exec_id' // Mock Executive ID
      });
      setTakeoverActive(true);
    } else {
      // Release control back to AI
      socketRef.current?.emit('executive:release', {
        sessionId: selectedSessionId
      });
      setTakeoverActive(false);
    }
  };

  // Send message from dashboard
  const handleSendMessage = () => {
    if (!dashboardMessage.trim() || !selectedSessionId) return;

    const payload = {
      sessionId: selectedSessionId,
      sender: 'EXECUTIVE',
      senderId: 'default_exec_id',
      message: dashboardMessage,
      timestamp: new Date().toISOString()
    };

    socketRef.current?.emit('chat:message', payload);

    setDashboardMessage('');
  };

  // Handle document upload for RAG
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;

    setUploadStatus('Processing embeddings...');

    fetch(`${serverUrl}/api/v1/knowledge/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: docTitle,
        category: docCategory,
        content: docContent,
        source: 'dashboard_upload'
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUploadStatus('Document uploaded and Qdrant indexed successfully!');
          setDocTitle('');
          setDocContent('');
        } else {
          setUploadStatus(`Error: ${data.message}`);
        }
      })
      .catch((err) => {
        setUploadStatus('Network error uploading document.');
        console.error(err);
      });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            E
          </div>
          <div>
            <h1 className="font-bold text-md leading-tight">ASEP Executive Dashboard</h1>
            <span className="text-[10px] text-slate-400">XYZ Technologies Operations Hub</span>
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            Server: Connected
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-4 gap-2">
          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'leads' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Leads Pipeline
          </button>
          <button
            onClick={() => {
              setActiveTab('chats');
              if (leads.length > 0 && !selectedSessionId) {
                handleSelectLead(leads[0].sessionId);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'chats' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Live Interactions
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'knowledge' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            RAG Knowledge Base
          </button>
        </div>

        {/* Workspace Panels */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Sales Lead Pipelines</h2>
                <button onClick={fetchLeads} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                  🔄 Refresh leads
                </button>
              </div>

              {leads.length === 0 ? (
                <div className="text-center py-20 bg-slate-950 rounded-2xl border border-slate-800 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                  <p className="font-semibold">No leads captured yet.</p>
                  <p className="text-xs mt-1">Leads appear here automatically once visitor details are qualified by the AI.</p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-900/40">
                        <th className="p-4">Customer</th>
                        <th className="p-4">Company</th>
                        <th className="p-4">Email</th>
                        <th className="p-4 text-center">Score</th>
                        <th className="p-4 text-center">Priority</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm">
                      {leads.map((lead) => (
                        <tr key={lead._id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-4 font-semibold text-slate-200">{lead.customerName || 'Anonymous Visitor'}</td>
                          <td className="p-4 text-slate-400">{lead.companyName || 'N/A'}</td>
                          <td className="p-4 text-slate-400">{lead.email || 'N/A'}</td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-800 text-blue-400 font-bold px-2 py-0.5 rounded text-xs">
                              {lead.leadScore}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                lead.leadPriority === 'HOT'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : lead.leadPriority === 'HIGH'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {lead.leadPriority}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="bg-blue-500/10 text-primary-light px-2 py-0.5 rounded text-xs font-semibold">
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                handleSelectLead(lead.sessionId);
                                setActiveTab('chats');
                              }}
                              className="bg-primary hover:bg-primary-dark text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold"
                            >
                              Open Chat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="h-[calc(100vh-140px)] flex gap-6">
              {/* Sidebar list of active sessions */}
              <div className="w-80 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col gap-3">
                <h3 className="font-bold text-sm text-slate-400">Conversations Stream</h3>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {leads.map((l) => (
                    <button
                      key={l._id}
                      onClick={() => handleSelectLead(l.sessionId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                        selectedSessionId === l.sessionId
                          ? 'bg-slate-800 border-primary text-white'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-200 truncate">{l.customerName || 'Anonymous Visitor'}</p>
                      <span className="text-[10px] block mt-1 opacity-70">ID: {l.sessionId}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat panel */}
              <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                {selectedSessionId ? (
                  <>
                    {/* Chat Header / Takeover control */}
                    <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">Active Session Stream</h3>
                        <span className="text-[10px] text-slate-400">Session Key: {selectedSessionId}</span>
                      </div>
                      <button
                        onClick={handleTakeoverToggle}
                        className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-2 border transition-all duration-300 ${
                          takeoverActive
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            : 'bg-primary hover:bg-primary-dark text-white border-transparent'
                        }`}
                      >
                        {takeoverActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {takeoverActive ? 'Release takeover (Resume AI)' : 'Take Over Chat'}
                      </button>
                    </div>

                    {/* Active Meeting / Proposal Indicators */}
                    {(activeMeeting || activeProposal) && (
                      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-4 items-center text-xs">
                        {activeMeeting && (
                          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                            <span className="font-bold uppercase tracking-wider text-[9px] bg-amber-500/20 px-1 py-0.5 rounded">Call Scheduled</span>
                            <span>📅 {new Date(activeMeeting.meetingDate).toLocaleString()}</span>
                            <a
                              href={activeMeeting.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:underline bg-amber-500/30 px-2 py-0.5 rounded font-bold"
                            >
                              Join Google Meet
                            </a>
                          </div>
                        )}
                        {activeProposal && (
                          <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                            <span className="font-bold uppercase tracking-wider text-[9px] bg-blue-500/20 px-1 py-0.5 rounded">Proposal Specs</span>
                            <span>Estimate: ₹{activeProposal.estimatedCost.toLocaleString('en-IN')}</span>
                            <a
                              href={activeProposal.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:underline bg-blue-500/30 px-2 py-0.5 rounded font-bold"
                            >
                              View PDF Specification
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat Log */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/10">
                      {chatHistory.map((msg, index) => {
                        const isCustomer = msg.sender === 'CUSTOMER';
                        const isSystem = msg.sender === 'SYSTEM';

                        if (isSystem) {
                          return (
                            <div key={index} className="text-center">
                              <span className="inline-block text-[10px] font-bold bg-slate-800/80 border border-slate-700/60 text-slate-400 px-3 py-1 rounded-full">
                                {msg.message}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={index} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} items-start gap-2`}>
                            <div className="max-w-[70%] space-y-1">
                              <div
                                className={`p-3 rounded-xl text-sm ${
                                  isCustomer
                                    ? 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50'
                                    : msg.sender === 'AI'
                                    ? 'bg-blue-500/10 text-primary-light border border-blue-500/20 rounded-br-none'
                                    : 'bg-primary text-white rounded-br-none'
                                }`}
                              >
                                <span className="text-[10px] block opacity-50 font-bold mb-1">{msg.sender}</span>
                                <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat input for takeover */}
                    <div className="p-3 bg-slate-900/20 border-t border-slate-800 flex gap-2">
                      <input
                        type="text"
                        value={dashboardMessage}
                        onChange={(e) => setDashboardMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={!takeoverActive}
                        placeholder={
                          takeoverActive
                            ? 'Send live message as Human Consultant...'
                            : 'Click "Take Over Chat" above to write messages directly...'
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!takeoverActive}
                        className="bg-primary hover:bg-primary-dark disabled:opacity-40 text-white px-4 py-2.5 rounded-xl shadow-md transition-all duration-300 active:scale-95 flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-500 flex-1 flex flex-col items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-slate-800 mb-4" />
                    <p className="font-semibold">No conversation selected.</p>
                    <p className="text-xs">Click a conversation stream item on the left to monitor active logs.</p>
                  </div>
                )}
              </div>

              {/* CRM / Lead Details Panel */}
              {selectedSessionId && (() => {
                const lead = leads.find((l) => l.sessionId === selectedSessionId);
                if (!lead) return null;
                return <CrmPanel lead={lead} serverUrl={serverUrl} fetchLeads={fetchLeads} activeMeeting={activeMeeting} activeProposal={activeProposal} />;
              })()}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="max-w-2xl bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="font-bold text-lg">RAG Knowledge Ingestion Portal</h3>
                  <p className="text-xs text-slate-400">Add company details (pricing, services, FAQ) directly to the Qdrant vector database.</p>
                </div>
              </div>

              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-slate-400 font-bold uppercase">Document Title</label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g. Starter Package Details"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-slate-400 font-bold uppercase">Metadata Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="SERVICES">Services</option>
                      <option value="PRICING">Pricing</option>
                      <option value="FAQ">FAQ / Support</option>
                      <option value="PORTFOLIO">Portfolio</option>
                      <option value="TECH_STACK">Tech Stack</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">Knowledge Content</label>
                  <textarea
                    rows={6}
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Write detailed specifications. The Character Splitter engine will split content and index them into cosine-similar points in Qdrant."
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
                >
                  <FilePlus className="w-4 h-4" />
                  Index Content to Qdrant
                </button>
              </form>

              {uploadStatus && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-center text-primary-light font-medium">
                  {uploadStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
