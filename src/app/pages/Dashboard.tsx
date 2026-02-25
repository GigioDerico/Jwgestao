import { Users, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';

export default function Dashboard() {
  const stats = [
    { label: 'Total de Publicadores', value: '118', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Reuniões este Mês', value: '8', icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Designações Pendentes', value: '12', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Designações Confirmadas', value: '45', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const upcomingAssignments = [
    { date: '12 Fev', part: 'Leitura da Bíblia', role: 'Estudante', status: 'Confirmado' },
    { date: '19 Fev', part: 'Indicador', role: 'Ajudante', status: 'Pendente' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de Controle</h1>
        <p className="text-muted-foreground mt-1">Bem-vindo, Vicente Nunes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Próximas Reuniões</h2>
              <Link to="/meetings" className="text-sm font-medium text-primary hover:underline">Ver todas</Link>
            </div>
            <div className="divide-y divide-border">
              {[
                { date: '12 de Fevereiro', theme: 'Isaías 33-35', type: 'Vida e Ministério', president: 'Conrado Silva' },
                { date: '15 de Fevereiro', theme: 'Fiquem parados e vejam...', type: 'Reunião Pública', president: 'Ronaldo Xavier' },
                { date: '19 de Fevereiro', theme: 'Isaías 36-37', type: 'Vida e Ministério', president: 'Edvan Poscai' },
              ].map((meeting, idx) => (
                <div key={idx} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{meeting.date}</p>
                    <p className="text-sm text-muted-foreground">{meeting.theme}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      meeting.type === 'Vida e Ministério' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {meeting.type}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Pres: {meeting.president}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Minhas Designações</h2>
            <div className="space-y-4">
              {upcomingAssignments.map((assignment, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="w-12 h-12 rounded-lg bg-accent flex flex-col items-center justify-center text-accent-foreground border border-primary/20">
                    <span className="text-xs font-bold">{assignment.date.split(' ')[0]}</span>
                    <span className="text-[10px] uppercase">{assignment.date.split(' ')[1]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{assignment.part}</p>
                    <p className="text-xs text-muted-foreground">{assignment.role}</p>
                  </div>
                  {assignment.status === 'Pendente' ? (
                    <button className="text-xs font-medium text-primary-foreground bg-primary px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity">
                      Confirmar
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={12} /> OK
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Link to="/assignments" className="block mt-4 text-center text-sm font-medium text-primary hover:underline">
              Ver todas as designações
            </Link>
          </div>

          <div className="bg-primary-foreground rounded-xl shadow-sm p-6 text-white relative overflow-hidden border border-white/5">
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-2">Quadro de Anúncios</h3>
              <p className="text-primary/20 text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
                A visita do Superintendente de Circuito será na semana de 24 de Fevereiro.
              </p>
              <button className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
                Ler mais
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full opacity-20"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/10 rounded-full opacity-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
