import { useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useState } from 'react';
import { IUser } from '@/types';
import { getCurrentUserBackend } from '@/lib/backend/api';

export const INITIAL_USER = {
    id: '',
    name: '',
    username: '',
    email: '',
    imageUrl: '',
    bio: '',
};

//To check if theres a logged in user at all times
const INITIAL_STATE = {
    user: INITIAL_USER,
    isLoading: false,
    isAuthenticated: false,
    setUser: () => {},
    setIsAuthenticated: () => {},
    checkAuthUser: async () => false as boolean,
}

type IContextType = {
    user: IUser;
    isLoading: boolean;
    setUser: React.Dispatch<React.SetStateAction<IUser>>;
    isAuthenticated: boolean;
    setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
    checkAuthUser: () => Promise<boolean>;
}

const AuthContext = createContext<IContextType>(INITIAL_STATE);

//Wrap the entire app and provide the access to the context, every context needs to have children because it wraps the entire app
export function AuthProvider ({ children }: {children: React.ReactNode}) {
    const navigate = useNavigate();
    const [user, setUser] = useState<IUser>(INITIAL_USER);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuthUser = async () => {
        setIsLoading(true);
        try {
            const currentUser = await getCurrentUserBackend();
        
            if(currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
                return true;
            }

            //No user from backend => treat as logged out
            setUser(INITIAL_USER);
            setIsAuthenticated(false);
            return false;
        } catch (error) {
            console.log(error);
            setUser(INITIAL_USER);
            setIsAuthenticated(false);
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        checkAuthUser();
    }, [])

    const value = {
        user,
        setUser,
        isLoading,
        isAuthenticated,
        setIsAuthenticated,
        checkAuthUser,
    }

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  )
}

export const useUserContext = () => useContext(AuthContext);