import { createBrowserRouter, redirect } from 'react-router';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { MembersList } from './components/MembersList';
import { MeetingsPage } from './components/MeetingsPage';
import { AssignmentsPage } from './components/AssignmentsPage';
import {
  AudioVideoAssignmentsPage,
  CartAssignmentsPage,
  FieldServiceAssignmentsPage,
} from './components/AssignmentTypePages';
import { SettingsPage } from './components/SettingsPage';
import { SetupPasswordPage } from './components/SetupPassword';
import { MemberRegistrationForm } from './components/MemberRegistrationForm';
import { MinistryLayout } from './components/ministry/MinistryLayout';
import { FieldRecordPage } from './components/ministry/FieldRecordPage';
import { GoalsPage } from './components/ministry/GoalsPage';
import { HistoryPage } from './components/ministry/HistoryPage';
import { ReturnVisitsPage } from './components/ministry/ReturnVisitsPage';
import { StudiesPage } from './components/ministry/StudiesPage';
import { TerritoryPage } from './components/ministry/TerritoryPage';
import { LibraryPage } from './components/ministry/LibraryPage';
import { JournalPage } from './components/ministry/JournalPage';
import { MinistrySettingsPage } from './components/ministry/MinistrySettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/auth/setup-password',
    Component: SetupPasswordPage,
  },
  {
    path: '/cadastro',
    Component: MemberRegistrationForm,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { path: 'dashboard', Component: Dashboard },
      { path: 'members', Component: MembersList },
      { path: 'meetings', Component: MeetingsPage },
      { path: 'assignments', loader: () => redirect('/assignments/meetings') },
      { path: 'assignments/meetings', Component: AssignmentsPage },
      { path: 'assignments/audio-video', Component: AudioVideoAssignmentsPage },
      { path: 'assignments/field-service', Component: FieldServiceAssignmentsPage },
      { path: 'assignments/cart', Component: CartAssignmentsPage },
      {
        path: 'ministry',
        Component: MinistryLayout,
        children: [
          { index: true, loader: () => redirect('/ministry/field-record') },
          { path: 'field-record', Component: FieldRecordPage },
          { path: 'goals', Component: GoalsPage },
          { path: 'history', Component: HistoryPage },
          { path: 'return-visits', Component: ReturnVisitsPage },
          { path: 'studies', Component: StudiesPage },
          { path: 'territory', Component: TerritoryPage },
          { path: 'library', Component: LibraryPage },
          { path: 'journal', Component: JournalPage },
          { path: 'settings', Component: MinistrySettingsPage },
        ],
      },
      { path: 'settings', Component: SettingsPage },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/'),
  },
]);
