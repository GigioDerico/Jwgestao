import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api, type DesignationHistoryEntry } from '../lib/api';

type HistorySource = DesignationHistoryEntry['source'];
type SourceFilter = 'all' | HistorySource;
type SourceFilterMode = 'select' | 'tabs' | 'hidden';

type MemberHistoryStats = {
  memberId: string | null;
  memberName: string;
  total: number;
  last30: number;
  last60: number;
  last90: number;
  lastDate: string | null;
  byDesignation: Record<string, { label: string; count: number }>;
};

type AssignmentHistoryProps = {
  allowedSources?: HistorySource[];
  defaultMonths?: number;
  title?: string;
  description?: string;
  showHeader?: boolean;
  sourceFilterMode?: SourceFilterMode;
  sourceFilterLabel?: string;
  allowAllSources?: boolean;
  defaultSource?: HistorySource;
  enableDesignationFilter?: boolean;
  designationFilterLabel?: string;
};

const SOURCE_OPTIONS: Array<{ value: HistorySource; label: string }> = [
  { value: 'midweek', label: 'Reunião de Meio de Semana' },
  { value: 'weekend', label: 'Reunião de Fim de Semana' },
  { value: 'audio_video', label: 'Áudio e Vídeo' },
  { value: 'field_service', label: 'Saída de Campo' },
  { value: 'cart', label: 'Carrinho' },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sem histórico';
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('pt-BR');
}

function getSourceLabel(source: HistorySource) {
  return SOURCE_OPTIONS.find(option => option.value === source)?.label || source;
}

function getDesignationIdentity(entry: DesignationHistoryEntry) {
  if (entry.source === 'audio_video') {
    if (entry.roleKey === 'sound') {
      return { key: 'audio_video_sound', label: 'Som' };
    }
    if (entry.roleKey === 'image') {
      return { key: 'audio_video_image', label: 'Imagem' };
    }
    if (entry.roleKey === 'stage') {
      return { key: 'audio_video_stage', label: 'Palco' };
    }
    if (entry.roleKey.startsWith('roving_mic_')) {
      return { key: 'audio_video_volantes', label: 'Microfones Volantes (1 e 2)' };
    }
    if (entry.roleKey.startsWith('attendant_')) {
      return { key: 'audio_video_indicadores', label: 'Indicadores (Entradas / Auditório)' };
    }
  }

  return { key: entry.roleKey, label: entry.roleLabel };
}

export function AssignmentHistory({
  allowedSources,
  defaultMonths = 12,
  title = 'Histórico de Designações',
  description,
  showHeader = true,
  sourceFilterMode = 'select',
  sourceFilterLabel = 'Tipo',
  allowAllSources,
  defaultSource,
  enableDesignationFilter = false,
  designationFilterLabel = 'Designação',
}: AssignmentHistoryProps) {
  const resolvedAllowAllSources = allowAllSources ?? (sourceFilterMode !== 'tabs');
  const [months, setMonths] = useState(defaultMonths);
  const [entries, setEntries] = useState<DesignationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() => {
    if (sourceFilterMode === 'tabs' || !resolvedAllowAllSources) {
      if (defaultSource) {
        return defaultSource;
      }
      if (allowedSources && allowedSources.length > 0) {
        return allowedSources[0];
      }
    }
    return 'all';
  });
  const [designationFilter, setDesignationFilter] = useState<'all' | string>('all');
  const [refreshToken, setRefreshToken] = useState(0);

  const sourceOptions = useMemo(() => {
    if (!allowedSources || allowedSources.length === 0) {
      return SOURCE_OPTIONS;
    }

    const allowedSet = new Set(allowedSources);
    return SOURCE_OPTIONS.filter(option => allowedSet.has(option.value));
  }, [allowedSources]);

  const allowedSourceSet = useMemo(() => new Set(sourceOptions.map(option => option.value)), [sourceOptions]);

  useEffect(() => {
    if (sourceOptions.length === 0) {
      return;
    }

    if (sourceFilter === 'all' && !resolvedAllowAllSources) {
      setSourceFilter(defaultSource && allowedSourceSet.has(defaultSource) ? defaultSource : sourceOptions[0].value);
      return;
    }

    if (sourceFilter === 'all') {
      return;
    }

    if (!allowedSourceSet.has(sourceFilter)) {
      setSourceFilter(defaultSource && allowedSourceSet.has(defaultSource) ? defaultSource : (resolvedAllowAllSources ? 'all' : sourceOptions[0].value));
      return;
    }

    if (sourceFilterMode === 'tabs' && sourceFilter === 'all') {
      setSourceFilter(sourceOptions[0].value);
    }
  }, [allowedSourceSet, defaultSource, resolvedAllowAllSources, sourceFilter, sourceFilterMode, sourceOptions]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const historyRows = await api.getDesignationHistory(months);
        setEntries(historyRows);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar histórico de designações.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [months, refreshToken]);

  const scopedEntries = useMemo(
    () => entries.filter(entry => allowedSourceSet.has(entry.source)),
    [allowedSourceSet, entries]
  );

  const sourceFilteredEntries = useMemo(() => {
    return scopedEntries.filter(entry => {
      if (sourceFilter === 'all') {
        return true;
      }

      return entry.source === sourceFilter;
    });
  }, [scopedEntries, sourceFilter]);

  const designationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of sourceFilteredEntries) {
      const designation = getDesignationIdentity(entry);
      if (!map.has(designation.key)) {
        map.set(designation.key, designation.label);
      }
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [sourceFilteredEntries]);

  useEffect(() => {
    setDesignationFilter('all');
  }, [sourceFilter]);

  useEffect(() => {
    if (designationFilter === 'all') {
      return;
    }

    if (!designationOptions.some(option => option.value === designationFilter)) {
      setDesignationFilter('all');
    }
  }, [designationFilter, designationOptions]);

  const activeEntries = useMemo(() => {
    return sourceFilteredEntries.filter(entry => {
      if (!enableDesignationFilter) {
        return true;
      }

      if (designationFilter === 'all') {
        return true;
      }

      return getDesignationIdentity(entry).key === designationFilter;
    });
  }, [designationFilter, enableDesignationFilter, sourceFilteredEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return activeEntries.filter(entry => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = normalizeText(
        `${entry.memberName} ${entry.roleLabel} ${entry.details || ''} ${getSourceLabel(entry.source)}`
      );

      return haystack.includes(normalizedSearch);
    });
  }, [activeEntries, search]);

  const memberStats = useMemo(() => {
    const now = new Date();
    const cutoff30 = new Date(now);
    cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff60 = new Date(now);
    cutoff60.setDate(cutoff60.getDate() - 60);
    const cutoff90 = new Date(now);
    cutoff90.setDate(cutoff90.getDate() - 90);

    const stats = new Map<string, MemberHistoryStats>();

    for (const entry of activeEntries) {
      const key = entry.memberId ? `id:${entry.memberId}` : `name:${normalizeText(entry.memberName)}`;
      const current = stats.get(key) || {
        memberId: entry.memberId || null,
        memberName: entry.memberName,
        total: 0,
        last30: 0,
        last60: 0,
        last90: 0,
        lastDate: null,
        byDesignation: {},
      };

      const designationIdentity = getDesignationIdentity(entry);
      current.total += 1;
      const currentDesignationCount = current.byDesignation[designationIdentity.key]?.count || 0;
      current.byDesignation[designationIdentity.key] = {
        label: designationIdentity.label,
        count: currentDesignationCount + 1,
      };

      if (!current.lastDate || entry.date > current.lastDate) {
        current.lastDate = entry.date;
      }

      const entryDate = new Date(`${entry.date}T12:00:00`);
      if (!Number.isNaN(entryDate.getTime())) {
        if (entryDate >= cutoff90) {
          current.last90 += 1;
        }
        if (entryDate >= cutoff60) {
          current.last60 += 1;
        }
        if (entryDate >= cutoff30) {
          current.last30 += 1;
        }
      }

      stats.set(key, current);
    }

    return Array.from(stats.values()).sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.memberName.localeCompare(b.memberName, 'pt-BR');
    });
  }, [activeEntries]);

  const totals = useMemo(() => {
    const assignedMembers = memberStats.length;
    const noRecent90 = memberStats.filter(item => item.last90 === 0).length;
    const average = assignedMembers > 0 ? activeEntries.length / assignedMembers : 0;

    return {
      entries: activeEntries.length,
      assignedMembers,
      noRecent90,
      average,
    };
  }, [activeEntries.length, memberStats]);

  const suggestions = useMemo(() => {
    const byPriority = memberStats
      .filter(item => item.memberId !== null)
      .sort((a, b) => {
        if (a.last90 !== b.last90) {
          return a.last90 - b.last90;
        }
        const aLast = a.lastDate || '';
        const bLast = b.lastDate || '';
        if (aLast !== bLast) {
          return aLast.localeCompare(bLast);
        }
        return a.memberName.localeCompare(b.memberName, 'pt-BR');
      })
      .slice(0, 6);

    const overloaded = memberStats
      .filter(item => item.memberId !== null && item.last60 > 0)
      .sort((a, b) => {
        if (b.last60 !== a.last60) {
          return b.last60 - a.last60;
        }
        return b.total - a.total;
      })
      .slice(0, 6);

    return { byPriority, overloaded };
  }, [memberStats]);

  const recentEntries = useMemo(() => filteredEntries.slice(0, 250), [filteredEntries]);

  const resolvedDescription = description || `Dados dos últimos meses para ${sourceOptions.map(option => option.label).join(', ')}.`;
  const showSourceSelect = sourceFilterMode === 'select' && sourceOptions.length > 1;
  const showSourceTabs = sourceFilterMode === 'tabs' && sourceOptions.length > 1;
  const showDesignationSelect = enableDesignationFilter && designationOptions.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
        {(showHeader || sourceOptions.length > 1) && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {showHeader && (
              <div>
                <h2 className="text-foreground font-semibold" style={{ fontSize: '1rem' }}>{title}</h2>
                <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
                  {resolvedDescription}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <select
                value={months}
                onChange={event => setMonths(Number(event.target.value))}
                className="h-9 rounded-md border border-border bg-background px-3 text-foreground"
                style={{ fontSize: '0.8rem' }}
              >
                <option value={3}>Últimos 3 meses</option>
                <option value={6}>Últimos 6 meses</option>
                <option value={12}>Últimos 12 meses</option>
              </select>
              <button
                type="button"
                onClick={() => setRefreshToken(token => token + 1)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-foreground hover:bg-accent"
                style={{ fontSize: '0.8rem' }}
              >
                <RefreshCw size={14} />
                Atualizar
              </button>
            </div>
          </div>
        )}

        {showSourceTabs && (
          <div className="space-y-2">
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>{sourceFilterLabel}</p>
            <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1">
              {sourceOptions.map(option => (
                <button
                  key={`source-tab-${option.value}`}
                  type="button"
                  onClick={() => setSourceFilter(option.value)}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${sourceFilter === option.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-border/80 bg-background px-3 py-2">
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Designações no período</p>
            <p className="text-foreground font-semibold" style={{ fontSize: '1.1rem' }}>{totals.entries}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background px-3 py-2">
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Membros com designação</p>
            <p className="text-foreground font-semibold" style={{ fontSize: '1.1rem' }}>{totals.assignedMembers}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background px-3 py-2">
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Sem designação recente (90 dias)</p>
            <p className="text-foreground font-semibold" style={{ fontSize: '1.1rem' }}>{totals.noRecent90}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background px-3 py-2">
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Média por membro</p>
            <p className="text-foreground font-semibold" style={{ fontSize: '1.1rem' }}>{totals.average.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="text-emerald-900 font-semibold" style={{ fontSize: '0.82rem' }}>
              Sugestões para próximas designações
            </p>
            <div className="mt-2 space-y-1.5">
              {suggestions.byPriority.length === 0 ? (
                <p className="text-emerald-900/80" style={{ fontSize: '0.78rem' }}>Sem dados suficientes.</p>
              ) : (
                suggestions.byPriority.map(item => (
                  <div key={`priority-${item.memberId || item.memberName}`} className="flex items-center justify-between gap-2">
                    <span className="text-emerald-900" style={{ fontSize: '0.78rem' }}>{item.memberName}</span>
                    <span className="text-emerald-900/80" style={{ fontSize: '0.76rem' }}>
                      90d: {item.last90} • Última: {formatDate(item.lastDate)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-amber-900 font-semibold" style={{ fontSize: '0.82rem' }}>
              Atenção de carga recente
            </p>
            <div className="mt-2 space-y-1.5">
              {suggestions.overloaded.length === 0 ? (
                <p className="text-amber-900/80" style={{ fontSize: '0.78rem' }}>Sem dados suficientes.</p>
              ) : (
                suggestions.overloaded.map(item => (
                  <div key={`overloaded-${item.memberId || item.memberName}`} className="flex items-center justify-between gap-2">
                    <span className="text-amber-900" style={{ fontSize: '0.78rem' }}>{item.memberName}</span>
                    <span className="text-amber-900/80" style={{ fontSize: '0.76rem' }}>
                      60d: {item.last60} • Total: {item.total}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <div className={`grid gap-2 ${showSourceSelect || showDesignationSelect ? 'md:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
            <div className="space-y-1">
              <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Busca</p>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Filtrar por membro, função ou detalhe..."
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                style={{ fontSize: '0.8rem' }}
              />
            </div>
            {(showSourceSelect || showDesignationSelect) && (
              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                {showSourceSelect && (
                  <div className="space-y-1 md:min-w-[220px]">
                    <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{sourceFilterLabel}</p>
                    <select
                      value={sourceFilter}
                      onChange={event => setSourceFilter(event.target.value as SourceFilter)}
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-foreground"
                      style={{ fontSize: '0.8rem' }}
                    >
                      {resolvedAllowAllSources && <option value="all">Todos os tipos</option>}
                      {sourceOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {showDesignationSelect && (
                  <div className="space-y-1 md:min-w-[220px]">
                    <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{designationFilterLabel}</p>
                    <select
                      value={designationFilter}
                      onChange={event => setDesignationFilter(event.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-foreground"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <option value="all">Todas as designações</option>
                      {designationOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            <span style={{ fontSize: '0.85rem' }}>Carregando histórico...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-muted/35">
                <tr>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Membro</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Última</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>30 dias</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>90 dias</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Distribuição</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map(item => (
                  <tr key={`member-row-${item.memberId || normalizeText(item.memberName)}`} className="border-t border-border/70">
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '0.8rem' }}>{item.memberName}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '0.78rem' }}>{formatDate(item.lastDate)}</td>
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '0.78rem' }}>{item.last30}</td>
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '0.78rem' }}>{item.last90}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '0.76rem' }}>
                      {Object.values(item.byDesignation)
                        .sort((a, b) => {
                          if (b.count !== a.count) {
                            return b.count - a.count;
                          }
                          return a.label.localeCompare(b.label, 'pt-BR');
                        })
                        .map(option => `${option.label}: ${option.count}`)
                        .join(' • ') || '-'}
                    </td>
                    <td className="px-4 py-2 text-foreground font-medium" style={{ fontSize: '0.78rem' }}>{item.total}</td>
                  </tr>
                ))}
                {memberStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                      Nenhuma designação encontrada para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <h3 className="text-foreground font-semibold" style={{ fontSize: '0.95rem' }}>
            Linha do Tempo ({filteredEntries.length})
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            <span style={{ fontSize: '0.85rem' }}>Preparando registros...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-muted/35">
                <tr>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Data</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Tipo</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Função</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Membro</th>
                  <th className="px-4 py-2 text-muted-foreground font-medium" style={{ fontSize: '0.75rem' }}>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map(entry => (
                  <tr key={entry.id} className="border-t border-border/70">
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '0.8rem' }}>{formatDate(entry.date)}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '0.78rem' }}>{getSourceLabel(entry.source)}</td>
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '0.78rem' }}>{entry.roleLabel}</td>
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '0.78rem' }}>{entry.memberName}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '0.78rem' }}>{entry.details || '-'}</td>
                  </tr>
                ))}
                {!loading && recentEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-5 text-center text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                      Sem registros para o filtro atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
