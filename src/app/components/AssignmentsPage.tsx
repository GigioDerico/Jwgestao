import React, { useState } from 'react';
import { midweekMeetings, weekendMeetings, members } from '../data/mockData';
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
  const { user, member } = useAuth();
  const isAdminRole = user?.role === 'coordenador' || user?.role === 'secretario' || user?.role === 'designador';

  // Determine which tabs are visible:
  // - Reuniões & Saída de Campo: visible to everyone
  // - Áudio e Vídeo: only if approved OR admin
  // - Carrinho: only if approved OR admin
  const canSeeAudioVideo = isAdminRole || !!member?.approvedAudioVideo || !!member?.approvedIndicadores;
  const canSeeCart = isAdminRole || !!member?.approvedCarrinho;

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

  const maleMembers = members.filter(m => m.gender === 'M');
  const femaleMembers = members.filter(m => m.gender === 'F');
  const allMembers = members;

  const openEdit = (label: string, currentValue: string) => {
    setEditField({ label, currentValue });
    setShowEditModal(true);
  };

  const saveAssignment = () => {
    setShowEditModal(false);
    toast.success('Designação salva com sucesso!');
  };

  const currentTab = TABS.find(t => t.key === activeTab)!;

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
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
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
  meetingType: 'midweek' | 'weekend';
  setMeetingType: (t: 'midweek' | 'weekend') => void;
  selectedMeetingIdx: number;
  setSelectedMeetingIdx: (i: number) => void;
  openEdit: (label: string, currentValue: string) => void;
  showEditModal: boolean;
  editField: { label: string; currentValue: string } | null;
  allMembers: typeof members;
  onCloseModal: () => void;
  onSaveModal: () => void;
}) {
  if (meetingType === 'midweek') {
    const meeting = midweekMeetings[selectedMeetingIdx];
    if (!meeting) return null;

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
              {midweekMeetings.map((m, i) => (
                <option key={m.id} value={i}>
                  {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {m.bible_reading}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignment cards */}
        <div className="space-y-4">
          <AssignmentSection title="Geral" color="bg-gray-700">
            <AssignmentField label="Presidente" value={meeting.president} onClick={() => openEdit('Presidente', meeting.president)} />
            <AssignmentField label="Oração Inicial" value={meeting.opening_prayer} onClick={() => openEdit('Oração Inicial', meeting.opening_prayer)} />
            <AssignmentField label="Oração Final" value={meeting.closing_prayer} onClick={() => openEdit('Oração Final', meeting.closing_prayer)} />
          </AssignmentSection>

          <AssignmentSection title="Tesouros da Palavra de Deus" color="bg-[#5b2c2c]">
            <AssignmentField label={`1. ${meeting.treasures.talk.title}`} value={meeting.treasures.talk.speaker} onClick={() => openEdit('Discurso', meeting.treasures.talk.speaker)} />
            <AssignmentField label="2. Joias Espirituais" value={meeting.treasures.spiritual_gems.speaker} onClick={() => openEdit('Joias Espirituais', meeting.treasures.spiritual_gems.speaker)} />
            <AssignmentField label="3. Leitura da Bíblia" value={meeting.treasures.bible_reading.student} onClick={() => openEdit('Leitura da Bíblia', meeting.treasures.bible_reading.student)} />
          </AssignmentSection>

          <AssignmentSection title="Faça Seu Melhor no Ministério" color="bg-[#c4972a]">
            {meeting.ministry.parts.map((part, idx) => (
              <div key={idx} className="space-y-1">
                <AssignmentField
                  label={`${part.number}. ${part.title} (${part.duration} min) — Estudante`}
                  value={part.student}
                  onClick={() => openEdit(`Parte ${part.number} Estudante`, part.student)}
                />
                {part.assistant && (
                  <AssignmentField
                    label={`${part.number}. ${part.title} — Ajudante`}
                    value={part.assistant}
                    onClick={() => openEdit(`Parte ${part.number} Ajudante`, part.assistant)}
                    indent
                  />
                )}
              </div>
            ))}
          </AssignmentSection>

          <AssignmentSection title="Nossa Vida Cristã" color="bg-[#5b2c2c]">
            {meeting.christian_life.parts.map((part, idx) => (
              <AssignmentField
                key={idx}
                label={`${part.number}. ${part.title} (${part.duration} min)`}
                value={part.speaker}
                onClick={() => openEdit(part.title, part.speaker)}
              />
            ))}
            <AssignmentField
              label="Estudo Bíblico — Dirigente"
              value={meeting.christian_life.congregation_bible_study.conductor}
              onClick={() => openEdit('Dirigente EBC', meeting.christian_life.congregation_bible_study.conductor)}
            />
            <AssignmentField
              label="Estudo Bíblico — Leitor"
              value={meeting.christian_life.congregation_bible_study.reader}
              onClick={() => openEdit('Leitor EBC', meeting.christian_life.congregation_bible_study.reader)}
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
  const meeting = weekendMeetings[selectedMeetingIdx];
  if (!meeting) return null;

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
            {weekendMeetings.map((m, i) => (
              <option key={m.id} value={i}>
                {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {m.public_talk.theme}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <AssignmentSection title="Conferência Pública" color="bg-[#1a5fb4]">
          <AssignmentField label="Presidente" value={meeting.president} onClick={() => openEdit('Presidente', meeting.president)} />
          <AssignmentField label="Tema" value={meeting.public_talk.theme} onClick={() => openEdit('Tema', meeting.public_talk.theme)} />
          <AssignmentField label="Orador" value={`${meeting.public_talk.speaker} (${meeting.public_talk.congregation})`} onClick={() => openEdit('Orador', meeting.public_talk.speaker)} />
        </AssignmentSection>

        <AssignmentSection title="Estudo de A Sentinela" color="bg-[#1a5fb4]">
          <AssignmentField label="Dirigente" value={meeting.watchtower_study.conductor} onClick={() => openEdit('Dirigente', meeting.watchtower_study.conductor)} />
          <AssignmentField label="Leitor" value={meeting.watchtower_study.reader} onClick={() => openEdit('Leitor', meeting.watchtower_study.reader)} />
        </AssignmentSection>

        <AssignmentSection title="Encerramento" color="bg-gray-700">
          <AssignmentField label="Oração Final" value={meeting.closing_prayer} onClick={() => openEdit('Oração Final', meeting.closing_prayer)} />
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
  members: typeof import('../data/mockData').members;
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
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                selected === m.full_name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
              style={{ fontSize: '0.9rem' }}
            >
              {m.full_name}
              {m.roles.length > 0 && (
                <span className="text-gray-400 ml-2" style={{ fontSize: '0.75rem' }}>
                  ({m.roles.map(r => r === 'anciao' ? 'Ancião' : r === 'servo_ministerial' ? 'Servo' : r).join(', ')})
                </span>
              )}
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