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
        estudante: 'Estudante',
        publicador: 'Publicador Não Batizado',
        publicador_batizado: 'Publicador Batizado',
        pioneiro_auxiliar: 'Pioneiro Auxiliar',
        pioneiro_regular: 'Pioneiro Regular',
        servo_ministerial: 'Servo Ministerial',
        anciao: 'Ancião',
        desassociado: 'Desassociado',
        inativo: 'Inativo',
    };
    return labels[status] || status;
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        estudante: 'bg-gray-100 text-gray-800',
        publicador: 'bg-blue-100 text-blue-800',
        publicador_batizado: 'bg-green-100 text-green-800',
        pioneiro_auxiliar: 'bg-purple-100 text-purple-800',
        pioneiro_regular: 'bg-amber-100 text-amber-800',
        servo_ministerial: 'bg-teal-100 text-teal-800',
        anciao: 'bg-sky-100 text-sky-800',
        desassociado: 'bg-red-100 text-red-800',
        inativo: 'bg-stone-200 text-stone-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

export function formatPhoneDisplay(phone?: string | null): string {
    const digits = (phone || '').replace(/\D/g, '').slice(0, 11);

    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

type WeekendSpeakerCongregation = {
    congregation: string;
    city: string;
    display: string;
};

export function parseWeekendSpeakerCongregation(raw?: string | null): WeekendSpeakerCongregation {
    const normalized = (raw || '').trim();

    if (!normalized) {
        return { congregation: '', city: '', display: '' };
    }

    if (normalized.startsWith('{')) {
        try {
            const parsed = JSON.parse(normalized);
            const congregation = typeof parsed?.congregation === 'string' ? parsed.congregation.trim() : '';
            const city = typeof parsed?.city === 'string' ? parsed.city.trim() : '';
            const display = [congregation, city].filter(Boolean).join(' - ');
            return { congregation, city, display };
        } catch {
            // Fallback to legacy parsing below.
        }
    }

    const separator = ' - ';
    const lastSeparatorIndex = normalized.lastIndexOf(separator);
    if (lastSeparatorIndex > 0) {
        const congregation = normalized.slice(0, lastSeparatorIndex).trim();
        const city = normalized.slice(lastSeparatorIndex + separator.length).trim();
        const display = [congregation, city].filter(Boolean).join(' - ');
        return { congregation, city, display };
    }

    return {
        congregation: normalized,
        city: '',
        display: normalized,
    };
}

export function formatWeekendSpeakerCongregation(raw?: string | null): string {
    return parseWeekendSpeakerCongregation(raw).display;
}

export function serializeWeekendSpeakerCongregation(congregation?: string, city?: string): string | undefined {
    const normalizedCongregation = (congregation || '').trim();
    const normalizedCity = (city || '').trim();

    if (!normalizedCongregation && !normalizedCity) {
        return undefined;
    }

    return JSON.stringify({
        congregation: normalizedCongregation,
        city: normalizedCity,
    });
}
