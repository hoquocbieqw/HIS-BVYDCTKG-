import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const statCard = (label, value, color) => (
    <div style={{ background: '#fff', padding: '22px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: `1px solid ${color}20`, textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '34px', fontWeight: 'bold', color }}>{value}</div>
    </div>
);

const Dashboard = ({ user }) => {
    const role = user?.role;
    const [stats, setStats] = useState({ appointments: 0, patients: 0, doctors: 0 });
    const [staffList, setStaffList] = useState([]);
    const [patientData, setPatientData] = useState({ debts: [], upcoming: [], history: [] });
    const [pendingCount, setPendingCount] = useState(0);
    const [stockAlerts, setStockAlerts] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [userCounts, setUserCounts] = useState({});
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [roomValue, setRoomValue] = useState('');

    const departments = [
        'Khoa Khám bệnh', 'Khoa Châm cứu – Dưỡng sinh', 'Khoa Nội Tổng hợp',
        'Khoa PHCN – Vật lý trị liệu', 'Khoa Chẩn đoán hình ảnh', 'Khoa Dược'
    ];

    useEffect(() => {
        loadData();
    // eslint-disable-next-line
    }, [role]);

    const loadData = async () => {
        try {
            if (role === 'Patient') {
                const res = await axios.get(`${API}/api/patient/dashboard`, auth());
                setPatientData(res.data);
                return;
            }

            const res = await axios.get(`${API}/api/dashboard/stats`, auth());
            setStats(res.data);

            if (['Doctor', 'Nurse', 'Receptionist', 'Admin'].includes(role)) {
                const pRes = await axios.get(`${API}/api/appointments/pending`, auth());
                setPendingCount(pRes.data.length);
            }

            if (['Doctor', 'Pharmacist', 'Admin'].includes(role)) {
                const mRes = await axios.get(`${API}/api/medicines/all`, auth());
                setStockAlerts(mRes.data.filter(m => m.StockQuantity <= 50));
            }

            if (['Cashier', 'Admin'].includes(role)) {
                const invRes = await axios.get(`${API}/api/invoices/paid`, auth());
                setRecentInvoices(invRes.data.slice(0, 5));
            }

            if (role === 'Admin') {
                const staffRes = await axios.get(`${API}/api/admin/staff`, auth());
                setStaffList(staffRes.data);
                const ucRes = await axios.get(`${API}/api/admin/users-count`, auth());
                setUserCounts(ucRes.data);
            }
        } catch (e) { console.error(e); }
    };

    const submitRoom = async () => {
        try {
            await axios.put(`${API}/api/admin/staff/${selectedStaffId}/room`, { room: roomValue }, auth());
            setShowRoomModal(false);
            loadData();
        } catch { alert('Lỗi phân phòng.'); }
    };

    if (role === 'Patient') {
        return (
            <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px' }}>HỒ SƠ CÁ NHÂN</h2>

                {patientData.debts.length > 0 && (
                    <div style={{ background: '#ff7675', color: '#fff', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <strong>Cảnh báo:</strong> Bạn có {patientData.debts.length} hồ sơ chưa thanh toán. Vui lòng liên hệ quầy Thu ngân.
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    {statCard('Lịch sắp tới', patientData.upcoming.length, '#0984e3')}
                    {statCard('Lần khám trước', patientData.history.length, '#27ae60')}
                    {statCard('Chưa thanh toán', patientData.debts.length, '#e74c3c')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
                        <h3 style={{ color: '#0984e3', marginTop: 0 }}>Lịch Khám Sắp Tới</h3>
                        {patientData.upcoming.length === 0 ? <p style={{ color: '#aaa' }}>Không có lịch hẹn sắp tới.</p> :
                            patientData.upcoming.map(u => (
                                <div key={u.AppointmentID} style={{ padding: '10px', border: '1px solid #e8f4fd', borderRadius: '6px', marginBottom: '8px', borderLeft: '4px solid #0984e3' }}>
                                    <div style={{ fontWeight: 'bold' }}>{new Date(u.AppointmentDate).toLocaleDateString('vi-VN')}</div>
                                    <div style={{ color: '#666', fontSize: '13px' }}>Khoa: {u.Department}</div>
                                    <div style={{ color: '#888', fontSize: '12px' }}>Bác sĩ: {u.DoctorName || 'Chưa phân công'}</div>
                                </div>
                            ))
                        }
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
                        <h3 style={{ color: '#27ae60', marginTop: 0 }}>Lịch Sử Khám Bệnh</h3>
                        {patientData.history.length === 0 ? <p style={{ color: '#aaa' }}>Chưa có lịch sử khám.</p> :
                            patientData.history.slice(0, 5).map(h => (
                                <div key={h.RecordID} style={{ padding: '10px', border: '1px solid #e8f8f5', borderRadius: '6px', marginBottom: '8px', borderLeft: '4px solid #27ae60' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{h.Diagnosis}</div>
                                    <div style={{ color: '#888', fontSize: '12px' }}>BS: {h.DoctorName} | {new Date(h.AppointmentDate).toLocaleDateString('vi-VN')}</div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '20px' }}>
                    <h3 style={{ color: '#0984e3', marginTop: 0 }}>Thông Tin Liên Hệ Bệnh Viện</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', color: '#555', fontSize: '14px', lineHeight: '1.8' }}>
                        <div>
                            <p>Địa chỉ: 64 Đống Đa, Rạch Giá, An Giang</p>
                            <p>Điện thoại: 0297.3862.161</p>
                            <p>Đường dây nóng: 0965...</p>
                        </div>
                        <div>
                            <p>Giờ làm việc: 7:00 – 17:00 (Thứ 2 – Thứ 7)</p>
                            <p>Khoa Châm cứu: Phòng 02</p>
                            <p>Quầy Thu ngân: Tầng 1</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ background: '#e8f4fd', padding: '16px 20px', borderRadius: '8px', borderLeft: '5px solid #0984e3', marginBottom: '24px' }}>
                <div style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>Xin chào, {user?.username}!</div>
                <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                    Vai trò: <strong style={{ color: '#0984e3' }}>{role}</strong> — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* THỐNG KÊ NHANH */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {statCard('Tổng Lịch Hẹn', stats.appointments, '#0984e3')}
                {statCard('Tổng Bệnh Nhân', stats.patients, '#27ae60')}
                {statCard('Bác Sĩ Trong Hệ Thống', stats.doctors, '#6c5ce7')}
                {['Doctor', 'Nurse', 'Receptionist', 'Admin'].includes(role) && statCard('Đang Chờ Khám', pendingCount, '#e67e22')}
            </div>

            {/* CẢNH BÁO KHO THUỐC */}
            {['Doctor', 'Pharmacist', 'Admin'].includes(role) && stockAlerts.length > 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #f39c12', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
                    <strong style={{ color: '#e67e22' }}>Cảnh báo kho:</strong> {stockAlerts.length} loại thuốc sắp hết tồn kho (dưới 50 đơn vị).
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {stockAlerts.map(m => (
                            <span key={m.MedicineID} style={{ background: '#e74c3c', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                                {m.MedicineName}: còn {m.StockQuantity} {m.Unit}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* HOÁ ĐƠN GẦN ĐÂY - CASHIER */}
            {['Cashier', 'Admin'].includes(role) && recentInvoices.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                    <h3 style={{ color: '#0984e3', marginTop: 0 }}>Hóa Đơn Thanh Toán Gần Nhất</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead><tr style={{ background: '#f8f9fa' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Mã HĐ</th>
                            <th style={{ padding: '8px' }}>Bệnh Nhân</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Số Tiền</th>
                            <th style={{ padding: '8px' }}>Thời Gian</th>
                        </tr></thead>
                        <tbody>
                            {recentInvoices.map(inv => (
                                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '8px', color: '#888' }}>#{inv.InvoiceID}</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{inv.PatientName}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', color: parseFloat(inv.TotalAmount) === 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                        {parseFloat(inv.TotalAmount) === 0 ? 'MIỄN PHÍ (K3)' : parseFloat(inv.TotalAmount).toLocaleString('vi-VN') + ' đ'}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ADMIN: USER COUNTS + PHÂN CÔNG PHÒNG */}
            {role === 'Admin' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        {Object.entries(userCounts).map(([r, cnt]) => (
                            <div key={r} style={{ background: '#fff', padding: '14px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e0e0e0' }}>
                                <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>{r.toUpperCase()}</div>
                                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0984e3' }}>{cnt}</div>
                            </div>
                        ))}
                    </div>

                    <h3 style={{ color: '#2c3e50' }}>Phân Công Phòng Trực Nhân Sự</h3>
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#0984e3', color: '#fff' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã NV</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Họ Tên</th>
                                <th style={{ padding: '12px 16px' }}>Chức Vụ</th>
                                <th style={{ padding: '12px 16px' }}>Phòng Trực</th>
                                <th style={{ padding: '12px 16px' }}>Thao Tác</th>
                            </tr></thead>
                            <tbody>
                                {staffList.map((s, i) => (
                                    <tr key={s.UserID} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px 16px', color: '#888' }}>NV{s.UserID}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{s.Username}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ background: '#e8f4fd', color: '#0984e3', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{s.Role}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: s.Room ? '#27ae60' : '#aaa', fontWeight: s.Room ? 'bold' : 'normal' }}>
                                            {s.Room || 'Chưa phân công'}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button onClick={() => { setSelectedStaffId(s.UserID); setRoomValue(s.Room || ''); setShowRoomModal(true); }}
                                                style={{ background: '#0984e3', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                                                Phân Phòng
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* DOCTOR DASHBOARD */}
            {role === 'Doctor' && (
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ color: '#2980b9', marginTop: 0 }}>Quy Trình Làm Việc Của Bác Sĩ</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        {[
                            { step: '1', label: 'Danh Sách Chờ Khám', desc: 'Xem bệnh nhân đã đặt lịch, chờ khám', path: '/patients' },
                            { step: '2', label: 'Lập Bệnh Án (EMR)', desc: 'Chẩn đoán ICD-10, kê đơn thuốc đông y', path: '/medical' },
                            { step: '3', label: 'Chỉ Định Liệu Trình', desc: 'Theo dõi châm cứu, PHCN, kéo cột sống', path: '/treatment' },
                        ].map(item => (
                            <div key={item.step} style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2980b9' }}>
                                <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>BƯỚC {item.step}</div>
                                <div style={{ fontWeight: 'bold', color: '#2c3e50', marginTop: '4px' }}>{item.label}</div>
                                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* NURSE DASHBOARD */}
            {role === 'Nurse' && (
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ color: '#27ae60', marginTop: 0 }}>Nhiệm Vụ Điều Dưỡng</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {[
                            { label: 'Thực Hiện Liệu Trình YHCT', desc: 'Châm cứu, xoa bóp, kéo cột sống, bấm giờ start/end' },
                            { label: 'Theo Dõi Bệnh Nhân', desc: 'Ghi sinh hiệu, huyết áp, nhịp tim trước kỹ thuật' },
                        ].map(item => (
                            <div key={item.label} style={{ background: '#f0fff4', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #27ae60' }}>
                                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.label}</div>
                                <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PHARMACIST DASHBOARD */}
            {role === 'Pharmacist' && (
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ color: '#8e44ad', marginTop: 0 }}>Quy Trình Dược Sĩ</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        {[
                            { label: 'Quản Lý Kho Thuốc', desc: 'Nhập/xuất/tồn vị thuốc YHCT, hạn dùng, cảnh báo hết kho' },
                            { label: 'Cấp Phát Thuốc', desc: 'Xem phiếu lĩnh thuốc từ Thu ngân, xuất thuốc, trừ kho' },
                            { label: 'Thống Kê Dược', desc: 'Top thuốc xuất nhiều, báo cáo tồn kho, doanh thu dược' },
                        ].map(item => (
                            <div key={item.label} style={{ background: '#fdf4ff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #8e44ad' }}>
                                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.label}</div>
                                <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CASHIER DASHBOARD */}
            {role === 'Cashier' && (
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ color: '#e67e22', marginTop: 0 }}>Quy Trình Thu Ngân (BHYT)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {[
                            { label: 'Thanh Toán Viện Phí', desc: 'Nhận diện BHYT K3, tự động tính 0đ nếu có giấy chuyển tuyến hợp lệ' },
                            { label: 'Thống Kê Doanh Thu', desc: 'Biểu đồ doanh thu theo ngày, chi tiết hóa đơn, phương thức thanh toán' },
                        ].map(item => (
                            <div key={item.label} style={{ background: '#fffbf0', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #e67e22' }}>
                                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.label}</div>
                                <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL PHÂN PHÒNG */}
            {showRoomModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '28px', borderRadius: '10px', width: '360px' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3' }}>Phân Khoa / Phòng Trực</h3>
                        <select value={roomValue} onChange={e => setRoomValue(e.target.value)}
                            style={{ width: '100%', padding: '12px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px', marginBottom: '20px' }}>
                            <option value="">-- Chọn khoa/phòng --</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowRoomModal(false)} style={{ flex: 1, padding: '10px', border: 'none', background: '#e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                            <button onClick={submitRoom} style={{ flex: 1, padding: '10px', border: 'none', background: '#0984e3', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Xác Nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;