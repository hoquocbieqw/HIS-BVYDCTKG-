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

    const sectionLabel = (text) => (
        <div style={{
            padding: '14px 18px 4px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#95a5a6',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            marginTop: '6px'
        }}>{text}</div>
    );

    return (
        <div className="app-container">
            {/* ====== SIDEBAR ====== */}
            <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Logo area - logo tròn to bên trái */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '18px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(0,0,0,0.08)'
                }}>
                    <img
                        src={logoImg}
                        alt="Logo BV YDCT Kiên Giang"
                        style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                            flexShrink: 0
                        }}
                    />
                    <div>
                        <div style={{
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '11.5px',
                            lineHeight: '1.4',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}>
                            BV Y DƯỢC CỔ TRUYỀN<br />KIÊN GIANG
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="nav-menu" style={{ marginTop: '8px', flex: 1 }}>
                    {user ? (
                        <>
                            <NavLink to="/dashboard" className="nav-item">Bảng điều khiển</NavLink>

                            {/* QUY TRÌNH 1: TIẾP NHẬN */}
                            {['Patient', 'Receptionist', 'Admin'].includes(role) && sectionLabel('Tiếp nhận & Đăng ký')}
                            {['Patient', 'Admin'].includes(role) && <NavLink to="/appointment" className="nav-item">Đăng ký khám Online</NavLink>}
                            {['Patient'].includes(role) && <NavLink to="/my-appointments" className="nav-item">Lịch sử đăng ký</NavLink>}
                            {['Patient'].includes(role) && <NavLink to="/my-health" className="nav-item">Hồ sơ sức khỏe</NavLink>}
                            {['Receptionist', 'Admin'].includes(role) && (
                                <>
                                    <NavLink to="/reception" className="nav-item">Đăng ký khách vãng lai</NavLink>
                                    <NavLink to="/patients" className="nav-item">Quản lý hồ sơ bệnh nhân</NavLink>
                                </>
                            )}

                            {/* QUY TRÌNH 2: KHÁM & ĐIỀU TRỊ */}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && sectionLabel('Khám bệnh & YHCT')}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/patients" className="nav-item">Danh sách chờ khám</NavLink>}
                            {['Doctor', 'Admin'].includes(role) && <NavLink to="/medical" className="nav-item">Bệnh án điện tử EMR</NavLink>}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/treatment" className="nav-item">Chỉ định & Liệu trình</NavLink>}

                            {/* QUY TRÌNH 3: THANH TOÁN & THUỐC */}
                            {['Pharmacist', 'Cashier', 'Doctor', 'Admin'].includes(role) && sectionLabel('Thanh toán & Nhận thuốc')}
                            {['Cashier', 'Admin'].includes(role) && <NavLink to="/billing" className="nav-item">Thanh toán Viện phí</NavLink>}
                            {['Pharmacist', 'Doctor', 'Admin'].includes(role) && <NavLink to="/medicines" className="nav-item">Quản lý kho thuốc</NavLink>}
                            {['Pharmacist', 'Admin'].includes(role) && <NavLink to="/dispense" className="nav-item">Cấp phát thuốc</NavLink>}

                            {/* BÁO CÁO */}
                            {['Admin', 'Cashier', 'Pharmacist'].includes(role) && sectionLabel('Báo cáo thống kê')}
                            {['Cashier', 'Pharmacist', 'Admin'].includes(role) && <NavLink to="/admin/reports" className="nav-item">Thống kê doanh thu</NavLink>}
                            {role === 'Admin' && (
                                <NavLink to="/admin/users" className="nav-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px' }}>
                                    Phân quyền Hệ thống
                                </NavLink>
                            )}
                        </>
                    ) : (
                        <div className="nav-item active">Vui lòng đăng nhập</div>
                    )}
                </nav>
            </div>

            {/* ====== MAIN AREA ====== */}
            <div className="main-area">
                <header className="header" style={{ position: 'relative', height: '64px', padding: '0 20px', display: 'flex', alignItems: 'center' }}>
                    {/* Chữ bệnh viện ở chính giữa header */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{
                            fontSize: '18px',
                            fontWeight: '900',
                            color: '#0984e3',
                            letterSpacing: '0.5px',
                            textShadow: '0 1px 2px rgba(9,132,227,0.15)'
                        }}>
                            BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG
                        </span>
                    </div>

                    {/* Thông tin user bên phải */}
                    {user && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '14px', color: '#555' }}>
                                Xin chào, <strong>{user.username}</strong>
                                <span style={{ marginLeft: '8px', color: '#c0392b', fontWeight: 'bold' }}>({getRoleName(role)})</span>
                            </span>
                            <button
                                onClick={onLogout}
                                style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '7px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '13px'
                                }}
                            >
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </header>
                <div className="content-wrapper">{children}</div>
            </div>
        </div>
    );
};

export default MainLayout;