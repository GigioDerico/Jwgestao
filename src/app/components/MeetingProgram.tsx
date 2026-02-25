import { Meeting, Assignment } from '../types';
import { CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';

interface MeetingProgramProps {
  meeting: Meeting;
  isAdmin?: boolean;
  onConfirm?: (assignmentId: string) => void;
}

export function MeetingProgram({ meeting, isAdmin, onConfirm }: MeetingProgramProps) {
  const { assignments } = meeting;

  // Helper to filter assignments by section
  const getAssignments = (filter: (a: Assignment) => boolean) => assignments.filter(filter);

  if (meeting.type === 'Midweek') {
    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden max-w-4xl mx-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 uppercase">{meeting.title}</h2>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <Calendar size={18} />
                <span className="font-medium">{new Date(meeting.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Presidente</p>
              <p className="font-medium text-gray-900">Conrado Silva</p> 
              {/* In a real app, look up the name from the ID */}
            </div>
          </div>

          {/* Opening */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <div className="flex gap-4">
                <span className="w-12 text-gray-500 font-mono">19:30</span>
                <span className="font-medium">• Cântico 3</span>
              </div>
              <div className="flex gap-2">
                 <span className="text-gray-500">Oração:</span>
                 <span className="font-medium">Paulo Cesar</span>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="w-12 text-gray-500 font-mono">19:34</span>
              <span className="font-medium">• Comentários iniciais (1 min)</span>
            </div>
          </div>
          
          {/* Sections */}
          <Section 
            title="TESOUROS DA PALAVRA DE DEUS" 
            color="bg-gray-600" 
            assignments={getAssignments(a => ['Ele dá estabilidade aos seus tempos', 'Joias Espirituais', 'Leitura da Bíblia'].includes(a.partName))}
            isAdmin={isAdmin}
            onConfirm={onConfirm}
          />
          
          <Section 
            title="FAÇA SEU MELHOR NO MINISTÉRIO" 
            color="bg-yellow-600" 
            assignments={getAssignments(a => ['Iniciando Conversas', 'Cultivando Interesse', 'Discurso'].includes(a.partName))}
            isAdmin={isAdmin}
            onConfirm={onConfirm}
          />

          <Section 
            title="NOSSA VIDA CRISTÃ" 
            color="bg-red-700" 
            assignments={getAssignments(a => ['Boletim do Corpo Governante', 'Estudo Bíblico de Congregação', 'Oração Final'].includes(a.partName))}
            isAdmin={isAdmin}
            onConfirm={onConfirm}
          />
        </div>
      </div>
    );
  }

  // Weekend Meeting
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden max-w-4xl mx-auto">
      <div className="bg-blue-500 text-white p-4 text-center">
        <h2 className="text-xl font-bold uppercase">Conferência Pública e Estudo de A Sentinela</h2>
        <p className="opacity-90 mt-1">{new Date(meeting.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="p-0">
        <table className="w-full text-sm border-collapse">
            <tbody>
              {/* Date Row */}
              <tr className="bg-blue-200">
                  <td colSpan={2} className="p-2 font-bold text-center border-b border-blue-300">
                      {new Date(meeting.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </td>
              </tr>
              {/* President */}
              <tr className="border-b border-gray-200">
                  <td className="p-3 font-bold text-blue-700 w-1/3 text-right">Presidente:</td>
                  <td className="p-3 text-blue-700 font-bold">Ronaldo Xavier</td>
              </tr>
              {/* Theme */}
              {assignments.find(a => a.partName === 'Discurso Público') && (
                  <tr className="border-b border-gray-200">
                      <td className="p-3 font-bold text-red-600 w-1/3 text-right">Tema:</td>
                      <td className="p-3 text-red-600 font-bold">{assignments.find(a => a.partName === 'Discurso Público')?.theme}</td>
                  </tr>
              )}
              {/* Speaker */}
              {assignments.find(a => a.partName === 'Discurso Público') && (
                  <tr className="border-b border-gray-200">
                      <td className="p-3 font-bold text-black w-1/3 text-right">Orador:</td>
                      <td className="p-3 font-bold">Hernan Cardoso (Alvinópolis - Atibaia)</td>
                  </tr>
              )}
              {/* Reader */}
              {assignments.find(a => a.roleName === 'Leitor') && (
                  <tr className="border-b border-gray-200">
                      <td className="p-3 font-bold text-green-600 w-1/3 text-right">Leitor:</td>
                      <td className="p-3 text-green-600 font-bold">Marcelo Souza</td>
                  </tr>
              )}
            </tbody>
        </table>
      </div>
    </div>
  );
}

function Section({ title, color, assignments, isAdmin, onConfirm }: { title: string, color: string, assignments: Assignment[], isAdmin?: boolean, onConfirm?: (id: string) => void }) {
  if (assignments.length === 0) return null;

  return (
    <div className="mb-6">
      <div className={`${color} text-white px-3 py-1 text-sm font-bold uppercase tracking-wide mb-2 rounded-sm`}>
        {title}
      </div>
      <div className="space-y-3">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex justify-between items-start group">
             <div className="flex gap-4">
                <span className="w-12 text-gray-500 font-mono text-sm pt-0.5">{assignment.time}</span>
                <div>
                   <div className="font-medium text-gray-900 text-sm">
                      {assignment.partName} 
                      {assignment.duration && <span className="font-normal text-gray-500 ml-1">({assignment.duration})</span>}
                   </div>
                   {assignment.roleName !== 'Irmão' && assignment.roleName !== 'Presidente' && (
                       <div className="text-xs text-gray-500 mt-0.5">{assignment.roleName}</div>
                   )}
                </div>
             </div>
             
             <div className="flex items-center gap-3">
                <div className="text-right">
                    <div className="font-medium text-sm text-gray-900">
                        {/* Mock looking up name */}
                        {assignment.assigneeId === '3' ? 'Anderson Paim' : 
                         assignment.assigneeId === '4' ? 'Giorgio Derico' :
                         assignment.assigneeId === '5' ? 'Valdemar Moreira' :
                         assignment.assigneeId === '6' ? 'Mara Batista' :
                         assignment.assigneeId === '8' ? 'Maria Amorim' :
                         assignment.assigneeId === '10' ? 'Ademir Souza' :
                         assignment.assigneeId === '12' ? 'Alexandre Batista' :
                         assignment.assigneeId === '11' ? 'Dionas Assis' : 'Irmão Designado'}
                    </div>
                    {assignment.assistantId && (
                        <div className="text-xs text-gray-500">
                            Ajudante: {
                                assignment.assistantId === '7' ? 'Katia Evangelista' : 
                                assignment.assistantId === '9' ? 'Paloma Brandão' : 'Ajudante'
                            }
                        </div>
                    )}
                </div>
                
                {/* Confirmation Status */}
                {assignment.confirmed ? (
                    <div title="Confirmado" className="text-green-600">
                        <CheckCircle size={18} />
                    </div>
                ) : (
                    <div title="Pendente" className="text-amber-500 cursor-pointer hover:scale-110 transition-transform" onClick={() => onConfirm?.(assignment.id)}>
                        <Clock size={18} />
                    </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}
