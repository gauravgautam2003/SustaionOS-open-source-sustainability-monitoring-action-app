import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate,Outlet} from 'react-router-dom';
import Dashboard from '../pages/dashboard/Dashboard';
import Alerts from '../pages/dashboard/Alerts';
import EnergyAnalytics from '../pages/dashboard/EnergyAnalytics';
import WaterAnalytics from '../pages/dashboard/WaterAnalytics';
import SustainabilityReport from '../pages/reports/SustainabilityReport';
import BuildingsList from '../pages/buildings/BuildingsList';
import BuildingDetails from '../pages/buildings/BuildingDetails';
import Profile from '../pages/settings/Profile';
import OrganizationSettings from '../pages/settings/OrganizationSettings';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import NotFound from '../pages/NotFound';

import useAuth from '../hooks/useAuth';

// wrapper for protected routes
const PrivateRoute = () => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

const AppRoutes = () => (
    <>
        <Routes>
            {/* public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* protected section */}
            <Route element={<PrivateRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/alerts" element={<Alerts />} />
                <Route path="/dashboard/energy" element={<EnergyAnalytics />} />
                <Route path="/dashboard/water" element={<WaterAnalytics />} />
                <Route path="/reports/sustainability" element={<SustainabilityReport />} />
                <Route path="/buildings" element={<BuildingsList />} />
                <Route path="/buildings/:id" element={<BuildingDetails />} />
                <Route path="/settings/profile" element={<Profile />} />
                <Route path="/settings/organization" element={<OrganizationSettings />} />
            </Route>

            {/* catch‑all */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    </>
);

export default AppRoutes;
