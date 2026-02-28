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
      { path: 'settings', Component: SettingsPage },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/'),
  },
]);
