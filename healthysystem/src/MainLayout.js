import React from 'react';
import { NavLink } from 'react-router-dom';
import './components/MainLayout.css';
import logoImg from './logo.png';

const MainLayout = ({ user, onLogout, children }) => {
    const role = user?.role;

    const getRoleName = (r) => {
        const roles = {
            'Patient': 'BỆNH NHÂN', 'Receptionist': 'LỄ TÂN',
            'Nurse': 'ĐIỀU DƯỠNG', 'Doctor': 'BÁC SĨ',
            'Pharmacist': 'DƯỢC SĨ', 'Cashier': 'THU NGÂN', 'Admin': 'QUẢN TRỊ VIÊN'
        };
        return roles[r] || r;
    };

    const sectionStyle = {
        padding: '14px 18px 6px',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#95a5a6',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginTop: '8px'
    };

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="logo-area" style={{ textAlign: 'center', padding: '18px 10px', borderBottom: '1px solid #ddd' }}>
                    <img src={logoImg} alt="Logo" style={{ width: '70px', marginBottom: '8px' }} />
                    <div style={{ color: '#0984e3', fontWeight: 'bold', fontSize: '13px', lineHeight: '1.4' }}>BV YDCT KIÊN GIANG</div>
                </div>
                <nav className="nav-menu" style={{ marginTop: '8px' }}>
                    {user ? (
                        <>
                            <NavLink to="/dashboard" className="nav-item" style={{ fontWeight: 'bold', fontSize: '15px' }}>Bảng Điều Khiển</NavLink>

                            {/* QUY TRÌNH 1: TIẾP NHẬN */}
                            {['Patient', 'Receptionist', 'Admin'].includes(role) && (
                                <div style={sectionStyle}>Tiếp Nhận & Đăng Ký</div>
                            )}
                            {['Patient'].includes(role) && <NavLink to="/appointment" className="nav-item">Đăng Ký Khám Online</NavLink>}
                            {['Patient'].includes(role) && <NavLink to="/my-appointments" className="nav-item">Lịch Sử Đăng Ký</NavLink>}
                            {['Receptionist'].includes(role) && (
                                <>
                                    <NavLink to="/reception" className="nav-item">Tiếp Nhận Bệnh Nhân</NavLink>
                                    <NavLink to="/patients" className="nav-item">Hồ Sơ Bệnh Nhân</NavLink>
                                    <NavLink to="/schedule" className="nav-item">Xem Lịch Hẹn</NavLink>
                                </>
                            )}
                            {/* Admin chỉ xem hồ sơ, không đăng ký */}
                            {['Admin'].includes(role) && <NavLink to="/patients" className="nav-item">Hồ Sơ Bệnh Nhân</NavLink>}

                            {/* QUY TRÌNH 2: KHÁM & ĐIỀU TRỊ */}
                            {['Doctor', 'Nurse'].includes(role) && (
                                <div style={sectionStyle}>Khám Bệnh & YHCT</div>
                            )}
                            {['Doctor'].includes(role) && (
                                <>
                                    <NavLink to="/patients" className="nav-item">Danh Sách Chờ Khám</NavLink>
                                    <NavLink to="/medical" className="nav-item">Bệnh Án Điện Tử (EMR)</NavLink>
                                    <NavLink to="/treatment" className="nav-item">Chỉ Định & Liệu Trình</NavLink>
                                    <NavLink to="/medicines" className="nav-item">Kho Thuốc (Xem)</NavLink>
                                    <NavLink to="/schedule" className="nav-item">Lịch Công Tác</NavLink>
                                </>
                            )}
                            {['Nurse'].includes(role) && (
                                <>
                                    <NavLink to="/patients" className="nav-item">Danh Sách Bệnh Nhân</NavLink>
                                    <NavLink to="/treatment" className="nav-item">Thực Hiện Liệu Trình</NavLink>
                                    <NavLink to="/schedule" className="nav-item">Lịch Công Tác</NavLink>
                                </>
                            )}
                            {['Patient'].includes(role) && <NavLink to="/my-health" className="nav-item">Hồ Sơ Sức Khỏe</NavLink>}

                            {/* QUY TRÌNH 3: THANH TOÁN & THUỐC */}
                            {['Pharmacist', 'Cashier'].includes(role) && (
                                <div style={sectionStyle}>Thanh Toán & Nhận Thuốc</div>
                            )}
                            {['Cashier'].includes(role) && <NavLink to="/billing" className="nav-item">Thanh Toán Viện Phí</NavLink>}
                            {['Pharmacist'].includes(role) && (
                                <>
                                    <NavLink to="/medicines" className="nav-item">Quản Lý Kho Thuốc</NavLink>
                                    <NavLink to="/dispense" className="nav-item">Cấp Phát Thuốc</NavLink>
                                </>
                            )}

                            {/* BÁO CÁO */}
                            {['Admin', 'Cashier', 'Pharmacist'].includes(role) && (
                                <div style={sectionStyle}>Báo Cáo Thống Kê</div>
                            )}
                            {['Cashier', 'Pharmacist', 'Admin'].includes(role) && <NavLink to="/admin/reports" className="nav-item">Thống Kê & Báo Cáo</NavLink>}

                            {/* ADMIN */}
                            {role === 'Admin' && (
                                <>
                                    <div style={sectionStyle}>Quản Trị Hệ Thống</div>
                                    <NavLink to="/schedule" className="nav-item">Xem Lịch Hẹn</NavLink>
                                    <NavLink to="/medicines" className="nav-item">Kho Thuốc (Xem)</NavLink>
                                    <NavLink to="/billing" className="nav-item">Hóa Đơn (Xem)</NavLink>
                                    <NavLink to="/admin/users" className="nav-item" style={{ color: '#c0392b', fontWeight: 'bold' }}>Phân Quyền Hệ Thống</NavLink>
                                </>
                            )}
                        </>
                    ) : <div className="nav-item active">Vui lòng đăng nhập</div>}
                </nav>
            </div>
            <div className="main-area">
                <header className="header" style={{ justifyContent: user ? 'space-between' : 'flex-end', height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center' }}>
                    {user && (
                        <>
                            <div style={{ fontSize: '15px' }}>Vai trò: <strong style={{ color: '#c0392b' }}>{getRoleName(role)}</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span>Xin chào, <strong>{user.username}</strong></span>
                                <button onClick={onLogout} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng xuất</button>
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