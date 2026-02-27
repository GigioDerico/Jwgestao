import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { Database } from '../lib/supabase-types';

type MemberRow = Database['public']['Tables']['members']['Row'];

export default function Members() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = members.filter((member) => {
    const searchString = member.full_name?.toLowerCase() || '';
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    // Since roles are abstracted in DB now through joins or enum status, this needs to be fixed to match DB layout
    // We'll filter visually based on spiritual_status_enum for now since roles are now in `member_privileges` table
    const matchesRole = filterRole === 'All' ||
      (filterRole === 'Publisher' && member.spiritual_status === 'publicador') ||
      (filterRole === 'Elder' && member.spiritual_status === 'publicador_batizado');
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membros da Congregação</h1>
          <p className="text-muted-foreground mt-1">Gerencie os publicadores e suas designações.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMembers}
            className="p-2.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm"
            title="Recarregar Dados"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin opacity-50' : ''} />
          </button>
          <button className="inline-flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <UserPlus size={18} />
            Adicionar Novo Membro
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal className="text-muted-foreground w-4 h-4" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-card border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2"
            >
              <option value="All">Todos os Cargos</option>
              <option value="Elder">Ancião</option>
              <option value="Servant">Servo Ministerial</option>
              <option value="Publisher">Publicador</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs text-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Nome</th>
                <th scope="col" className="px-6 py-3 font-medium">Cargo</th>
                <th scope="col" className="px-6 py-3 font-medium">Situação</th>
                <th scope="col" className="px-6 py-3 font-medium">Privilégios</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando dados da nuvem...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="bg-card border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-accent flex items-center justify-center text-accent-foreground font-bold text-xs border border-primary/10">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.full_name || ''} className="w-full h-full object-cover" />
                          ) : (
                            member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'
                          )}
                        </div>
                        {member.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {member.spiritual_status === 'publicador_batizado' ? 'Pub. Batizado' :
                          member.spiritual_status === 'publicador' ? 'Publicador' :
                            member.spiritual_status === 'estudante' ? 'Estudante' : 'Membro'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        Ativo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-[150px] truncate">
                      {/* Temporary presentation since attributes are boolean */}
                      {member.approved_audio_video ? 'A/V, ' : ''}
                      {member.approved_indicadores ? 'Ind. ' : ''}
                      {member.approved_carrinho ? 'Car. ' : ''}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Mock) */}
        <div className="bg-card px-4 py-3 border-t border-border flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{filteredMembers.length > 0 ? 1 : 0}</span> a <span className="font-medium">{filteredMembers.length}</span> de <span className="font-medium">{filteredMembers.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Anterior
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Próximo
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
