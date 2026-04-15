import React from 'react';
import { NavLink } from 'react-router-dom';
import './components/MainLayout.css';
import logoImg from './logo.png';

const MainLayout = ({ user, onLogout, children }) => {
    const role = user?.role;

    const getRoleName = (r) => {
        const roles = {
            'Patient': 'BỆNH NHÂN',
            'Receptionist': 'LỄ TÂN',
            'Nurse': 'ĐIỀU DƯỠNG',
            'Doctor': 'BÁC SĨ',
            'Pharmacist': 'DƯỢC SĨ',
            'Cashier': 'THU NGÂN',
            'Admin': 'QUẢN TRỊ VIÊN'
        };
        return roles[r] || r;
    };

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="logo-area" style={{ textAlign: 'center', padding: '20px', borderBottom: '1px solid #ddd' }}>
                    <img src={logoImg} alt="Logo" style={{ width: '80px', marginBottom: '10px' }} />
                    <div style={{ color: '#0984e3', fontWeight: 'bold', fontSize: '14px' }}>BV YDCT KIÊN GIANG</div>
                </div>
                <nav className="nav-menu" style={{ marginTop: '10px' }}>
                    {user ? (
                        <>
                            <NavLink to="/dashboard" className="nav-item">Bảng điều khiển</NavLink>

                            {/* --- QUY TRÌNH 1: TIẾP NHẬN --- */}
                            {['Patient', 'Receptionist', 'Admin'].includes(role) && (
                                <div style={{ padding: '15px 20px 5px', fontSize: '13px', fontWeight: 'bold', color: '#34495e' }}>1. TIẾP NHẬN & ĐĂNG KÝ</div>
                            )}
                            {['Patient', 'Admin'].includes(role) && <NavLink to="/appointment" className="nav-item">Đăng ký khám Online</NavLink>}
                            {['Patient'].includes(role) && <NavLink to="/my-appointments" className="nav-item">Lịch sử đăng ký</NavLink>}
                            {['Receptionist', 'Admin'].includes(role) && (
                                <>
                                    <NavLink to="/reception" className="nav-item">Đăng ký khách vãng lai</NavLink>
                                    <NavLink to="/patients" className="nav-item">Quản lý hồ sơ bệnh nhân</NavLink>
                                </>
                            )}

                            {/* --- QUY TRÌNH 2: KHÁM & ĐIỀU TRỊ --- */}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && (
                                <div style={{ padding: '15px 20px 5px', fontSize: '13px', fontWeight: 'bold', color: '#34495e' }}>2. KHÁM BỆNH & YHCT</div>
                            )}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/patients" className="nav-item">Danh sách chờ khám</NavLink>}
                            {['Doctor', 'Admin'].includes(role) && <NavLink to="/medical" className="nav-item">Bệnh án chuyên sâu</NavLink>}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/treatment" className="nav-item">Chỉ định & Liệu trình</NavLink>}
                            {['Patient'].includes(role) && <NavLink to="/my-health" className="nav-item">Hồ sơ sức khỏe</NavLink>}

                            {/* --- QUY TRÌNH 3: THANH TOÁN & THUỐC --- */}
                            {['Pharmacist', 'Cashier', 'Doctor', 'Admin'].includes(role) && (
                                <div style={{ padding: '15px 20px 5px', fontSize: '13px', fontWeight: 'bold', color: '#34495e' }}>3. THANH TOÁN & NHẬN THUỐC</div>
                            )}
                            {['Cashier', 'Admin'].includes(role) && <NavLink to="/billing" className="nav-item">Thanh toán Viện phí</NavLink>}
                            {['Pharmacist', 'Doctor', 'Admin'].includes(role) && <NavLink to="/medicines" className="nav-item">Quản lý kho thuốc</NavLink>}
                            {['Pharmacist', 'Admin'].includes(role) && <NavLink to="/dispense" className="nav-item">Cấp phát thuốc</NavLink>}

                            {/* --- BÁO CÁO --- */}
                            {['Admin', 'Cashier', 'Pharmacist'].includes(role) && (
                                <div style={{ padding: '15px 20px 5px', fontSize: '13px', fontWeight: 'bold', color: '#34495e' }}>BÁO CÁO THỐNG KÊ</div>
                            )}
                            {['Cashier', 'Pharmacist', 'Admin'].includes(role) && <NavLink to="/admin/reports" className="nav-item">Thống kê doanh thu</NavLink>}
                            {role === 'Admin' && <NavLink to="/admin/users" className="nav-item" style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px', color: '#c0392b' }}>Phân quyền Hệ thống</NavLink>}
                        </>
                    ) : <div className="nav-item active">Vui lòng đăng nhập</div>}
                </nav>
            </div>
            <div className="main-area">
                <header className="header" style={{ justifyContent: user ? 'space-between' : 'flex-end', height: '60px', padding: '0 20px' }}>
                    {user && (
                        <>
                            <div style={{ fontSize: '16px' }}>Vai trò: <strong style={{ color: '#c0392b' }}>{getRoleName(role)}</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span>Xin chào, <strong>{user.username}</strong></span>
                                <button onClick={onLogout} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng xuất</button>
                            </div>
                        </>
                    )}
                </header>
                <div className="content-wrapper">{children}</div>
            </div>
        </div>
    );
};
export default MainLayout;