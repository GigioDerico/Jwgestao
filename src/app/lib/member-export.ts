import * as XLSX from 'xlsx';
import type { Member, FieldServiceGroup } from '../types';
import { downloadElementAsPdf } from './dom-export';

export interface MemberWithGroup {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  group_id: string | null;
  group_name: string | null;
  gender: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  groupByFieldService: boolean;
}

function formatPhone(phone: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatAddress(member: MemberWithGroup): string {
  const parts: string[] = [];
  if (member.address_street) parts.push(member.address_street);
  if (member.address_number) parts.push(member.address_number);
  if (member.address_neighborhood) parts.push(member.address_neighborhood);
  if (member.address_city) parts.push(member.address_city);
  return parts.length > 0 ? parts.join(', ') : '-';
}

export function enrichMembersWithGroups(
  members: Member[],
  groups: FieldServiceGroup[]
): MemberWithGroup[] {
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  return members.map(member => ({
    id: member.id,
    full_name: member.full_name,
    phone: member.phone || null,
    email: member.email || null,
    group_id: member.groupId || null,
    group_name: member.groupId ? (groupMap.get(member.groupId) ?? null) : null,
    gender: member.gender,
    emergency_contact_name: member.emergency_contact_name || null,
    emergency_contact_phone: member.emergency_contact_phone || null,
    address_street: member.address_street || null,
    address_number: member.address_number || null,
    address_neighborhood: member.address_neighborhood || null,
    address_city: member.address_city || null,
  }));
}

export function sortMembersAlphabetically(members: MemberWithGroup[]): MemberWithGroup[] {
  return [...members].sort((a, b) =>
    (a.full_name || '').localeCompare(b.full_name || '', 'pt-BR', { sensitivity: 'base' })
  );
}

export function groupMembersByFieldService(
  members: MemberWithGroup[]
): Map<string, MemberWithGroup[]> {
  const grouped = new Map<string, MemberWithGroup[]>();

  for (const member of members) {
    const groupName = member.group_name || 'Sem grupo';
    if (!grouped.has(groupName)) {
      grouped.set(groupName, []);
    }
    grouped.get(groupName)!.push(member);
  }

  // Sort each group alphabetically
  for (const [groupName, groupMembers] of grouped) {
    grouped.set(groupName, sortMembersAlphabetically(groupMembers));
  }

  // Sort groups by name, keeping "Sem grupo" at the end
  const sortedGrouped = new Map<string, MemberWithGroup[]>();
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'Sem grupo') return 1;
    if (b === 'Sem grupo') return -1;
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
  });

  for (const key of sortedKeys) {
    sortedGrouped.set(key, grouped.get(key)!);
  }

  return sortedGrouped;
}

function buildExportTable(members: MemberWithGroup[]): HTMLTableElement {
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontFamily = 'Arial, sans-serif';
  table.style.fontSize = '11px';
  table.style.tableLayout = 'fixed';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const headers = [
    { text: 'Nome', width: '16%' },
    { text: 'Telefone', width: '10%' },
    { text: 'Grupo', width: '13%' },
    { text: 'Contato de Emergência', width: '20%' },
    { text: 'Endereço', width: '41%' },
  ];
  headers.forEach(({ text, width }) => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.width = width;
    th.style.borderBottom = '1.5px solid #082c45';
    th.style.padding = '6px 4px';
    th.style.textAlign = 'left';
    th.style.fontWeight = '700';
    th.style.fontSize = '11px';
    th.style.color = '#082c45';
    th.style.textTransform = 'uppercase';
    th.style.letterSpacing = '0.3px';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  members.forEach((member, index) => {
    const row = document.createElement('tr');
    if (index % 2 === 1) {
      row.style.backgroundColor = '#f8fafc';
    }
    row.style.pageBreakInside = 'avoid';

    const emergencyContact = member.emergency_contact_name
      ? `${member.emergency_contact_name} — ${formatPhone(member.emergency_contact_phone)}`
      : '-';

    const cells = [
      member.full_name,
      formatPhone(member.phone),
      member.group_name || 'Sem grupo',
      emergencyContact,
      formatAddress(member),
    ];

    cells.forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      td.style.padding = '5px 4px';
      td.style.borderBottom = '0.5px solid #e2e8f0';
      td.style.color = '#334155';
      td.style.fontSize = '11px';
      td.style.lineHeight = '1.3';
      td.style.verticalAlign = 'top';
      td.style.overflowWrap = 'anywhere';
      td.style.wordBreak = 'normal';
      td.style.whiteSpace = 'normal';
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  return table;
}

function buildGroupedExportTable(
  groupedMembers: Map<string, MemberWithGroup[]>
): HTMLDivElement {
  const container = document.createElement('div');
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '11px';

  for (const [groupName, members] of groupedMembers) {
    const groupHeader = document.createElement('h3');
    groupHeader.textContent = groupName;
    groupHeader.style.marginTop = '16px';
    groupHeader.style.marginBottom = '4px';
    groupHeader.style.fontSize = '13px';
    groupHeader.style.fontWeight = '700';
    groupHeader.style.color = '#082c45';
    groupHeader.style.borderBottom = '1.5px solid #35bdf8';
    groupHeader.style.paddingBottom = '3px';
    groupHeader.style.textTransform = 'uppercase';
    groupHeader.style.pageBreakAfter = 'avoid';
    container.appendChild(groupHeader);

    const table = buildExportTable(members);
    container.appendChild(table);
  }

  return container;
}

export async function generateMemberListPdf(
  members: Member[],
  groups: FieldServiceGroup[],
  options: ExportOptions
): Promise<void> {
  if (members.length === 0) {
    throw new Error('Não há membros para exportar.');
  }

  const enriched = enrichMembersWithGroups(members, groups);
  let exportElement: HTMLElement;

  if (options.groupByFieldService) {
    const grouped = groupMembersByFieldService(enriched);
    exportElement = buildGroupedExportTable(grouped);
  } else {
    const sorted = sortMembersAlphabetically(enriched);
    exportElement = buildExportTable(sorted);
  }

  // Create a wrapper for proper PDF rendering
  // Use page width with padding to hide browser print headers/footers
  // @page margin is 0, so padding creates visual margins instead
  const wrapper = document.createElement('div');
  wrapper.style.padding = '10mm';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.width = '297mm';
  wrapper.style.maxWidth = '297mm';
  wrapper.style.boxSizing = 'border-box';
  wrapper.dataset.exportPdfMode = 'paged';
  wrapper.dataset.exportPdfPage = 'a4-landscape';

  // Add header container for title and date
  const headerContainer = document.createElement('div');
  headerContainer.style.width = '100%';
  headerContainer.style.textAlign = 'center';
  headerContainer.style.pageBreakAfter = 'avoid';

  const title = document.createElement('h1');
  title.textContent = 'Congregação Vicente Nunes';
  title.style.display = 'inline-block';
  title.style.fontSize = '20px';
  title.style.fontWeight = '700';
  title.style.color = '#082c45';
  title.style.marginBottom = '6px';
  title.style.marginTop = '2mm';
  headerContainer.appendChild(title);

  const dateEl = document.createElement('p');
  dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  dateEl.style.fontSize = '11px';
  dateEl.style.color = '#64748b';
  dateEl.style.marginBottom = '16px';
  dateEl.style.marginTop = '0';
  headerContainer.appendChild(dateEl);

  wrapper.appendChild(headerContainer);

  wrapper.appendChild(exportElement);
  document.body.appendChild(wrapper);

  try {
    await downloadElementAsPdf(wrapper, 'Congregacao Vicente Nunes.pdf');
  } finally {
    document.body.removeChild(wrapper);
  }
}

export async function generateMemberListExcel(
  members: Member[],
  groups: FieldServiceGroup[],
  options: ExportOptions
): Promise<void> {
  if (members.length === 0) {
    throw new Error('Não há membros para exportar.');
  }

  const enriched = enrichMembersWithGroups(members, groups);
  const workbook = XLSX.utils.book_new();

  if (options.groupByFieldService) {
    const grouped = groupMembersByFieldService(enriched);

    for (const [groupName, groupMembers] of grouped) {
      const data = groupMembers.map(m => {
        const emergencyContact = m.emergency_contact_name
          ? `${m.emergency_contact_name} — ${formatPhone(m.emergency_contact_phone)}`
          : '-';
        return {
          Nome: m.full_name,
          Telefone: formatPhone(m.phone),
          Grupo: m.group_name || 'Sem grupo',
          'Contato de Emergência': emergencyContact,
          Endereço: formatAddress(m),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, groupName.slice(0, 31));
    }
  } else {
    const sorted = sortMembersAlphabetically(enriched);
    const data = sorted.map(m => {
      const emergencyContact = m.emergency_contact_name
        ? `${m.emergency_contact_name} — ${formatPhone(m.emergency_contact_phone)}`
        : '-';
      return {
        Nome: m.full_name,
        Telefone: formatPhone(m.phone),
        Grupo: m.group_name || 'Sem grupo',
        'Contato de Emergência': emergencyContact,
        Endereço: formatAddress(m),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');
  }

  XLSX.writeFile(workbook, 'Congregacao Vicente Nunes.xlsx');
}
