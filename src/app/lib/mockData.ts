import { format, addDays } from "date-fns";

export type Role = "Coordinator" | "Secretary" | "Helper" | "Publisher";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  spiritualStatus: "Publisher" | "Unbaptized Publisher" | "Auxiliary Pioneer" | "Regular Pioneer";
  privileges: ("Elder" | "Ministerial Servant")[];
  email?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface MeetingPart {
  id: string;
  time?: string;
  title: string;
  theme?: string; // For public talks
  duration?: number; // In minutes
  assigneeId?: string; // Primary assignee
  assistantId?: string; // For student parts
  readerId?: string; // For Watchtower
  conductorId?: string; // For Watchtower
  chairmanId?: string; // For Public Talk
  speakerId?: string; // For Public Talk
  speakerCongregation?: string; // External speaker
  prayerId?: string;
  type: "song" | "part" | "bible_reading" | "ministry_part" | "living_as_christians" | "congregation_bible_study" | "public_talk" | "watchtower_study" | "prayer";
}

export interface Meeting {
  id: string;
  date: string;
  type: "midweek" | "weekend";
  chairmanId?: string;
  openingPrayerId?: string;
  closingPrayerId?: string;
  parts: MeetingPart[];
}

export const MEMBERS: Member[] = [
  { id: "1", firstName: "Vicente", lastName: "Nunes", fullName: "Vicente Nunes", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "2", firstName: "Conrado", lastName: "Silva", fullName: "Conrado Silva", spiritualStatus: "Regular Pioneer", privileges: ["Elder"] },
  { id: "3", firstName: "Paulo", lastName: "Cesar", fullName: "Paulo Cesar", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "4", firstName: "Anderson", lastName: "Paim", fullName: "Anderson Paim", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "5", firstName: "Giorgio", lastName: "Derico", fullName: "Giorgio Derico", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "6", firstName: "Valdemar", lastName: "Moreira", fullName: "Valdemar Moreira", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "7", firstName: "Mara", lastName: "Batista", fullName: "Mara Batista", spiritualStatus: "Publisher", privileges: [] },
  { id: "8", firstName: "Katia", lastName: "Evangelista", fullName: "Katia Evangelista", spiritualStatus: "Publisher", privileges: [] },
  { id: "9", firstName: "Maria", lastName: "Amorim", fullName: "Maria Amorim", spiritualStatus: "Publisher", privileges: [] },
  { id: "10", firstName: "Paloma", lastName: "Brandão", fullName: "Paloma Brandão", spiritualStatus: "Publisher", privileges: [] },
  { id: "11", firstName: "Ademir", lastName: "Souza", fullName: "Ademir Souza", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "12", firstName: "Alexandre", lastName: "Batista", fullName: "Alexandre Batista", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "13", firstName: "Amaury", lastName: "Lira", fullName: "Amaury Lira", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "14", firstName: "Dionas", lastName: "Assis", fullName: "Dionas Assis", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "15", firstName: "Edvan", lastName: "Poscai", fullName: "Edvan Poscai", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "16", firstName: "Ed", lastName: "Carlos Pinheiro", fullName: "Ed Carlos Pinheiro", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "17", firstName: "Ronaldo", lastName: "Xavier", fullName: "Ronaldo Xavier", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "18", firstName: "Gilberto", lastName: "Brandão", fullName: "Gilberto Brandão", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "19", firstName: "Alessandro", lastName: "Passos", fullName: "Alessandro Passos", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "20", firstName: "Catarina", lastName: "Pedroso", fullName: "Catarina Pedroso", spiritualStatus: "Publisher", privileges: [] },
  { id: "21", firstName: "Barbara", lastName: "Silva", fullName: "Barbara Silva", spiritualStatus: "Publisher", privileges: [] },
  { id: "22", firstName: "Alice", lastName: "Derico", fullName: "Alice Derico", spiritualStatus: "Publisher", privileges: [] },
  { id: "23", firstName: "Vera", lastName: "Andrade", fullName: "Vera Andrade", spiritualStatus: "Publisher", privileges: [] },
  { id: "24", firstName: "Antônia", lastName: "Reis", fullName: "Antônia Reis", spiritualStatus: "Publisher", privileges: [] },
  { id: "25", firstName: "Cláudia", lastName: "Assis", fullName: "Cláudia Assis", spiritualStatus: "Publisher", privileges: [] },
  { id: "26", firstName: "Sergio", lastName: "Batista", fullName: "Sergio Batista", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "27", firstName: "Marcelo", lastName: "Souza", fullName: "Marcelo Souza", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "28", firstName: "Jairo", lastName: "Costa", fullName: "Jairo Costa", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
  { id: "29", firstName: "Nadir", lastName: "Pedroso", fullName: "Nadir Pedroso", spiritualStatus: "Publisher", privileges: ["Elder"] },
  { id: "30", firstName: "Amilton", lastName: "Guimarães", fullName: "Amilton Guimarães", spiritualStatus: "Publisher", privileges: ["Ministerial Servant"] },
];

export const MEETINGS: Meeting[] = [
  {
    id: "m1",
    date: "2025-02-12",
    type: "midweek",
    chairmanId: "2", // Conrado Silva
    openingPrayerId: "3", // Paulo Cesar
    closingPrayerId: "14", // Dionas Assis
    parts: [
      { id: "p1", type: "song", title: "Cântico 3", time: "19:30" },
      { id: "p2", type: "part", title: "Comentários iniciais", duration: 1, time: "19:34" },
      { id: "p3", type: "part", title: "Ele dá estabilidade aos seus tempos", duration: 10, assigneeId: "4", time: "19:35" }, // Anderson Paim
      { id: "p4", type: "part", title: "Joias espirituais", duration: 10, assigneeId: "5", time: "19:45" }, // Giorgio Derico
      { id: "p5", type: "bible_reading", title: "Leitura da Bíblia", duration: 4, assigneeId: "6", time: "19:55" }, // Valdemar Moreira
      { id: "p6", type: "ministry_part", title: "Iniciando conversas", duration: 3, assigneeId: "7", assistantId: "8", time: "20:00" }, // Mara / Katia
      { id: "p7", type: "ministry_part", title: "Cultivando interesse", duration: 4, assigneeId: "9", assistantId: "10", time: "20:04" }, // Maria / Paloma
      { id: "p8", type: "ministry_part", title: "Discurso", duration: 5, assigneeId: "11", time: "20:09" }, // Ademir Souza
      { id: "p9", type: "song", title: "Cântico 41", time: "20:16" },
      { id: "p10", type: "living_as_christians", title: "Boletim do Corpo Governante (2026) 1.", duration: 15, assigneeId: "2", time: "20:20" }, // Conrado Silva
      { id: "p11", type: "congregation_bible_study", title: "Estudo bíblico de congregação", duration: 30, conductorId: "12", readerId: "13", time: "20:35" }, // Alexandre / Amaury
      { id: "p12", type: "part", title: "Comentários finais", duration: 3, time: "21:05" },
      { id: "p13", type: "song", title: "Cântico 23", time: "21:10" },
    ]
  },
  {
    id: "m2",
    date: "2025-02-19",
    type: "midweek",
    chairmanId: "15", // Edvan Poscai
    openingPrayerId: "16", // Ed Carlos Pinheiro
    closingPrayerId: "26", // Sergio Batista
    parts: [
      { id: "p1", type: "song", title: "Cântico 150", time: "19:30" },
      { id: "p2", type: "part", title: "Comentários iniciais", duration: 1, time: "19:34" },
      { id: "p3", type: "part", title: "Não tenha medo por causa das palavras que você ouviu", duration: 10, assigneeId: "17", time: "19:35" }, // Ronaldo Xavier
      { id: "p4", type: "part", title: "Joias espirituais", duration: 10, assigneeId: "18", time: "19:45" }, // Gilberto Brandão
      { id: "p5", type: "bible_reading", title: "Leitura da Bíblia", duration: 4, assigneeId: "19", time: "19:55" }, // Alessandro Passos
      { id: "p6", type: "ministry_part", title: "Iniciando conversas", duration: 3, assigneeId: "20", assistantId: "21", time: "20:00" }, // Catarina / Barbara
      { id: "p7", type: "ministry_part", title: "Iniciando conversas", duration: 4, assigneeId: "22", assistantId: "23", time: "20:02" }, // Alice / Vera
      { id: "p8", type: "ministry_part", title: "Explicando suas crenças", duration: 5, assigneeId: "24", assistantId: "25", time: "20:06" }, // Antônia / Cláudia
      { id: "p9", type: "song", title: "Cântico 118", time: "20:15" },
      { id: "p10", type: "living_as_christians", title: "Em que se baseia a sua confiança?", duration: 15, assigneeId: "5", time: "20:20" }, // Giorgio Derico
      { id: "p11", type: "congregation_bible_study", title: "Estudo bíblico de congregação", duration: 30, conductorId: "2", readerId: "6", time: "20:35" }, // Conrado / Valdemar
      { id: "p12", type: "part", title: "Comentários finais", duration: 3, time: "21:05" },
      { id: "p13", type: "song", title: "Cântico 9", time: "21:10" },
    ]
  },
  {
    id: "w1",
    date: "2025-01-04",
    type: "weekend",
    chairmanId: "17", // Ronaldo Xavier
    closingPrayerId: "3", // Paulo Cesar
    parts: [
      { id: "p1", type: "public_talk", title: "Discurso Público", theme: "Fiquem parados e vejam como Jeová os salvará", speakerCongregation: "Alvinópolis - Atibaia", speakerId: "99", assigneeId: "99" }, // Hernan Cardoso (mock)
      { id: "p2", type: "watchtower_study", title: "Estudo de A Sentinela", readerId: "27", conductorId: "17" }, // Marcelo Souza, Ronaldo Xavier
    ]
  },
  {
    id: "w2",
    date: "2025-01-11",
    type: "weekend",
    chairmanId: "26", // Sergio Batista
    closingPrayerId: "17", // Ronaldo Xavier
    parts: [
      { id: "p1", type: "public_talk", title: "Discurso Público", theme: "Você está treinando bem a sua consciência?", speakerCongregation: "Alvinópolis - Atibaia", speakerId: "98", assigneeId: "98" }, // Edson Junior (mock)
      { id: "p2", type: "watchtower_study", title: "Estudo de A Sentinela", readerId: "28", conductorId: "26" }, // Jairo Costa, Sergio Batista
    ]
  }
];

export const USERS = [
  { id: "u1", name: "User Admin", role: "Coordinator", memberId: "1" },
  { id: "u2", name: "User Publisher", role: "Publisher", memberId: "3" },
];
