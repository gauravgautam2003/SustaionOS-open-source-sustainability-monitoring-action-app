import React from 'react';
import AppRoutes from './routes/AppRoutes';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { useLocation } from 'react-router-dom';
import sustainOS from './assets/images/sustainOS.png';

function App() {


    const location = useLocation();
    // Hide Navbar and Footer on login and register pages
    const hideLayout = ['/login', '/register'].includes(location.pathname);

    return (
        <>
            <div className="lg:top-0  fixed w-full lg:h-screen min-h-screen right-0 lg:bg-cover " style={{ backgroundImage: `url(${sustainOS})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}>
            </div>
            {!hideLayout && <Navbar />}
            <main className="">
                <AppRoutes className="absolute"/>
            </main>
            {!hideLayout && <Footer />}
        </>
    );
}

export default App;
