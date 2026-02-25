// Mock data for the congregation management app

export interface FieldServiceGroup {
  id: string;
  name: string;
  overseer: string; // Elder's name
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  spiritual_status: 'publicador' | 'publicador_batizado' | 'pioneiro_auxiliar' | 'pioneiro_regular' | 'estudante';
  roles: string[];
  gender: 'M' | 'F';
  groupId?: string;
  isFamilyHead?: boolean;
  familyHeadId?: string;
  avatar?: string; // base64 data URL or image URL
  approvedAudioVideo?: boolean;
  approvedIndicadores?: boolean;
  approvedCarrinho?: boolean;
}

export interface MidweekMeeting {
  id: string;
  date: string;
  bible_reading: string;
  president: string;
  opening_prayer: string;
  closing_prayer: string;
  opening_song: number;
  middle_song: number;
  closing_song: number;
  treasures: {
    talk: { title: string; duration: number; speaker: string };
    spiritual_gems: { duration: number; speaker: string };
    bible_reading: { duration: number; student: string; room: string };
  };
  ministry: {
    parts: {
      number: number;
      title: string;
      duration: number;
      student: string;
      assistant: string;
      room: string;
    }[];
  };
  christian_life: {
    parts: {
      number: number;
      title: string;
      duration: number;
      speaker: string;
    }[];
    congregation_bible_study: {
      duration: number;
      conductor: string;
      reader: string;
    };
    closing_comments: { duration: number };
  };
}

export interface WeekendMeeting {
  id: string;
  date: string;
  president: string;
  public_talk: {
    theme: string;
    speaker: string;
    congregation: string;
  };
  watchtower_study: {
    conductor: string;
    reader: string;
  };
  closing_prayer: string;
}

export const fieldServiceGroups: FieldServiceGroup[] = [
  { id: 'g1', name: 'Grupo 1 - Sede', overseer: 'Conrado Silva' },
  { id: 'g2', name: 'Grupo 2 - Vila Nova', overseer: 'Paulo Cesar' },
  { id: 'g3', name: 'Grupo 3 - Centro', overseer: 'Valdemar Moreira' },
  { id: 'g4', name: 'Grupo 4 - Jardim', overseer: 'Alexandre Batista' },
];

export const members: Member[] = [
  { id: '1', full_name: 'Conrado Silva', email: 'conrado@email.com', phone: '(11) 99999-0001', emergency_contact_name: 'Maria Silva', emergency_contact_phone: '(11) 88888-0001', spiritual_status: 'publicador_batizado', roles: ['anciao', 'coordenador'], gender: 'M', groupId: 'g1', isFamilyHead: true, approvedAudioVideo: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '2', full_name: 'Paulo Cesar', email: 'paulo@email.com', phone: '(11) 99999-0002', emergency_contact_name: 'Ana Cesar', emergency_contact_phone: '(11) 88888-0002', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g2', isFamilyHead: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '3', full_name: 'Anderson Paim', email: 'anderson@email.com', phone: '(11) 99999-0003', emergency_contact_name: 'Julia Paim', emergency_contact_phone: '(11) 88888-0003', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g1', approvedAudioVideo: true, approvedIndicadores: true },
  { id: '4', full_name: 'Giorgio Derico', email: 'giorgio@email.com', phone: '(11) 99999-0004', emergency_contact_name: 'Lucia Derico', emergency_contact_phone: '(11) 88888-0004', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g2', isFamilyHead: true, approvedAudioVideo: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '5', full_name: 'Valdemar Moreira', email: 'valdemar@email.com', phone: '(11) 99999-0005', emergency_contact_name: 'Rosa Moreira', emergency_contact_phone: '(11) 88888-0005', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g3', isFamilyHead: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '6', full_name: 'Mara Batista', email: 'mara@email.com', phone: '(11) 99999-0006', emergency_contact_name: 'Jose Batista', emergency_contact_phone: '(11) 88888-0006', spiritual_status: 'pioneiro_regular', roles: [], gender: 'F', groupId: 'g3', approvedCarrinho: true },
  { id: '7', full_name: 'Katia Evangelista', email: 'katia@email.com', phone: '(11) 99999-0007', emergency_contact_name: 'Pedro Evangelista', emergency_contact_phone: '(11) 88888-0007', spiritual_status: 'publicador_batizado', roles: [], gender: 'F', groupId: 'g1', familyHeadId: '1', approvedCarrinho: true },
  { id: '8', full_name: 'Maria Amorim', email: 'maria.a@email.com', phone: '(11) 99999-0008', emergency_contact_name: 'Carlos Amorim', emergency_contact_phone: '(11) 88888-0008', spiritual_status: 'publicador_batizado', roles: [], gender: 'F', groupId: 'g2', familyHeadId: '2', approvedCarrinho: true },
  { id: '9', full_name: 'Paloma Brandão', email: 'paloma@email.com', phone: '(11) 99999-0009', emergency_contact_name: 'Roberto Brandão', emergency_contact_phone: '(11) 88888-0009', spiritual_status: 'estudante', roles: [], gender: 'F', groupId: 'g4' },
  { id: '10', full_name: 'Ademir Souza', email: 'ademir@email.com', phone: '(11) 99999-0010', emergency_contact_name: 'Teresa Souza', emergency_contact_phone: '(11) 88888-0010', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g4', isFamilyHead: true, approvedAudioVideo: true, approvedIndicadores: true },
  { id: '11', full_name: 'Alexandre Batista', email: 'alexandre@email.com', phone: '(11) 99999-0011', emergency_contact_name: 'Fernanda Batista', emergency_contact_phone: '(11) 88888-0011', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g4', isFamilyHead: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '12', full_name: 'Amaury Lira', email: 'amaury@email.com', phone: '(11) 99999-0012', emergency_contact_name: 'Sandra Lira', emergency_contact_phone: '(11) 88888-0012', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g1', approvedAudioVideo: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '13', full_name: 'Dionas Assis', email: 'dionas@email.com', phone: '(11) 99999-0013', emergency_contact_name: 'Márcia Assis', emergency_contact_phone: '(11) 88888-0013', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g2', isFamilyHead: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '14', full_name: 'Edvan Poscai', email: 'edvan@email.com', phone: '(11) 99999-0014', emergency_contact_name: 'Claudia Poscai', emergency_contact_phone: '(11) 88888-0014', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g3', approvedIndicadores: true },
  { id: '15', full_name: 'Ed Carlos Pinheiro', email: 'edcarlos@email.com', phone: '(11) 99999-0015', emergency_contact_name: 'Rita Pinheiro', emergency_contact_phone: '(11) 88888-0015', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g4', isFamilyHead: true, approvedIndicadores: true },
  { id: '16', full_name: 'Ronaldo Xavier', email: 'ronaldo@email.com', phone: '(11) 99999-0016', emergency_contact_name: 'Sonia Xavier', emergency_contact_phone: '(11) 88888-0016', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g1', isFamilyHead: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '17', full_name: 'Gilberto Brandão', email: 'gilberto@email.com', phone: '(11) 99999-0017', emergency_contact_name: 'Vera Brandão', emergency_contact_phone: '(11) 88888-0017', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g2', approvedAudioVideo: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '18', full_name: 'Alessandro Passos', email: 'alessandro@email.com', phone: '(11) 99999-0018', emergency_contact_name: 'Renata Passos', emergency_contact_phone: '(11) 88888-0018', spiritual_status: 'publicador_batizado', roles: [], gender: 'M', groupId: 'g3' },
  { id: '19', full_name: 'Catarina Pedroso', email: 'catarina@email.com', phone: '(11) 99999-0019', emergency_contact_name: 'André Pedroso', emergency_contact_phone: '(11) 88888-0019', spiritual_status: 'pioneiro_regular', roles: [], gender: 'F', groupId: 'g4', familyHeadId: '15', approvedCarrinho: true },
  { id: '20', full_name: 'Barbara Silva', email: 'barbara@email.com', phone: '(11) 99999-0020', emergency_contact_name: 'Marcos Silva', emergency_contact_phone: '(11) 88888-0020', spiritual_status: 'publicador_batizado', roles: [], gender: 'F', groupId: 'g1', familyHeadId: '1', approvedCarrinho: true },
  { id: '21', full_name: 'Alice Derico', email: 'alice@email.com', phone: '(11) 99999-0021', emergency_contact_name: 'Giorgio Derico', emergency_contact_phone: '(11) 99999-0004', spiritual_status: 'publicador_batizado', roles: [], gender: 'F', groupId: 'g2', familyHeadId: '4' },
  { id: '22', full_name: 'Vera Andrade', email: 'vera@email.com', phone: '(11) 99999-0022', emergency_contact_name: 'Paulo Andrade', emergency_contact_phone: '(11) 88888-0022', spiritual_status: 'publicador_batizado', roles: [], gender: 'F', groupId: 'g3', familyHeadId: '5', approvedCarrinho: true },
  { id: '23', full_name: 'Antônia Reis', email: 'antonia@email.com', phone: '(11) 99999-0023', emergency_contact_name: 'João Reis', emergency_contact_phone: '(11) 88888-0023', spiritual_status: 'pioneiro_auxiliar', roles: [], gender: 'F', groupId: 'g4', familyHeadId: '11', approvedCarrinho: true },
  { id: '24', full_name: 'Cláudia Assis', email: 'claudia@email.com', phone: '(11) 99999-0024', emergency_contact_name: 'Dionas Assis', emergency_contact_phone: '(11) 99999-0013', spiritual_status: 'publicador_batizado', roles: [], gender: 'F', groupId: 'g1', familyHeadId: '13', approvedCarrinho: true },
  { id: '25', full_name: 'Sergio Batista', email: 'sergio@email.com', phone: '(11) 99999-0025', emergency_contact_name: 'Helena Batista', emergency_contact_phone: '(11) 88888-0025', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g2', approvedIndicadores: true },
  { id: '26', full_name: 'Nadir Pedroso', email: 'nadir@email.com', phone: '(11) 99999-0026', emergency_contact_name: 'Roberto Pedroso', emergency_contact_phone: '(11) 88888-0026', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g3', isFamilyHead: true, approvedIndicadores: true },
  { id: '27', full_name: 'Marcelo Souza', email: 'marcelo@email.com', phone: '(11) 99999-0027', emergency_contact_name: 'Patricia Souza', emergency_contact_phone: '(11) 88888-0027', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g4', familyHeadId: '10', approvedAudioVideo: true, approvedIndicadores: true },
  { id: '28', full_name: 'Jairo Costa', email: 'jairo@email.com', phone: '(11) 99999-0028', emergency_contact_name: 'Monica Costa', emergency_contact_phone: '(11) 88888-0028', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g1', familyHeadId: '16', approvedAudioVideo: true, approvedIndicadores: true },
  { id: '29', full_name: 'Amilton Guimarães', email: 'amilton@email.com', phone: '(11) 99999-0029', emergency_contact_name: 'Daniela Guimarães', emergency_contact_phone: '(11) 88888-0029', spiritual_status: 'publicador_batizado', roles: ['servo_ministerial'], gender: 'M', groupId: 'g2', familyHeadId: '2', approvedAudioVideo: true, approvedIndicadores: true, approvedCarrinho: true },
  { id: '30', full_name: 'Wilson Vieira', email: 'wilson@email.com', phone: '(11) 99999-0030', emergency_contact_name: 'Laura Vieira', emergency_contact_phone: '(11) 88888-0030', spiritual_status: 'publicador_batizado', roles: ['anciao'], gender: 'M', groupId: 'g3', isFamilyHead: true, approvedIndicadores: true },
];

export const midweekMeetings: MidweekMeeting[] = [
  {
    id: 'mw1',
    date: '2026-02-12',
    bible_reading: 'Isaías 33-35',
    president: 'Conrado Silva',
    opening_prayer: 'Paulo Cesar',
    closing_prayer: 'Dionas Assis',
    opening_song: 3,
    middle_song: 41,
    closing_song: 23,
    treasures: {
      talk: { title: 'Ele dá estabilidade aos seus tempos.', duration: 10, speaker: 'Anderson Paim' },
      spiritual_gems: { duration: 10, speaker: 'Giorgio Derico' },
      bible_reading: { duration: 4, student: 'Valdemar Moreira', room: 'Salão principal' },
    },
    ministry: {
      parts: [
        { number: 4, title: 'Iniciando conversas', duration: 3, student: 'Mara Batista', assistant: 'Katia Evangelista', room: 'Salão principal' },
        { number: 5, title: 'Cultivando interesse', duration: 4, student: 'Maria Amorim', assistant: 'Paloma Brandão', room: 'Salão principal' },
        { number: 6, title: 'Discurso', duration: 5, student: 'Ademir Souza', assistant: '', room: 'Salão principal' },
      ],
    },
    christian_life: {
      parts: [
        { number: 7, title: 'Boletim do Corpo Governante (2026) 1.', duration: 15, speaker: 'Conrado Silva' },
      ],
      congregation_bible_study: {
        duration: 30,
        conductor: 'Alexandre Batista',
        reader: 'Amaury Lira',
      },
      closing_comments: { duration: 3 },
    },
  },
  {
    id: 'mw2',
    date: '2026-02-19',
    bible_reading: 'Isaías 36-37',
    president: 'Edvan Poscai',
    opening_prayer: 'Ed Carlos Pinheiro',
    closing_prayer: 'Sergio Batista',
    opening_song: 150,
    middle_song: 118,
    closing_song: 9,
    treasures: {
      talk: { title: 'Não tenha medo por causa das palavras que você ouviu.', duration: 10, speaker: 'Ronaldo Xavier' },
      spiritual_gems: { duration: 10, speaker: 'Gilberto Brandão' },
      bible_reading: { duration: 4, student: 'Alessandro Passos', room: 'Salão principal' },
    },
    ministry: {
      parts: [
        { number: 4, title: 'Iniciando conversas', duration: 3, student: 'Catarina Pedroso', assistant: 'Barbara Silva', room: 'Salão principal' },
        { number: 5, title: 'Iniciando conversas', duration: 4, student: 'Alice Derico', assistant: 'Vera Andrade', room: 'Salão principal' },
        { number: 6, title: 'Explicando suas crenças', duration: 5, student: 'Antônia Reis', assistant: 'Cláudia Assis', room: 'Salão principal' },
      ],
    },
    christian_life: {
      parts: [
        { number: 7, title: 'Em que se baseia a sua confiança?', duration: 15, speaker: 'Giorgio Derico' },
      ],
      congregation_bible_study: {
        duration: 30,
        conductor: 'Conrado Silva',
        reader: 'Valdemar Moreira',
      },
      closing_comments: { duration: 3 },
    },
  },
];

export const weekendMeetings: WeekendMeeting[] = [
  {
    id: 'we1',
    date: '2026-01-04',
    president: 'Ronaldo Xavier',
    public_talk: {
      theme: 'Fiquem parados e vejam como Jeová os salvará',
      speaker: 'Hernan Cardoso',
      congregation: 'Alvinópolis - Atibaia',
    },
    watchtower_study: {
      conductor: 'Ronaldo Xavier',
      reader: 'Marcelo Souza',
    },
    closing_prayer: 'Paulo Cesar',
  },
  {
    id: 'we2',
    date: '2026-01-11',
    president: 'Sergio Batista',
    public_talk: {
      theme: 'Você está treinando bem a sua consciência?',
      speaker: 'Edson Junior',
      congregation: 'Alvinópolis - Atibaia',
    },
    watchtower_study: {
      conductor: 'Sergio Batista',
      reader: 'Jairo Costa',
    },
    closing_prayer: 'Ronaldo Xavier',
  },
  {
    id: 'we3',
    date: '2026-01-18',
    president: 'Nadir Pedroso',
    public_talk: {
      theme: 'Como você pode saber seu futuro?',
      speaker: 'Armecino Alves',
      congregation: 'Alvinópolis - Atibaia',
    },
    watchtower_study: {
      conductor: 'Nadir Pedroso',
      reader: 'Ademir Souza',
    },
    closing_prayer: 'Amaury Lira',
  },
  {
    id: 'we4',
    date: '2026-01-25',
    president: 'Ed Carlos Pinheiro',
    public_talk: {
      theme: 'Por que você pode confiar na Bíblia',
      speaker: 'Wilson Vieira',
      congregation: 'Alvinópolis - Atibaia',
    },
    watchtower_study: {
      conductor: 'Ed Carlos Pinheiro',
      reader: 'Amilton Guimarães',
    },
    closing_prayer: 'Conrado Silva',
  },
];

export interface UserProfile {
  id: string;
  memberId: string;
  role: 'coordenador' | 'secretario' | 'designador' | 'publicador';
  name: string;
}

export const userProfiles: UserProfile[] = [
  { id: 'u1', memberId: '1', role: 'coordenador', name: 'Conrado Silva' },
  { id: 'u2', memberId: '10', role: 'secretario', name: 'Ademir Souza' },
  { id: 'u3', memberId: '12', role: 'designador', name: 'Amaury Lira' },
  { id: 'u4', memberId: '18', role: 'publicador', name: 'Alessandro Passos' },
];

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