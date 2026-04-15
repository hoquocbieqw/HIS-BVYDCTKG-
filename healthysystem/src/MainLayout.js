import React from 'react';
import { NavLink } from 'react-router-dom';
import './components/MainLayout.css';
import logoImg from './logo.png';

const MainLayout = ({ user, onLogout, children }) => {
    const role = user?.role;
    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="logo-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '25px 10px 15px 10px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
                    <img src={logoImg} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '10px' }} />
                    <div style={{ textAlign: 'center', color: '#0984e3', fontWeight: '900', fontSize: '14px', lineHeight: '1.4' }}>BỆNH VIỆN Y HỌC CỔ TRUYỀN<br/>KIÊN GIANG</div>
                </div>
                <nav className="nav-menu" style={{ marginTop: '10px' }}>
                    {user ? (
                        <>
                            <NavLink to="/dashboard" className="nav-item">Dashboard</NavLink>
                            {['Patient', 'Nurse', 'Admin'].includes(role) && <NavLink to="/appointment" className="nav-item">Đăng ký khám</NavLink>}
                            {['Patient', 'Admin'].includes(role) && (
                                <>
                                    <NavLink to="/my-appointments" className="nav-item">Lịch sử đăng ký</NavLink>
                                    <NavLink to="/my-health" className="nav-item">Hồ sơ sức khỏe</NavLink>
                                </>
                            )}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && (
                                <>
                                    <NavLink to="/schedule" className="nav-item">Lịch làm việc</NavLink>
                                    <NavLink to="/patients" className="nav-item">Quản lý bệnh nhân</NavLink>
                                    <NavLink to="/treatment" className="nav-item">Liệu trình YHCT</NavLink>
                                </>
                            )}
                            {['Doctor', 'Admin'].includes(role) && <NavLink to="/medical" className="nav-item">Khám Bệnh (Bệnh án)</NavLink>}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/medicines" className="nav-item">Quản lý Kho thuốc</NavLink>}
                            {['Nurse', 'Admin'].includes(role) && (
                                <>
                                    <NavLink to="/billing" className="nav-item">Quản lý Viện phí</NavLink>
                                    <NavLink to="/admin/reports" className="nav-item">Thống kê doanh thu</NavLink>
                                </>
                            )}
                            {role === 'Admin' && <NavLink to="/admin/users" className="nav-item" style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px', color: '#c0392b' }}>Phân quyền User</NavLink>}
                        </>
                    ) : <div className="nav-item active">Vui lòng đăng nhập</div>}
                </nav>
            </div>
            <div className="main-area">
                <div className="top-banner">HỆ THỐNG QUẢN LÝ THÔNG TIN Y TẾ TỔNG THỂ - CLINIC ERP</div>
                <header className="header" style={{ justifyContent: user ? 'space-between' : 'flex-end', minHeight: user ? '60px' : '20px' }}>
                    {user && (
                        <>
                            <div><strong style={{ color: '#2c3e50' }}>Trạng thái:</strong> <span style={{ color: '#c0392b', marginLeft: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{user.role}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <span style={{ color: '#2c3e50', fontSize: '15px' }}>Xin chào, <strong>{user.username}</strong></span>
                                <button onClick={onLogout} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Thoát</button>
                            </div>
                        </>
                    )}
                </header>
                <div className="content-wrapper">{children}</div>
                <footer className="footer">©2026 Health System Project | Phân tích và Thiết kế Hệ thống Y Tế</footer>
            </div>
        </div>
    );
};
export default MainLayout;