import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const LogoutPage = () => {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            console.log('LogoutPage: Starting logout process...');
            try {
                console.log('LogoutPage: Calling signOut...');
                await signOut();
                console.log('LogoutPage: signOut completed successfully');
            } catch (error) {
                console.error('LogoutPage: Error signing out:', error);
            } finally {
                console.log('LogoutPage: Navigating to /login');
                navigate('/login', { replace: true });
            }
        };

        performLogout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <LoadingSpinner message="Signing out..." />;
};
