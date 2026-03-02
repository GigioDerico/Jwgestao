import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi, type LocalFieldRecord } from '../../lib/ministry-api';
import { downloadElementAsImage, downloadElementAsPdf } from '../../lib/dom-export';
import { ExportActions } from '../ExportActions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function HistoryPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [records, setRecords] = useState<LocalFieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mensal' | 'anual'>('mensal');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const exportRef = React.useRef<HTMLDivElement>(null);

  const loadRecords = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await ministryApi.getFieldRecords(userId);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [userId]);

  const { monthlyData, annualData } = useMemo(() => {
    const byMonth: Record<string, { hours: number; returnVisits: number; bibleStudies: number }> = {};
    const byYear: Record<number, { hours: number; returnVisits: number; bibleStudies: number }> = {};

    for (const r of records) {
      const date = r.date;
      const [y, m] = date.split('-').map(Number);
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;

      if (!byMonth[monthKey]) byMonth[monthKey] = { hours: 0, returnVisits: 0, bibleStudies: 0 };
      byMonth[monthKey].hours += Number(r.hours);
      byMonth[monthKey].returnVisits += r.return_visits;
      byMonth[monthKey].bibleStudies += r.bible_studies;

      if (!byYear[y]) byYear[y] = { hours: 0, returnVisits: 0, bibleStudies: 0 };
      byYear[y].hours += Number(r.hours);
      byYear[y].returnVisits += r.return_visits;
      byYear[y].bibleStudies += r.bible_studies;
    }

    const monthly = Object.entries(byMonth)
      .filter(([k]) => k.startsWith(String(selectedYear)))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        horas: Math.round(d.hours * 100) / 100,
        revisitas: d.returnVisits,
        estudos: d.bibleStudies,
      }));

    const annual = Object.entries(byYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([y, d]) => ({
        ano: y,
        horas: Math.round(d.hours * 100) / 100,
        revisitas: d.returnVisits,
        estudos: d.bibleStudies,
      }));

    return { monthlyData: monthly, annualData: annual };
  }, [records, selectedYear]);

  const handleExportImage = async () => {
    if (!exportRef.current) return;
    setExporting('image');
    try {
      await downloadElementAsImage(exportRef.current, `relatorio-ministerio-${selectedYear}.jpg`);
    } catch {
      setExporting(null);
    }
    setExporting(null);
  };

  const handleExportPdf = async () => {
    if (!exportRef.current) return;
    setExporting('pdf');
    try {
      await downloadElementAsPdf(exportRef.current, `relatorio-ministerio-${selectedYear}.pdf`);
    } catch {
      setExporting(null);
    }
    setExporting(null);
  };

  const years = useMemo(() => {
    const ys = new Set(records.map((r) => parseInt(r.date.slice(0, 4), 10)));
    ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [records]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium text-foreground">Histórico e Relatórios</h2>
        <ExportActions
          onExportImage={handleExportImage}
          onExportPdf={handleExportPdf}
          exporting={exporting}
        />
      </div>

      <Card ref={exportRef} className="border border-border rounded-xl shadow-sm bg-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Relatório do Ministério</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'mensal' | 'anual')}>
            <TabsList>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
              <TabsTrigger value="anual">Anual</TabsTrigger>
            </TabsList>
            {activeTab === 'mensal' && years.length > 0 && (
              <div className="mt-2 mb-2">
                <label className="text-sm text-muted-foreground mr-2">Ano:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-border px-2 py-1"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <TabsContent value="mensal" className="mt-4">
              {loading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : monthlyData.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum dado para exibir.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="horas" name="Horas" fill="var(--primary)" />
                      <Bar dataKey="revisitas" name="Revisitas" fill="#22c55e" />
                      <Bar dataKey="estudos" name="Estudos" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
            <TabsContent value="anual" className="mt-4">
              {loading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : annualData.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum dado para exibir.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ano" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="horas" name="Horas" fill="var(--primary)" />
                      <Bar dataKey="revisitas" name="Revisitas" fill="#22c55e" />
                      <Bar dataKey="estudos" name="Estudos" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
