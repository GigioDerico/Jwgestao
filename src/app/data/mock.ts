import { Member, Meeting, Assignment, MeetingType } from '../types';

export const MEMBERS: Member[] = [
  { id: '1', fullName: 'Conrado Silva', email: 'conrado@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Coordinator', 'Publisher'] },
  { id: '2', fullName: 'Paulo Cesar', email: 'paulo@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Helper', 'Publisher'] },
  { id: '3', fullName: 'Anderson Paim', email: 'anderson@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Secretary', 'Publisher'] },
  { id: '4', fullName: 'Giorgio Derico', email: 'giorgio@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Publisher'] },
  { id: '5', fullName: 'Valdemar Moreira', email: 'valdemar@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Student', 'Publisher'] },
  { id: '6', fullName: 'Mara Batista', email: 'mara@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Student', 'Publisher'] },
  { id: '7', fullName: 'Katia Evangelista', email: 'katia@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Student', 'Publisher'] },
  { id: '8', fullName: 'Maria Amorim', email: 'maria@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Student', 'Publisher'] },
  { id: '9', fullName: 'Paloma Brandão', email: 'paloma@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Student', 'Publisher'] },
  { id: '10', fullName: 'Ademir Souza', email: 'ademir@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Student', 'Publisher'] },
  { id: '11', fullName: 'Dionas Assis', email: 'dionas@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Publisher'] },
  { id: '12', fullName: 'Alexandre Batista', email: 'alexandre@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Publisher'] },
  { id: '13', fullName: 'Amaury Lira', email: 'amaury@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Publisher'] },
  { id: '14', fullName: 'Ronaldo Xavier', email: 'ronaldo@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Coordinator', 'Publisher'] },
  { id: '15', fullName: 'Hernan Cardoso', email: 'hernan@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Publisher'] }, // Visiting speaker
  { id: '16', fullName: 'Marcelo Souza', email: 'marcelo@example.com', phone: '11999999999', spiritualStatus: 'Active', roles: ['Publisher'] },
];

export const MEETINGS: Meeting[] = [
  {
    id: 'm1',
    date: '2026-02-12', // Using 2026 as per system prompt, or matching the image relative date
    type: 'Midweek',
    title: 'Nossa Vida e Ministério Cristão',
    presidentId: '1', // Conrado
    assignments: [
      { id: 'a1', meetingId: 'm1', partName: 'Oração Inicial', roleName: 'Irmão', assigneeId: '2', confirmed: true, time: '19:30' },
      { id: 'a2', meetingId: 'm1', partName: 'Comentários Iniciais', roleName: 'Presidente', assigneeId: '1', confirmed: true, time: '19:34', duration: '1 min' },
      // Tesouros
      { id: 'a3', meetingId: 'm1', partName: 'Ele dá estabilidade aos seus tempos', roleName: 'Discurso', assigneeId: '3', confirmed: false, time: '19:35', duration: '10 min' },
      { id: 'a4', meetingId: 'm1', partName: 'Joias Espirituais', roleName: 'Perguntas e Respostas', assigneeId: '4', confirmed: true, time: '19:45', duration: '10 min' },
      { id: 'a5', meetingId: 'm1', partName: 'Leitura da Bíblia', roleName: 'Leitor', assigneeId: '5', confirmed: false, time: '19:55', duration: '4 min' },
      // Ministério
      { id: 'a6', meetingId: 'm1', partName: 'Iniciando Conversas', roleName: 'Estudante', assigneeId: '6', assistantId: '7', confirmed: true, time: '20:00', duration: '3 min' },
      { id: 'a7', meetingId: 'm1', partName: 'Cultivando Interesse', roleName: 'Estudante', assigneeId: '8', assistantId: '9', confirmed: false, time: '20:04', duration: '4 min' },
      { id: 'a8', meetingId: 'm1', partName: 'Discurso', roleName: 'Estudante', assigneeId: '10', confirmed: true, time: '20:09', duration: '5 min' },
      // Vida Cristã
      { id: 'a9', meetingId: 'm1', partName: 'Boletim do Corpo Governante', roleName: 'Vídeo', assigneeId: '1', confirmed: true, time: '20:20', duration: '15 min' },
      { id: 'a10', meetingId: 'm1', partName: 'Estudo Bíblico de Congregação', roleName: 'Dirigente', assigneeId: '12', confirmed: true, time: '20:35', duration: '30 min' },
      { id: 'a11', meetingId: 'm1', partName: 'Estudo Bíblico de Congregação', roleName: 'Leitor', assigneeId: '13', confirmed: true, time: '20:35', duration: '30 min' },
      { id: 'a12', meetingId: 'm1', partName: 'Oração Final', roleName: 'Irmão', assigneeId: '11', confirmed: false, time: '21:10' },
    ]
  },
  {
    id: 'm2',
    date: '2026-01-04',
    type: 'Weekend',
    title: 'Reunião Pública e Estudo de A Sentinela',
    presidentId: '14', // Ronaldo Xavier
    assignments: [
      { id: 'w1', meetingId: 'm2', partName: 'Discurso Público', roleName: 'Orador', assigneeId: '15', confirmed: true, theme: 'Fiquem parados e vejam como Jeová os salvará' },
      { id: 'w2', meetingId: 'm2', partName: 'Estudo de A Sentinela', roleName: 'Leitor', assigneeId: '16', confirmed: true },
      { id: 'w3', meetingId: 'm2', partName: 'Oração Final', roleName: 'Irmão', assigneeId: '2', confirmed: false },
    ]
  }
];
