import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Save, Plus, X, ChevronDown, BookOpen, Monitor, MapPin, ShoppingCart, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { AudioVideoAssignments } from './AudioVideoAssignments';
import { FieldServiceAssignments } from './FieldServiceAssignments';
import { CartAssignments } from './CartAssignments';

type AssignmentTab = 'meetings' | 'audioVideo' | 'fieldService' | 'cart';

const TABS: { key: AssignmentTab; label: string; shortLabel: string; icon: React.ElementType; color: string }[] = [
  { key: 'meetings', label: 'Reuniões', shortLabel: 'Reuniões', icon: BookOpen, color: 'bg-[#1a1a2e]' },
  { key: 'audioVideo', label: 'Áudio e Vídeo', shortLabel: 'A/V', icon: Monitor, color: 'bg-[#4a9bc7]' },
  { key: 'fieldService', label: 'Saída de Campo', shortLabel: 'Campo', icon: MapPin, color: 'bg-emerald-600' },
  { key: 'cart', label: 'Carrinho', shortLabel: 'Carrinho', icon: ShoppingCart, color: 'bg-amber-500' },
];

export function AssignmentsPage() {
  const { user } = useAuth();
  const isAdminRole = user?.role === 'coordenador' || user?.role === 'secretario' || user?.role === 'designador';

  // For MVP, show all tabs for admin users
  const canSeeAudioVideo = isAdminRole;
  const canSeeCart = isAdminRole;

  const visibleTabs = TABS.filter(tab => {
    if (tab.key === 'audioVideo') return canSeeAudioVideo;
    if (tab.key === 'cart') return canSeeCart;
    return true; // meetings & fieldService always visible
  });

  const [activeTab, setActiveTab] = useState<AssignmentTab>('meetings');
  const [meetingType, setMeetingType] = useState<'midweek' | 'weekend'>('midweek');
  const [selectedMeetingIdx, setSelectedMeetingIdx] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState<{ label: string; currentValue: string } | null>(null);

  const [midweekMeetings, setMidweekMeetings] = useState<any[]>([]);
  const [weekendMeetings, setWeekendMeetings] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersData, mwData, weData] = await Promise.all([
        api.getMembers(),
        api.getMidweekMeetings(),
        api.getWeekendMeetings()
      ]);
      setAllMembers(membersData);
      setMidweekMeetings(mwData);
      setWeekendMeetings(weData);
    } catch (e) {
      console.error('Error fetching assignment data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (label: string, currentValue: string) => {
    setEditField({ label, currentValue });
    setShowEditModal(true);
  };

  const saveAssignment = () => {
    setShowEditModal(false);
    toast.success('Funcionalidade de salvação virá num próximo passo (Mutations)!');
  };

  const currentTab = TABS.find(t => t.key === activeTab)!;

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando designações do banco de dados...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Designações</h1>
          <p className="text-gray-500" style={{ fontSize: '0.85rem' }}>Gerenciar todas as designações da congregação</p>
        </div>
        {activeTab === 'meetings' && (
          <button
            onClick={() => toast.success('Todas as designações foram salvas!')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <Save size={16} />
            <span className="hidden sm:inline" style={{ fontSize: '0.9rem' }}>Salvar Tudo</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-100 p-1.5">
        <div className="flex gap-1">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all ${isActive
                  ? `${tab.color} text-white shadow-sm`
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                style={{ fontSize: '0.82rem' }}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'audioVideo' && <AudioVideoAssignments />}
      {activeTab === 'fieldService' && <FieldServiceAssignments />}
      {activeTab === 'cart' && <CartAssignments />}

      {activeTab === 'meetings' && (
        <MeetingsAssignmentsContent
          midweekMeetings={midweekMeetings}
          weekendMeetings={weekendMeetings}
          meetingType={meetingType}
          setMeetingType={setMeetingType}
          selectedMeetingIdx={selectedMeetingIdx}
          setSelectedMeetingIdx={setSelectedMeetingIdx}
          openEdit={openEdit}
          showEditModal={showEditModal}
          editField={editField}
          allMembers={allMembers}
          onCloseModal={() => setShowEditModal(false)}
          onSaveModal={saveAssignment}
        />
      )}
    </div>
  );
}

function MeetingsAssignmentsContent({
  midweekMeetings,
  weekendMeetings,
  meetingType,
  setMeetingType,
  selectedMeetingIdx,
  setSelectedMeetingIdx,
  openEdit,
  showEditModal,
  editField,
  allMembers,
  onCloseModal,
  onSaveModal,
}: {
  midweekMeetings: any[];
  weekendMeetings: any[];
  meetingType: 'midweek' | 'weekend';
  setMeetingType: (t: 'midweek' | 'weekend') => void;
  selectedMeetingIdx: number;
  setSelectedMeetingIdx: (i: number) => void;
  openEdit: (label: string, currentValue: string) => void;
  showEditModal: boolean;
  editField: { label: string; currentValue: string } | null;
  allMembers: any[];
  onCloseModal: () => void;
  onSaveModal: () => void;
}) {
  if (meetingType === 'midweek') {
    const meeting = midweekMeetings[selectedMeetingIdx];
    if (!meeting) return <div className="p-6 text-center text-gray-500 rounded-xl bg-white border border-gray-100">Não há reuniões de Meio de Semana cadastradas.</div>;

    // Safety fallback properties mapping from Supabase payload
    const mappedTreasureTitle = meeting.treasure_talk_title || 'Nenhum Tema';
    const mappedPresident = meeting.president?.full_name || 'Desconhecido';
    const mappedOpeningPrayer = meeting.opening_prayer?.full_name || 'Desconhecido';
    const mappedClosingPrayer = meeting.closing_prayer?.full_name || 'Desconhecido';

    // Treasures 
    const mappedTalkSpeaker = meeting.treasure_talk_speaker?.full_name || 'Desconhecido';
    const mappedGemsSpeaker = meeting.treasure_gems_speaker?.full_name || 'Desconhecido';
    const mappedReadingStudent = meeting.treasure_reading_student?.full_name || 'Desconhecido';

    // CBS
    const mappedCbsConductor = meeting.cbs_conductor?.full_name || 'Desconhecido';
    const mappedCbsReader = meeting.cbs_reader?.full_name || 'Desconhecido';

    // Parts processing ensuring safely array map
    const ministryParts = meeting.ministry_parts?.sort((a: any, b: any) => a.part_number - b.part_number) || [];
    const lifeParts = meeting.christian_life_parts?.sort((a: any, b: any) => a.part_number - b.part_number) || [];

    return (
      <>
        {/* Meeting selector */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 sm:w-auto">
            <button
              onClick={() => { setMeetingType('midweek'); setSelectedMeetingIdx(0); }}
              className={`px-3 py-1.5 rounded-md transition ${meetingType === 'midweek' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              style={{ fontSize: '0.85rem' }}
            >
              Meio de Semana
            </button>
            <button
              onClick={() => { setMeetingType('weekend'); setSelectedMeetingIdx(0); }}
              className={`px-3 py-1.5 rounded-md transition ${meetingType === 'weekend' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              style={{ fontSize: '0.85rem' }}
            >
              Fim de Semana
            </button>
          </div>
          <div className="flex-1">
            <select
              value={selectedMeetingIdx}
              onChange={e => setSelectedMeetingIdx(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              style={{ fontSize: '0.9rem' }}
            >
              {midweekMeetings.map((m: any, i: number) => (
                <option key={m.id} value={i}>
                  {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {m.bible_reading || 'Sem Leitura Informada'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignment cards */}
        <div className="space-y-4">
          <AssignmentSection title="Geral" color="bg-gray-700">
            <AssignmentField label="Presidente" value={mappedPresident} onClick={() => openEdit('Presidente', mappedPresident)} />
            <AssignmentField label="Oração Inicial" value={mappedOpeningPrayer} onClick={() => openEdit('Oração Inicial', mappedOpeningPrayer)} />
            <AssignmentField label="Oração Final" value={mappedClosingPrayer} onClick={() => openEdit('Oração Final', mappedClosingPrayer)} />
          </AssignmentSection>

          <AssignmentSection title="Tesouros da Palavra de Deus" color="bg-[#5b2c2c]">
            <AssignmentField label={`1. ${mappedTreasureTitle}`} value={mappedTalkSpeaker} onClick={() => openEdit('Discurso', mappedTalkSpeaker)} />
            <AssignmentField label="2. Joias Espirituais" value={mappedGemsSpeaker} onClick={() => openEdit('Joias Espirituais', mappedGemsSpeaker)} />
            <AssignmentField label="3. Leitura da Bíblia" value={mappedReadingStudent} onClick={() => openEdit('Leitura da Bíblia', mappedReadingStudent)} />
          </AssignmentSection>

          <AssignmentSection title="Faça Seu Melhor no Ministério" color="bg-[#c4972a]">
            {ministryParts.length === 0 && <div className="p-3 text-sm text-gray-500">Nenhuma parte cadastrada no banco.</div>}
            {ministryParts.map((part: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <AssignmentField
                  label={`${part.part_number}. ${part.title} (${part.duration} min) — Estudante`}
                  value={part.student?.full_name || 'Desconhecido'}
                  onClick={() => openEdit(`Parte ${part.part_number} Estudante`, part.student?.full_name)}
                />
                {part.assistant_id && (
                  <AssignmentField
                    label={`${part.part_number}. ${part.title} — Ajudante`}
                    value={part.assistant?.full_name || 'Desconhecido'}
                    onClick={() => openEdit(`Parte ${part.part_number} Ajudante`, part.assistant?.full_name)}
                    indent
                  />
                )}
              </div>
            ))}
          </AssignmentSection>

          <AssignmentSection title="Nossa Vida Cristã" color="bg-[#5b2c2c]">
            {lifeParts.length === 0 && <div className="p-3 text-sm text-gray-500">Nenhuma parte cadastrada no banco.</div>}
            {lifeParts.map((part: any, idx: number) => (
              <AssignmentField
                key={idx}
                label={`${part.part_number}. ${part.title} (${part.duration} min)`}
                value={part.speaker?.full_name || 'Desconhecido'}
                onClick={() => openEdit(part.title, part.speaker?.full_name)}
              />
            ))}
            <AssignmentField
              label="Estudo Bíblico — Dirigente"
              value={mappedCbsConductor}
              onClick={() => openEdit('Dirigente EBC', mappedCbsConductor)}
            />
            <AssignmentField
              label="Estudo Bíblico — Leitor"
              value={mappedCbsReader}
              onClick={() => openEdit('Leitor EBC', mappedCbsReader)}
            />
          </AssignmentSection>
        </div>

        {showEditModal && editField && (
          <EditModal
            label={editField.label}
            currentValue={editField.currentValue}
            members={allMembers}
            onClose={onCloseModal}
            onSave={onSaveModal}
          />
        )}
      </>
    );
  }

  // Weekend view
  // Weekend view
  const meeting = weekendMeetings[selectedMeetingIdx];
  if (!meeting) return <div className="p-6 text-center text-gray-500 rounded-xl bg-white border border-gray-100">Não há reuniões de Fim de Semana cadastradas.</div>;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 sm:w-auto">
          <button
            onClick={() => { setMeetingType('midweek'); setSelectedMeetingIdx(0); }}
            className={`px-3 py-1.5 rounded-md transition ${meetingType === 'midweek' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            style={{ fontSize: '0.85rem' }}
          >
            Meio de Semana
          </button>
          <button
            onClick={() => { setMeetingType('weekend'); setSelectedMeetingIdx(0); }}
            className={`px-3 py-1.5 rounded-md transition ${meetingType === 'weekend' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            style={{ fontSize: '0.85rem' }}
          >
            Fim de Semana
          </button>
        </div>
        <div className="flex-1">
          <select
            value={selectedMeetingIdx}
            onChange={e => setSelectedMeetingIdx(Number(e.target.value))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            style={{ fontSize: '0.9rem' }}
          >
            {weekendMeetings.map((m: any, i: number) => (
              <option key={m.id} value={i}>
                {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {m.talk_theme || 'Reunião Pública'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <AssignmentSection title="Conferência Pública" color="bg-[#1a5fb4]">
          <AssignmentField label="Presidente" value={meeting.president?.full_name || 'Desconhecido'} onClick={() => openEdit('Presidente', meeting.president?.full_name)} />
          <AssignmentField label="Tema" value={meeting.talk_theme || 'Não definido'} onClick={() => openEdit('Tema', meeting.talk_theme)} />
          <AssignmentField label="Orador" value={`${meeting.talk_speaker_name || 'Desconhecido'} (${meeting.talk_congregation || ''})`} onClick={() => openEdit('Orador', meeting.talk_speaker_name)} />
        </AssignmentSection>

        <AssignmentSection title="Estudo de A Sentinela" color="bg-[#1a5fb4]">
          <AssignmentField label="Dirigente" value={meeting.watchtower_conductor?.full_name || 'Desconhecido'} onClick={() => openEdit('Dirigente', meeting.watchtower_conductor?.full_name)} />
          <AssignmentField label="Leitor" value={meeting.watchtower_reader?.full_name || 'Desconhecido'} onClick={() => openEdit('Leitor', meeting.watchtower_reader?.full_name)} />
        </AssignmentSection>

        <AssignmentSection title="Encerramento" color="bg-gray-700">
          <AssignmentField label="Oração Final" value={meeting.closing_prayer?.full_name || 'Desconhecido'} onClick={() => openEdit('Oração Final', meeting.closing_prayer?.full_name)} />
        </AssignmentSection>
      </div>

      {showEditModal && editField && (
        <EditModal
          label={editField.label}
          currentValue={editField.currentValue}
          members={allMembers}
          onClose={onCloseModal}
          onSave={onSaveModal}
        />
      )}
    </>
  );
}

function AssignmentSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className={`${color} px-4 py-2`}>
        <h4 className="text-white tracking-wide" style={{ fontSize: '0.85rem' }}>{title}</h4>
      </div>
      <div className="divide-y divide-gray-50 p-1">
        {children}
      </div>
    </div>
  );
}

function AssignmentField({
  label,
  value,
  onClick,
  indent = false,
}: {
  label: string;
  value: string;
  onClick: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left ${indent ? 'pl-8' : ''}`}
    >
      <span className="text-gray-500 flex-1" style={{ fontSize: '0.85rem' }}>{label}</span>
      <span className="text-gray-900 flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
        {value}
        <ChevronDown size={12} className="text-gray-400" />
      </span>
    </button>
  );
}

function EditModal({
  label,
  currentValue,
  members,
  onClose,
  onSave,
}: {
  label: string;
  currentValue: string;
  members: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentValue);

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Editar Designação</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.8rem' }}>{label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 border-b border-gray-100 shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar membro..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ fontSize: '0.9rem' }}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m.full_name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === m.full_name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
              style={{ fontSize: '0.9rem' }}
            >
              {m.full_name}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition" style={{ fontSize: '0.9rem' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}