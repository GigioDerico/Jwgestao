import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Static fallback used before DB loads or on error
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    coordenador: {
        view_members: true, create_members: true, edit_members: true,
        view_meetings: true, create_assignments: true, edit_assignments: true, view_assignments: true,
        download_assignments: true,
        manage_permissions: true, view_reports: true,
    },
    secretario: {
        view_members: true, create_members: true, edit_members: true,
        view_meetings: true, create_assignments: false, edit_assignments: false, view_assignments: true,
        download_assignments: false,
        manage_permissions: false, view_reports: true,
    },
    designador: {
        view_members: true, create_members: false, edit_members: false,
        view_meetings: true, create_assignments: true, edit_assignments: true, view_assignments: true,
        download_assignments: true,
        manage_permissions: false, view_reports: false,
    },
    publicador: {
        view_members: false, create_members: false, edit_members: false,
        view_meetings: true, create_assignments: false, edit_assignments: false, view_assignments: true,
        download_assignments: false,
        manage_permissions: false, view_reports: false,
    },
};

// Maps DB column names (without can_) to perm keys
function dbRowToMatrix(row: any): Record<string, boolean> {
    return {
        view_members: row.can_view_members,
        create_members: row.can_create_members,
        edit_members: row.can_edit_members,
        view_meetings: row.can_view_meetings,
        create_assignments: row.can_create_assignments ?? false,
        edit_assignments: row.can_edit_assignments,
        view_assignments: row.can_view_assignments,
        download_assignments:
            Boolean(row.can_download_assignment_image) || Boolean(row.can_download_assignment_pdf),
        manage_permissions: row.can_manage_permissions,
        view_reports: row.can_view_reports,
    };
}

export interface UsePermissionsResult {
    matrix: Record<string, Record<string, boolean>>;
    loading: boolean;
    can: (perm: string) => boolean;
    updatePermission: (role: string, perm: string, value: boolean) => Promise<void>;
    reload: () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
    const { user } = useAuth();
    const [matrix, setMatrix] = useState(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const { data, error } = await supabase.from('role_permissions').select('*');
            if (error || !data?.length) return;

            const built: Record<string, Record<string, boolean>> = {};
            for (const row of data) {
                built[row.role] = dbRowToMatrix(row);
            }
            setMatrix(built);
        } catch {
            // Keep default matrix on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Check if current user can do a given action
    const can = (perm: string): boolean => {
        if (!user?.role) return false;
        // coordenador always has full access
        if (user.role === 'coordenador') return true;
        return matrix[user.role]?.[perm] ?? false;
    };

    const updatePermission = async (role: string, perm: string, value: boolean) => {
        if (perm === 'download_assignments') {
            const [imageResult, pdfResult] = await Promise.all([
                supabase.rpc('update_role_permission', {
                    p_role: role,
                    p_perm: 'download_assignment_image',
                    p_value: value,
                }),
                supabase.rpc('update_role_permission', {
                    p_role: role,
                    p_perm: 'download_assignment_pdf',
                    p_value: value,
                }),
            ]);

            if (imageResult.error) throw new Error(imageResult.error.message);
            if (pdfResult.error) throw new Error(pdfResult.error.message);

            setMatrix(prev => ({
                ...prev,
                [role]: { ...prev[role], [perm]: value },
            }));
            return;
        }

        const { error } = await supabase.rpc('update_role_permission', {
            p_role: role,
            p_perm: perm,
            p_value: value,
        });
        if (error) throw new Error(error.message);

        // Optimistic update
        setMatrix(prev => ({
            ...prev,
            [role]: { ...prev[role], [perm]: value },
        }));
    };

    return { matrix, loading, can, updatePermission, reload: load };
}
