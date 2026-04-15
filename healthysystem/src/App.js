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
import Reception from './Reception';
import PharmacyDispense from './PharmacyDispense';

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
            alert('Bạn không có quyền truy cập trang này!');
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

                            {/* QUY TRÌNH 1: TIẾP NHẬN & ĐĂNG KÝ */}
                            <Route path="/appointment" element={
                                <ProtectedRoute allowedRoles={['Patient', 'Receptionist']}>
                                    <Appointment />
                                </ProtectedRoute>
                            } />
                            <Route path="/my-appointments" element={
                                <ProtectedRoute allowedRoles={['Patient']}>
                                    <PatientAppointments />
                                </ProtectedRoute>
                            } />
                            <Route path="/reception" element={
                                <ProtectedRoute allowedRoles={['Receptionist']}>
                                    <Reception />
                                </ProtectedRoute>
                            } />
                            <Route path="/patients" element={
                                <ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Receptionist', 'Admin']}>
                                    <PatientList />
                                </ProtectedRoute>
                            } />

                            {/* QUY TRÌNH 2: KHÁM BỆNH & YHCT */}
                            <Route path="/medical" element={
                                <ProtectedRoute allowedRoles={['Doctor']}>
                                    <MedicalRecords />
                                </ProtectedRoute>
                            } />
                            <Route path="/treatment" element={
                                <ProtectedRoute allowedRoles={['Doctor', 'Nurse']}>
                                    <Treatment />
                                </ProtectedRoute>
                            } />
                            <Route path="/my-health" element={
                                <ProtectedRoute allowedRoles={['Patient']}>
                                    <PatientHistory />
                                </ProtectedRoute>
                            } />

                            {/* QUY TRÌNH 3: THANH TOÁN & THUỐC */}
                            {/* Doctor và Admin chỉ xem (MedicineManagement tự xử lý quyền bên trong) */}
                            <Route path="/medicines" element={
                                <ProtectedRoute allowedRoles={['Doctor', 'Pharmacist', 'Admin']}>
                                    <MedicineManagement />
                                </ProtectedRoute>
                            } />
                            <Route path="/dispense" element={
                                <ProtectedRoute allowedRoles={['Pharmacist']}>
                                    <PharmacyDispense />
                                </ProtectedRoute>
                            } />
                            {/* Admin chỉ xem billing (Billing tự xử lý quyền bên trong) */}
                            <Route path="/billing" element={
                                <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                                    <Billing />
                                </ProtectedRoute>
                            } />

                            {/* LỊCH & BÁO CÁO */}
                            <Route path="/schedule" element={
                                <ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Receptionist', 'Admin']}>
                                    <Schedule />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/reports" element={
                                <ProtectedRoute allowedRoles={['Admin', 'Cashier', 'Pharmacist']}>
                                    <AdvancedReport />
                                </ProtectedRoute>
                            } />

                            {/* QUẢN TRỊ */}
                            <Route path="/admin/users" element={
                                <ProtectedRoute allowedRoles={['Admin']}>
                                    <UserManagement />
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}

export default App;