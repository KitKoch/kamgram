import { Link, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useSignOutAccount } from '@/lib/react-query/queries';
import { useEffect } from 'react';
import { useUserContext } from '@/context/AuthContext';
import { INavLink } from '@/types';
import { sidebarLinks } from '@/constants';
import { Button } from '@/components/ui/button';

const LeftSidebar = () => {

    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { user } = useUserContext();
    const { mutate: signOut, isSuccess } = useSignOutAccount();

    useEffect(() => {
        if(isSuccess) navigate(0);
    }, [isSuccess])

  return (
    <nav className="leftsidebar2">
      <div className="flex flex-col gap-11">
        <Link to="/" className="flex gap-3 items-center">
          <img 
              src="/assets/images/logo.svg"
              alt="logo"
              width={113}
              height={24}
          />
        </Link>

        <Link to={`/profile/${user.id}`} className="flex gap-3 items-center">
          <img 
            src={user.imageUrl || "/assets/icons/profile-placeholder.svg"} 
            alt="profile" 
            className="w-14 h-14 rounded-full" 
          />

          <div className='flex flex-col'>
            <p className="body-bold">
              {user.name}
            </p>
            <p className="small-regular text-black-50">
              @{user.username}
            </p>
          </div>
        </Link>

        <ul className='flex flex-col gap-6'>
          {sidebarLinks.map((link: INavLink) => {
            const isActive = pathname === link.route;

            return (
              <li 
              key={link.label} 
              className={`leftsidebar-link group ${isActive && 'bg-yellow-600'}`}
              >
                <NavLink
                  to={link.route}
                  className="flex gap-4 items-center p-4"
                >
                  <img
                    src={link.imgURL}
                    alt={link.label}
                    className={`group-hover:invert-white ${isActive && "invert-white"}`}
                  />
                  {link.label}
                </NavLink>                
              </li>
            );
          })}
        </ul>
      </div>

      <Button 
        variant="ghost" 
        className="shad-button_ghost" 
        onClick={() => signOut()}
      >
        <img src="/assets/icons/logout3.svg" alt="logout" />
        <p className="small-medium lg:base-medium">Logout</p>
      </Button>
    </nav>
  )
}

export default LeftSidebar;
