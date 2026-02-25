// Mock data for mechanical assignments

export interface AudioVideoAssignment {
  id: string;
  date: string;
  weekday: string;
  sound: string;
  image: string;
  stage: string;
  rovingMic1: string;
  rovingMic2: string;
  attendants: string[];
}

export interface FieldServiceAssignment {
  id: string;
  weekday: string;
  time: string;
  responsible: string;
  location: string;
  category: string; // e.g. 'Terça-feira', 'Quarta-feira', 'Sábado', 'Sábado - Rural', 'Domingo'
}

export interface CartAssignment {
  id: string;
  day: number;
  weekday: string;
  time: string;
  location: string;
  publisher1: string;
  publisher2: string;
  week: number; // 1-5
}

// Audio & Video / Indicadores - Fevereiro 2026
export const audioVideoAssignments: AudioVideoAssignment[] = [
  {
    id: 'av1', date: '2026-02-01', weekday: 'Domingo',
    sound: 'Vitor', image: 'Gilberto Brandão', stage: 'Jairo Costa',
    rovingMic1: 'João Pedro', rovingMic2: 'Júlio',
    attendants: ['Carlos', 'Nadir', 'Anderson'],
  },
  {
    id: 'av2', date: '2026-02-05', weekday: 'Quinta',
    sound: 'Matheus', image: 'Anderson Paim', stage: 'Pietro',
    rovingMic1: 'Vitor', rovingMic2: 'Nadir',
    attendants: ['Jairo Costa', 'Giorgio Derico', 'Gilberto Brandão'],
  },
  {
    id: 'av3', date: '2026-02-08', weekday: 'Domingo',
    sound: 'Ademir Souza', image: 'Marcelo Souza', stage: 'Cláudio',
    rovingMic1: 'Matheus', rovingMic2: 'Isaque',
    attendants: ['Vitor', 'Paulo Cesar', 'Amilton Guimarães'],
  },
  {
    id: 'av4', date: '2026-02-12', weekday: 'Quinta',
    sound: 'Guilherme', image: 'Paulo Cesar', stage: 'João Pedro',
    rovingMic1: 'Pietro', rovingMic2: 'Jairo Costa',
    attendants: ['Ademir Souza', 'Cláudio', 'Nadir'],
  },
  {
    id: 'av5', date: '2026-02-15', weekday: 'Domingo',
    sound: 'Júlio', image: 'Giorgio Derico', stage: 'Pietro',
    rovingMic1: 'Guilherme', rovingMic2: 'João Pedro',
    attendants: ['Ed Carlos Pinheiro', 'Gilberto Brandão', 'Jairo Costa'],
  },
  {
    id: 'av6', date: '2026-02-19', weekday: 'Quinta',
    sound: 'João Pedro', image: 'Marcelo Souza', stage: 'Vítor',
    rovingMic1: 'João Vitor', rovingMic2: 'Ademir Souza',
    attendants: ['Anderson Paim', 'Giorgio Derico', 'Paulo Cesar'],
  },
  {
    id: 'av7', date: '2026-02-22', weekday: 'Domingo',
    sound: 'João Vitor', image: 'Gilberto Brandão', stage: 'Mateus',
    rovingMic1: 'Cláudio', rovingMic2: 'Pietro',
    attendants: ['Vitor', 'Amilton Guimarães', 'Ronaldo Xavier'],
  },
  {
    id: 'av8', date: '2026-02-26', weekday: 'Quinta',
    sound: 'Pietro', image: 'Giorgio Derico', stage: 'João Vitor',
    rovingMic1: 'Matheus', rovingMic2: 'Júlio',
    attendants: ['Nadir', 'Ademir Souza', 'Cláudio'],
  },
];

// Saída de Campo - Fevereiro 2026
export const fieldServiceAssignments: FieldServiceAssignment[] = [
  { id: 'fs1', weekday: 'Terça-feira', time: '16:30', responsible: 'Amilton Guimarães', location: 'Salão do Reino', category: 'Terça-feira' },
  { id: 'fs2', weekday: 'Quarta-feira', time: '08:45', responsible: 'Sergio Batista', location: 'Salão do Reino', category: 'Quarta-feira' },
  { id: 'fs3', weekday: 'Sexta-feira', time: '08:45', responsible: 'Giorgio Derico', location: 'Salão do Reino', category: 'Sexta-feira' },
  { id: 'fs4', weekday: 'Sábado 07/02', time: '16:30', responsible: 'Gilberto Brandão', location: 'Salão do Reino', category: 'Sábado' },
  { id: 'fs5', weekday: 'Sábado 14/02', time: '16:30', responsible: 'Giorgio Derico', location: 'Salão do Reino', category: 'Sábado' },
  { id: 'fs6', weekday: 'Sábado 21/02', time: '16:30', responsible: 'Sergio Batista', location: 'Salão do Reino', category: 'Sábado' },
  { id: 'fs7', weekday: 'Sábado 28/02', time: '16:30', responsible: 'Cláudio Evangelista', location: 'Salão do Reino', category: 'Sábado' },
  { id: 'fs8', weekday: 'Sábado 07/02', time: '08:00', responsible: 'Ed Carlos Pinheiro', location: 'Salão do Reino', category: 'Sábado - Rural' },
  { id: 'fs9', weekday: 'Sábado 21/02', time: '08:00', responsible: 'Josenildo Novaes', location: 'Salão do Reino', category: 'Sábado - Rural' },
  { id: 'fs10', weekday: 'Domingo', time: '08:30 / 08:45', responsible: 'Saída dos Grupos', location: '', category: 'Domingo' },
];

// Carrinho - Janeiro 2026
export const cartAssignments: CartAssignment[] = [
  // Semana 1
  { id: 'c1', day: 6, weekday: 'Terça-feira', time: '09:00 às 11:00', location: 'Hospital', publisher1: 'Margarida', publisher2: 'Kátia', week: 1 },
  { id: 'c2', day: 6, weekday: 'Terça-feira', time: '14:00 às 16:00', location: 'Hospital', publisher1: 'Catarina Pedroso', publisher2: 'Ana Paula', week: 1 },
  { id: 'c3', day: 7, weekday: 'Quarta-feira', time: '14:00 às 16:00', location: 'Padaria da Bete', publisher1: 'Nazareth', publisher2: 'Cláudia Assis', week: 1 },
  { id: 'c4', day: 7, weekday: 'Quarta-feira', time: '18:30 às 19:30', location: 'Souza Bueno', publisher1: 'Gilberto Brandão', publisher2: 'Sérgio', week: 1 },
  { id: 'c5', day: 8, weekday: 'Quinta-feira', time: '08:00 às 10:00', location: 'Feira (Prox. Câmara)', publisher1: 'Luzia', publisher2: 'Valdemar Moreira', week: 1 },
  { id: 'c6', day: 8, weekday: 'Quinta-feira', time: '10:00 às 12:00', location: 'Feira (Prox. Câmara)', publisher1: 'Maria Amorim', publisher2: 'Fátima Guimarães', week: 1 },
  { id: 'c7', day: 9, weekday: 'Sexta-feira', time: '16:00 às 18:00', location: 'Padaria da Bete', publisher1: 'Jorge Brandão', publisher2: 'Meire Brandão', week: 1 },
  { id: 'c8', day: 10, weekday: 'Sábado', time: '11:00 às 12:00', location: 'Souza Bueno', publisher1: 'Silmara', publisher2: 'Bruna', week: 1 },
  { id: 'c9', day: 10, weekday: 'Sábado', time: '12:00 às 13:00', location: 'Souza Bueno', publisher1: 'Amaury Lira', publisher2: 'Giorgio Derico', week: 1 },
  // Semana 2
  { id: 'c10', day: 13, weekday: 'Terça-feira', time: '09:00 às 11:00', location: 'Hospital', publisher1: 'Nazareth', publisher2: 'Vera Andrade', week: 2 },
  { id: 'c11', day: 13, weekday: 'Terça-feira', time: '14:00 às 16:00', location: 'Hospital', publisher1: 'Jorge Brandão', publisher2: 'Amilton Guimarães', week: 2 },
  { id: 'c12', day: 14, weekday: 'Quarta-feira', time: '14:00 às 16:00', location: 'Padaria da Bete', publisher1: 'Maria Amorim', publisher2: 'Catarina Pedroso', week: 2 },
  { id: 'c13', day: 14, weekday: 'Quinta-feira', time: '08:00 às 10:00', location: 'Feira (Prox. Câmara)', publisher1: 'Leonor', publisher2: 'Ana Paula', week: 2 },
  { id: 'c14', day: 15, weekday: 'Quinta-feira', time: '10:00 às 12:00', location: 'Feira (Prox. Câmara)', publisher1: 'Margarida', publisher2: 'Fátima Guimarães', week: 2 },
  { id: 'c15', day: 16, weekday: 'Sexta-feira', time: '16:00 às 18:00', location: 'Padaria da Bete', publisher1: 'Cláudia Assis', publisher2: 'Sidnéia', week: 2 },
  { id: 'c16', day: 17, weekday: 'Sábado', time: '11:00 às 12:00', location: 'Souza Bueno', publisher1: 'Mara Batista', publisher2: 'Elisabete', week: 2 },
  { id: 'c17', day: 17, weekday: 'Sábado', time: '12:00 às 13:00', location: 'Souza Bueno', publisher1: 'Dionas Assis', publisher2: 'Claudio Evangelista', week: 2 },
  // Semana 3
  { id: 'c18', day: 20, weekday: 'Terça-feira', time: '09:00 às 11:00', location: 'Hospital', publisher1: 'Nazareth', publisher2: 'Catarina Pedroso', week: 3 },
  { id: 'c19', day: 20, weekday: 'Terça-feira', time: '14:00 às 16:00', location: 'Hospital', publisher1: 'Maria Amorim', publisher2: 'Vera Andrade', week: 3 },
  { id: 'c20', day: 21, weekday: 'Quarta-feira', time: '14:00 às 16:00', location: 'Padaria da Bete', publisher1: 'Amilton Guimarães', publisher2: 'Jorge Brandão', week: 3 },
  { id: 'c21', day: 21, weekday: 'Quarta-feira', time: '18:30 às 19:30', location: 'Souza Bueno', publisher1: 'Anderson Paim', publisher2: 'Alexandre Batista', week: 3 },
  { id: 'c22', day: 22, weekday: 'Quinta-feira', time: '08:00 às 10:00', location: 'Feira (Prox. Câmara)', publisher1: 'Giorgio Derico', publisher2: 'David', week: 3 },
  { id: 'c23', day: 22, weekday: 'Quinta-feira', time: '10:00 às 12:00', location: 'Feira (Prox. Câmara)', publisher1: 'Valdemar Moreira', publisher2: 'Luzia', week: 3 },
  { id: 'c24', day: 23, weekday: 'Sexta-feira', time: '16:00 às 18:00', location: 'Padaria da Bete', publisher1: 'Cláudia Assis', publisher2: 'Ana Paula', week: 3 },
  { id: 'c25', day: 24, weekday: 'Sábado', time: '11:00 às 12:00', location: 'Souza Bueno', publisher1: 'Barbara Silva', publisher2: 'Mayara', week: 3 },
  { id: 'c26', day: 24, weekday: 'Sábado', time: '12:00 às 13:00', location: 'Souza Bueno', publisher1: 'Sérgio', publisher2: 'Paulo Cesar', week: 3 },
  // Semana 4
  { id: 'c27', day: 27, weekday: 'Terça-feira', time: '09:00 às 11:00', location: 'Hospital', publisher1: 'Maria Amorim', publisher2: 'Margarida', week: 4 },
  { id: 'c28', day: 27, weekday: 'Terça-feira', time: '14:00 às 16:00', location: 'Hospital', publisher1: 'Amilton Guimarães', publisher2: 'David', week: 4 },
  { id: 'c29', day: 28, weekday: 'Quarta-feira', time: '14:00 às 16:00', location: 'Padaria da Bete', publisher1: 'Leonor', publisher2: 'Maria Amorim', week: 4 },
  { id: 'c30', day: 29, weekday: 'Quinta-feira', time: '08:00 às 10:00', location: 'Feira (Prox. Câmara)', publisher1: 'Cristiane', publisher2: 'Kátia', week: 4 },
  { id: 'c31', day: 29, weekday: 'Quinta-feira', time: '10:00 às 12:00', location: 'Feira (Prox. Câmara)', publisher1: 'Valdemar Moreira', publisher2: 'Luzia', week: 4 },
  { id: 'c32', day: 30, weekday: 'Sexta-feira', time: '16:00 às 18:00', location: 'Padaria da Bete', publisher1: 'Cláudia Assis', publisher2: 'Meire Brandão', week: 4 },
  { id: 'c33', day: 31, weekday: 'Sábado', time: '11:00 às 12:00', location: 'Souza Bueno', publisher1: 'Barbara Silva', publisher2: 'Andréa', week: 4 },
  { id: 'c34', day: 31, weekday: 'Sábado', time: '12:00 às 13:00', location: 'Souza Bueno', publisher1: 'Cristiano', publisher2: 'Alexandre Batista', week: 4 },
];
