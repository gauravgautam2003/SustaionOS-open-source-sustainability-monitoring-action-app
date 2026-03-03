import React from 'react'
import Alerts from '../pages/Alerts'
import History from '../pages/History'
import Reports from '../pages/Reports'
import Landing from '../pages/Landing'
import Settings from '../pages/Settings'
import Dashboard from '../pages/Dashboard'
import { Routes, Route } from 'react-router-dom'

const AppRoutes = () => {
    return (
        <div>
            <Routes>
                <Route path='/' element={<Dashboard />} />
                <Route path='/alerts' element={<Alerts />} />
                <Route path='/history' element={<History />} />
                <Route path='/reports' element={<Reports />} />
                <Route path='/settings' element={<Settings />} />
                <Route path='/landing' element={<Landing />} />
            </Routes>
        </div>
    )
}

export default AppRoutes