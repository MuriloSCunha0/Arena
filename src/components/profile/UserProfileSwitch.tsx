import { Suspense, lazy } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Loader } from 'lucide-react';

// Lazy loading profile components
const UserProfile = lazy(() => import('../../pages/profile/UserProfile').then(module => ({ default: module.UserProfile })));
const AdminProfile = lazy(() => import('../../pages/profile/AdminProfile').then(module => ({ default: module.AdminProfile })));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader className="w-8 h-8 text-brand-green animate-spin" />
  </div>
);

export const UserProfileSwitch = () => {
  const { userRole, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      {userRole === 'admin' ? <AdminProfile /> : <UserProfile />}
    </Suspense>
  );
};

export default UserProfileSwitch;
