import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { MembersList } from './components/MembersList';
import { MeetingsPage } from './components/MeetingsPage';
import { AssignmentsPage } from './components/AssignmentsPage';
import { SettingsPage } from './components/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { path: 'dashboard', Component: Dashboard },
      { path: 'members', Component: MembersList },
      { path: 'meetings', Component: MeetingsPage },
      { path: 'assignments', Component: AssignmentsPage },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);
