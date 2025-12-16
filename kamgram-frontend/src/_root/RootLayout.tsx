import { Outlet, Navigate } from 'react-router-dom';
import Bottombar from '@/components/shared/Bottombar';
import LeftSidebar from '@/components/shared/LeftSidebar';
import Topbar from '@/components/shared/Topbar';
import { useUserContext } from '@/context/AuthContext';
import Loader from '@/components/shared/Loader';

const RootLayout = () => {
  const { isAuthenticated, isLoading } = useUserContext();
  if(isLoading) return <Loader />;
  if(!isAuthenticated) return <Navigate to="/sign-in" replace />;
  
  return (
    <div className="w-full md:flex">
        <Topbar />
        <LeftSidebar />

        <section className='flex flex-1 h-full'>
          <Outlet />
        </section>

        <Bottombar />
    </div>
  )
}

export default RootLayout