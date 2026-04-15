import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import MainLayout from './MainLayout';
import Dashboard from './Dashboard';
import Appointment from './Appointment';
import Schedule from './Schedule';
import PatientList from './PatientList';
import MedicalRecords from './MedicalRecords';
import MedicineManagement from './MedicineManagement';
import Billing from './Billing';
import HomePage from './HomePage';
import PatientHistory from './PatientHistory';
import PatientAppointments from './PatientAppointments';
import AdvancedReport from './AdvancedReport';
import UserManagement from './UserManagement';
import Treatment from './Treatment';

function App() {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('role', userData.role);
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.clear();
    };

    const ProtectedRoute = ({ children, allowedRoles }) => {
        const role = localStorage.getItem('role');
        if (!user) return <Navigate to="/login" replace />;
        if (!allowedRoles.includes(role)) {
            alert("Bạn không có quyền truy cập trang này!");
            return <Navigate to="/dashboard" replace />;
        }
        return children;
    };

    return (
        <Router>
            <Routes>
                <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
                <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
                <Route path="/*" element={
                    <MainLayout user={user} onLogout={handleLogout}>
                        <Routes>
                            <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                            <Route path="/appointment" element={<ProtectedRoute allowedRoles={['Patient', 'Nurse', 'Admin']}><Appointment /></ProtectedRoute>} />
                            <Route path="/my-appointments" element={<ProtectedRoute allowedRoles={['Patient', 'Admin']}><PatientAppointments /></ProtectedRoute>} />
                            <Route path="/schedule" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Admin']}><Schedule /></ProtectedRoute>} />
                            <Route path="/patients" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Admin']}><PatientList /></ProtectedRoute>} />
                            <Route path="/medical" element={<ProtectedRoute allowedRoles={['Doctor', 'Admin']}><MedicalRecords /></ProtectedRoute>} />
                            <Route path="/treatment" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Admin']}><Treatment /></ProtectedRoute>} />
                            <Route path="/medicines" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Admin']}><MedicineManagement /></ProtectedRoute>} />
                            <Route path="/billing" element={<ProtectedRoute allowedRoles={['Nurse', 'Admin']}><Billing /></ProtectedRoute>} />
                            <Route path="/my-health" element={<ProtectedRoute allowedRoles={['Patient', 'Admin']}><PatientHistory /></ProtectedRoute>} />
                            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['Admin', 'Nurse']}><AdvancedReport /></ProtectedRoute>} />
                            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagement /></ProtectedRoute>} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}

export default App;