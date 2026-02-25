import React, { createContext, useContext, useState } from 'react';
import { Meeting, Person, people as initialPeople, mockMeetings as initialMeetings } from '../data/mockData';

interface AppContextType {
  meetings: Meeting[];
  people: Person[];
  currentUser: Person;
  toggleConfirmation: (meetingId: string, partId: string) => void;
  updateMeeting: (updatedMeeting: Meeting) => void;
  setCurrentUser: (personId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [people] = useState<Person[]>(initialPeople);
  const [currentUserId, setCurrentUserId] = useState<string>('1'); // Default to Conrado Silva

  const currentUser = people.find(p => p.id === currentUserId) || people[0];

  const toggleConfirmation = (meetingId: string, partId: string) => {
    setMeetings(prev => prev.map(m => {
      if (m.id !== meetingId) return m;
      return {
        ...m,
        parts: m.parts.map(p => {
          if (p.id !== partId) return p;
          return { ...p, confirmed: !p.confirmed };
        })
      };
    }));
  };

  const updateMeeting = (updatedMeeting: Meeting) => {
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
  };

  return (
    <AppContext.Provider value={{ meetings, people, currentUser, toggleConfirmation, updateMeeting, setCurrentUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
