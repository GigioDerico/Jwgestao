import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <RouterProvider router={router} />
      </NotificationsProvider>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
