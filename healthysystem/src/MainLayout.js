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
            'Doctor': 'BÁC SĨ YHCT',
            'Pharmacist': 'DƯỢC SĨ',
            'Cashier': 'THU NGÂN',
            'Admin': 'QUẢN TRỊ VIÊN'
        };
        return roles[r] || r;
    };

    return (
        <div className="app-container">
            <div className="sidebar">
                {/* LOGO KHU VỰC - TO RÕ TRANG TRỌNG */}
                <div className="logo-area" style={{
                    textAlign: 'center',
                    padding: '20px 15px 18px',
                    borderBottom: '2px solid #74b9ff',
                    background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)'
                }}>
                    <img src={logoImg} alt="Logo BV YDCT Kiên Giang" style={{
                        width: '90px',
                        height: '90px',
                        objectFit: 'contain',
                        marginBottom: '12px',
                        filter: 'drop-shadow(0 2px 4px rgba(9,132,227,0.2))'
                    }} />
                    <div style={{
                        color: '#0056b3',
                        fontWeight: '900',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        fontFamily: '"Times New Roman", Times, serif'
                    }}>
                        Bệnh viện
                    </div>
                    <div style={{
                        color: '#c0392b',
                        fontWeight: '900',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        fontFamily: '"Times New Roman", Times, serif',
                        marginTop: '2px'
                    }}>
                        Y Dược Cổ Truyền
                    </div>
                    <div style={{
                        color: '#0056b3',
                        fontWeight: '900',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        fontFamily: '"Times New Roman", Times, serif'
                    }}>
                        Kiên Giang
                    </div>
                    <div style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        color: '#636e72',
                        fontStyle: 'italic',
                        borderTop: '1px dashed #b2bec3',
                        paddingTop: '8px'
                    }}>
                        Kế thừa tinh hoa - Phục hồi sinh lực
                    </div>
                </div>

                <nav className="nav-menu" style={{ marginTop: '5px' }}>
                    {user ? (
                        <>
                            <NavLink to="/dashboard" className="nav-item">Bảng điều khiển</NavLink>

                            {/* --- QUY TRÌNH 1: TIẾP NHẬN --- */}
                            {['Patient', 'Receptionist', 'Admin'].includes(role) && (
                                <div style={{ padding: '12px 20px 4px', fontSize: '11px', fontWeight: 'bold', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    1. Tiếp nhận & Đăng ký
                                </div>
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
                                <div style={{ padding: '12px 20px 4px', fontSize: '11px', fontWeight: 'bold', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    2. Khám bệnh & YHCT
                                </div>
                            )}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/patients" className="nav-item">Danh sách chờ khám</NavLink>}
                            {['Doctor', 'Admin'].includes(role) && <NavLink to="/medical" className="nav-item">Bệnh án điện tử (EMR)</NavLink>}
                            {['Doctor', 'Nurse', 'Admin'].includes(role) && <NavLink to="/treatment" className="nav-item">Chỉ định & Liệu trình</NavLink>}
                            {['Patient'].includes(role) && <NavLink to="/my-health" className="nav-item">Hồ sơ sức khỏe cá nhân</NavLink>}

                            {/* --- QUY TRÌNH 3: THANH TOÁN & THUỐC --- */}
                            {['Pharmacist', 'Cashier', 'Doctor', 'Admin'].includes(role) && (
                                <div style={{ padding: '12px 20px 4px', fontSize: '11px', fontWeight: 'bold', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    3. Thanh toán & Nhận thuốc
                                </div>
                            )}
                            {['Cashier', 'Admin'].includes(role) && <NavLink to="/billing" className="nav-item">Thanh toán Viện phí</NavLink>}
                            {['Pharmacist', 'Doctor', 'Admin'].includes(role) && <NavLink to="/medicines" className="nav-item">Quản lý kho thuốc</NavLink>}
                            {['Pharmacist', 'Admin'].includes(role) && <NavLink to="/dispense" className="nav-item">Cấp phát thuốc</NavLink>}

                            {/* --- BÁO CÁO --- */}
                            {['Admin', 'Cashier', 'Pharmacist'].includes(role) && (
                                <div style={{ padding: '12px 20px 4px', fontSize: '11px', fontWeight: 'bold', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Báo cáo thống kê
                                </div>
                            )}
                            {['Cashier', 'Pharmacist', 'Admin'].includes(role) && <NavLink to="/admin/reports" className="nav-item">Thống kê doanh thu</NavLink>}
                            {role === 'Admin' && (
                                <NavLink to="/admin/users" className="nav-item" style={{ borderTop: '1px solid #dfe6e9', marginTop: '10px', paddingTop: '10px', color: '#c0392b', fontWeight: 'bold' }}>
                                    Phân quyền Hệ thống
                                </NavLink>
                            )}
                        </>
                    ) : <div className="nav-item active">Vui lòng đăng nhập</div>}
                </nav>
            </div>

            <div className="main-area">
                <header className="header" style={{ justifyContent: user ? 'space-between' : 'flex-end', height: '60px', padding: '0 20px', borderBottom: '2px solid #74b9ff' }}>
                    {user && (
                        <>
                            <div style={{ fontSize: '15px' }}>
                                Vai trò: <strong style={{ color: '#c0392b' }}>{getRoleName(role)}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{ fontSize: '14px' }}>Xin chào, <strong>{user.username}</strong></span>
                                <button onClick={onLogout} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Đăng xuất
                                </button>
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