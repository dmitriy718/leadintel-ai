import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Github, Newspaper, Code, MapPin, Youtube, Twitter, Radio, Linkedin } from "lucide-react";

const SOURCES = [
  { name: "Reddit", icon: MessageSquare, color: "text-orange-600" },
  { name: "Hacker News", icon: Newspaper, color: "text-amber-700" },
  { name: "GitHub", icon: Github, color: "text-stone-700" },
  { name: "Stack Overflow", icon: Code, color: "text-emerald-700" },
  { name: "Twitter", icon: Twitter, color: "text-sky-700" },
  { name: "YouTube", icon: Youtube, color: "text-red-700" },
  { name: "Google Maps", icon: MapPin, color: "text-teal-700" },
  { name: "Quora", icon: Radio, color: "text-rose-700" },
  { name: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
];

const USERNAMES = [
  "sarah_dev", "growth_mike", "founder_jane", "sales_tom", "marketing_amy",
  "cto_alex", "vp_sales_rachel", "bd_kyle", "pm_olivia", "data_dan",
];

const KEYWORDS = ["SaaS", "B2B", "marketing", "sales", "AI", "startup", "funding", "product"];

interface LeadItem {
  id: number;
  source: typeof SOURCES[number];
  username: string;
  score: number;
  keyword: string;
}

function generateLead(id: number): LeadItem {
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
  const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
  const score = Math.floor(Math.random() * 40) + 60;
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  return { id, source, username, score, keyword };
}

export default function LiveLeadFeed() {
  const [leads, setLeads] = useState<LeadItem[]>(() =>
    Array.from({ length: 5 }, (_, i) => generateLead(i))
  );
  const idCounter = useRef(5);

  useEffect(() => {
    const interval = setInterval(() => {
      idCounter.current++;
      const newLead = generateLead(idCounter.current);
      setLeads((prev) => {
        const next = [newLead, ...prev];
        return next.slice(0, 7);
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm border border-stone-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 bg-stone-100">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-1.5 w-1.5 bg-emerald-600" />
            <div className="absolute inset-0 h-1.5 w-1.5 bg-emerald-600 animate-ping opacity-75" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-600">Live Feed</span>
        </div>
        <span className="text-[10px] text-stone-400 font-mono">9 channels</span>
      </div>

      {/* Leads */}
      <div className="p-3 space-y-1.5 min-h-[300px]">
        <AnimatePresence mode="popLayout">
          {leads.map((lead) => {
            const Icon = lead.source.icon;
            return (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="flex items-center gap-3 border border-stone-100 px-3 py-2 hover:bg-stone-50 transition-colors"
              >
                <Icon className={`h-3.5 w-3.5 ${lead.source.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-800 truncate">@{lead.username}</span>
                    <span className="text-[9px] text-stone-400 shrink-0">{lead.source.name}</span>
                  </div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 border border-stone-200 text-stone-500">
                  {lead.keyword}
                </span>
                <div className="text-right shrink-0 w-8">
                  <span className={`text-xs font-bold ${
                    lead.score >= 85 ? "text-emerald-700" :
                    lead.score >= 70 ? "text-amber-700" : "text-orange-700"
                  }`}>
                    {lead.score}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400 font-mono">
        <span>1,247 found today</span>
        <span>avg: 78.4</span>
      </div>
    </div>
  );
}
