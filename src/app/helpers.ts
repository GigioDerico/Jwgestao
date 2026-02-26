// Helper functions for display formatting
// Extracted from mockData.ts — reusable across the app

export function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        anciao: 'Ancião',
        servo_ministerial: 'Servo Ministerial',
        coordenador: 'Coordenador',
        secretario: 'Secretário',
        designador: 'Designador de Reuniões',
        publicador: 'Publicador',
    };
    return labels[role] || role;
}

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        publicador: 'Publicador',
        publicador_batizado: 'Publicador Batizado',
        pioneiro_auxiliar: 'Pioneiro Auxiliar',
        pioneiro_regular: 'Pioneiro Regular',
        estudante: 'Estudante',
    };
    return labels[status] || status;
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        publicador: 'bg-blue-100 text-blue-800',
        publicador_batizado: 'bg-green-100 text-green-800',
        pioneiro_auxiliar: 'bg-purple-100 text-purple-800',
        pioneiro_regular: 'bg-amber-100 text-amber-800',
        estudante: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}
