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

// Import 2 Component mới cho quy trình BPMN Lễ tân và Dược sĩ
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
                            
                            {/* Phân quyền mới: Lễ tân được đăng ký và xem lịch */}
                            <Route path="/appointment" element={<ProtectedRoute allowedRoles={['Patient', 'Receptionist', 'Admin']}><Appointment /></ProtectedRoute>} />
                            <Route path="/my-appointments" element={<ProtectedRoute allowedRoles={['Patient', 'Receptionist', 'Admin']}><PatientAppointments /></ProtectedRoute>} />
                            
                            {/* Phân quyền mới: Lễ tân xem được lịch làm việc và danh sách bệnh nhân */}
                            <Route path="/schedule" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Receptionist', 'Admin']}><Schedule /></ProtectedRoute>} />
                            <Route path="/patients" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Receptionist', 'Admin']}><PatientList /></ProtectedRoute>} />
                            
                            {/* Tuyến Bác sĩ & Điều dưỡng YHCT */}
                            <Route path="/medical" element={<ProtectedRoute allowedRoles={['Doctor', 'Admin']}><MedicalRecords /></ProtectedRoute>} />
                            <Route path="/treatment" element={<ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Admin']}><Treatment /></ProtectedRoute>} />
                            
                            {/* Tuyến Dược sĩ: Quản lý kho và Phát thuốc */}
                            <Route path="/medicines" element={<ProtectedRoute allowedRoles={['Doctor', 'Pharmacist', 'Admin']}><MedicineManagement /></ProtectedRoute>} />
                            <Route path="/dispense" element={<ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}><PharmacyDispense /></ProtectedRoute>} />
                            
                            {/* Tuyến Thu ngân: Viện phí */}
                            <Route path="/billing" element={<ProtectedRoute allowedRoles={['Cashier', 'Admin']}><Billing /></ProtectedRoute>} />
                            
                            {/* Báo cáo: Thu ngân và Dược sĩ cùng xem được */}
                            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['Admin', 'Cashier', 'Pharmacist']}><AdvancedReport /></ProtectedRoute>} />
                            
                            {/* Bệnh nhân và Admin */}
                            <Route path="/my-health" element={<ProtectedRoute allowedRoles={['Patient', 'Admin']}><PatientHistory /></ProtectedRoute>} />
                            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagement /></ProtectedRoute>} />
                            
                            {/* Quy trình BPMN: Lễ tân tiếp nhận cấp số */}
                            <Route path="/reception" element={<ProtectedRoute allowedRoles={['Receptionist', 'Admin']}><Reception /></ProtectedRoute>} />
                            
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}

export default App;