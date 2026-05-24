import { FileText, Clock, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C, FONT, FONT_HEADING, USERS } from "../lib/constants";
import { ft, totals } from "../lib/helpers";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import Avatar from "../components/Avatar";

const CHART_DATA = [
  { ho:"Jan", bevetel:420000 }, { ho:"Feb", bevetel:680000 },
  { ho:"Már", bevetel:590000 }, { ho:"Ápr", bevetel:1870000 },
  { ho:"Máj", bevetel:340000 }, { ho:"Jún", bevetel:0 },
];

export default function Dashboard({ data, user }) {
  const ml = data.munkalapok;
  const keszBrutto = ml.filter(m => m.status === "Kész").reduce((s,m) => s + totals(m.items).brutto, 0);

  const stats = [
    { label:"Összes munkalap", value:ml.length,                                              icon:FileText,   color:C.accent  },
    { label:"Folyamatban",     value:ml.filter(m=>m.status==="Folyamatban").length,          icon:Clock,      color:C.warning },
    { label:"Ütemezett",       value:ml.filter(m=>m.status==="Ütemezett").length,            icon:Calendar,   color:"#9333EA" },
    { label:"Lezárt bevétel",  value:ft(keszBrutto),                                        icon:TrendingUp, color:C.success },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT }}>
      <p style={{ color: C.textSub, marginBottom: 24, fontSize: 14 }}>
        Üdvözlöm, <b style={{ color: C.text }}>{user.name}</b>! Íme a mai összefoglaló.
      </p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>{s.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: C.text, fontFamily: FONT_HEADING }}>{s.value}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={21} color={s.color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart + recent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Havi bevétel</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>2026 – lezárt munkák bruttó összege</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DATA} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="ho" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => v === 0 ? "0" : (v / 1000000 + "M Ft")} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={62} />
              <Tooltip formatter={v => [ft(v), "Bevétel"]} contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13 }} />
              <Bar dataKey="bevetel" fill={C.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Legutóbbi munkák</h3>
          {ml.slice(0, 5).map(m => {
            const cl = data.ugyfelek.find(u => u.id === m.clientId);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={16} color={C.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{cl?.name} · {m.date}</div>
                </div>
                <StatusBadge s={m.status} />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
