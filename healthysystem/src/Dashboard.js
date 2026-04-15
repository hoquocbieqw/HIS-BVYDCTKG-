import React, { useState, useEffect } from 'react';
import axios from 'axios';

const departmentsList = [
    { id: '01', name: 'Khoa Khám bệnh (Phòng 01)' }, { id: '02', name: 'Khoa Cấp cứu (Phòng 02)' },
    { id: '03', name: 'Khoa Nội tổng hợp (Phòng 03)' }, { id: '04', name: 'Khoa Ngoại tổng hợp (Phòng 04)' },
    { id: '05', name: 'Khoa Nhi (Phòng 05)' }, { id: '06', name: 'Khoa Sản (Phòng 06)' },
    { id: '07', name: 'Khoa Răng Hàm Mặt (Phòng 07)' }, { id: '08', name: 'Khoa Tai Mũi Họng (Phòng 08)' },
    { id: '09', name: 'Khoa Mắt (Phòng 09)' }, { id: '10', name: 'Khoa Da liễu (Phòng 10)' },
    { id: '11', name: 'Khoa Thần kinh (Phòng 11)' }, { id: '12', name: 'Khoa Tim mạch (Phòng 12)' },
    { id: '13', name: 'Khoa Tiêu hóa (Phòng 13)' }, { id: '14', name: 'Khoa Cơ xương khớp (Phòng 14)' },
    { id: '15', name: 'Khoa Phục hồi chức năng (Phòng 15)' }
];

const Dashboard = ({ user }) => {
    const [stats, setStats] = useState({ appointments: 0, patients: 0, doctors: 0 });
    const [staffList, setStaffList] = useState([]); 
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [roomValue, setRoomValue] = useState('01');
    const [patientData, setPatientData] = useState({ debts: [], upcoming: [], history: [] });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (user?.role !== 'Patient') {
            axios.get('http://localhost:3001/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => setStats(res.data)).catch(console.error);
            if (user?.role === 'Admin') {
                axios.get('http://localhost:3001/api/admin/staff', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => setStaffList(res.data)).catch(console.error);
            }
        } else {
            axios.get('http://localhost:3001/api/patient/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => setPatientData(res.data)).catch(console.error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const openRoomModal = (id, currentRoom) => { setSelectedStaffId(id); setRoomValue(currentRoom || '01'); setShowRoomModal(true); };
    
    const submitStaffRoom = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/api/admin/staff/${selectedStaffId}/room`, { room: roomValue }, { headers: { 'Authorization': `Bearer ${token}` } });
            alert("Đã phân phòng trực thành công!");
            setShowRoomModal(false);
            const resStaff = await axios.get('http://localhost:3001/api/admin/staff', { headers: { 'Authorization': `Bearer ${token}` } });
            setStaffList(resStaff.data);
        } catch (err) { alert("Lỗi phân phòng."); }
    };

    return (
        <div style={{ padding: '10px', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '25px' }}>
                {user?.role === 'Patient' ? "TRANG THÔNG TIN BỆNH NHÂN" : "BẢNG ĐIỀU KHIỂN TỔNG QUAN"}
            </h2>

            {user?.role === 'Patient' ? (
                <div>
                    {patientData.debts.length > 0 && (
                        <div style={{ backgroundColor: '#ff7675', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 10px 0' }}>CẢNH BÁO CÔNG NỢ VIỆN PHÍ</h3>
                            <p style={{ margin: 0, fontSize: '16px' }}>Bạn đang có <strong>{patientData.debts.length}</strong> hồ sơ chưa hoàn tất thanh toán. Vui lòng liên hệ quầy thu ngân để đóng phí và nhận thuốc.</p>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {/* Cột Trái: Lịch khám */}
                        <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '25px', border: '1px solid #74b9ff', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#0984e3', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Lịch Khám Sắp Tới</h3>
                            {patientData.upcoming.length > 0 ? (
                                <ul style={{ paddingLeft: '20px', color: '#333' }}>
                                    {patientData.upcoming.map(u => (
                                        <li key={u.AppointmentID} style={{ marginBottom: '10px' }}>Ngày: <strong>{new Date(u.AppointmentDate).toLocaleDateString('vi-VN')}</strong> - Khoa/Phòng: {u.Department}</li>
                                    ))}
                                </ul>
                            ) : <p style={{ color: '#7f8c8d' }}>Chưa có lịch hẹn sắp tới.</p>}

                            <h3 style={{ color: '#27ae60', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Lịch Sử Khám Bệnh</h3>
                            {patientData.history.length > 0 ? (
                                <ul style={{ paddingLeft: '20px', color: '#333' }}>
                                    {patientData.history.map(h => (
                                        <li key={h.RecordID} style={{ marginBottom: '10px' }}>Ngày: <strong>{new Date(h.AppointmentDate).toLocaleDateString('vi-VN')}</strong> - BS: {h.DoctorName} - CĐ: {h.Diagnosis}</li>
                                    ))}
                                </ul>
                            ) : <p style={{ color: '#7f8c8d' }}>Chưa có lịch sử khám.</p>}
                        </div>

                        {/* Cột Phải: XÓA VIDEO - THAY BẰNG THÔNG TIN LIÊN HỆ */}
                        <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '25px', border: '1px solid #74b9ff', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#0984e3', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Thông Tin Hỗ Trợ</h3>
                            <div style={{ marginTop: '20px', color: '#555', lineHeight: '1.8', fontSize: '15px' }}>
                                <p>📍 <strong>Địa chỉ:</strong> 179-187 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP.HCM</p>
                                <p>📞 <strong>Hotline:</strong> 028 3932 0888</p>
                                <p>📧 <strong>Email:</strong> bvyhctq3@gmail.com</p>
                                <p>🕒 <strong>Giờ làm việc:</strong> 6:00 - 16:30 (Thứ 2 - Thứ 7)</p>
                                
                                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px', color: '#0984e3', fontWeight: 'bold', textAlign: 'center' }}>
                                    "Kế thừa tinh hoa - Phục hồi sinh lực"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Khu vực của Bác sĩ / Y tá / Admin giữ nguyên */
                <>
                    <div style={{ backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '10px', borderLeft: '6px solid #0984e3', marginBottom: '35px', boxShadow: '0 4px 10px rgba(9, 132, 227, 0.05)' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Xin chào, {user?.username}!</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>Bạn đang truy cập hệ thống với quyền: <strong style={{ color: '#0984e3', textTransform: 'uppercase' }}>{user?.role}</strong></p>
                        <p style={{ margin: '10px 0 0 0', color: '#888', fontStyle: 'italic' }}>Chúc bạn một ngày làm việc hiệu quả. Hãy sử dụng menu bên trái để điều hướng.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #74b9ff', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '18px' }}>Tổng Số Lịch Hẹn</h4>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0984e3' }}>{stats.appointments}</div>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #74b9ff', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '18px' }}>Tổng Hồ Sơ Bệnh Nhân</h4>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0984e3' }}>{stats.patients}</div>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #74b9ff', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '18px' }}>Bác Sĩ Đang Trực</h4>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0984e3' }}>{stats.doctors}</div>
                        </div>
                    </div>

                    {user?.role === 'Admin' && (
                        <>
                            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '25px', marginTop: '50px' }}>Quản Lý Phân Công Phòng Trực (Nhân Sự)</h2>
                            <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(9, 132, 227, 0.1)', border: '1px solid #74b9ff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                                    <thead style={{ backgroundColor: '#0984e3', color: 'white', textAlign: 'left' }}>
                                        <tr><th style={{ padding: '16px' }}>Mã NV</th><th style={{ padding: '16px' }}>Họ và tên</th><th style={{ padding: '16px' }}>Chức vụ</th><th style={{ padding: '16px', textAlign: 'center' }}>Phòng trực</th><th style={{ padding: '16px', textAlign: 'center' }}>Thao tác</th></tr>
                                    </thead>
                                    <tbody>
                                        {staffList.map((staff, index) => (
                                            <tr key={staff.UserID} style={{ borderBottom: '1px solid #dfe6e9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                                <td style={{ padding: '15px', color: '#666', fontWeight: 'bold' }}>NV{staff.UserID}</td>
                                                <td style={{ padding: '15px', color: '#2d3436', fontWeight: 'bold' }}>{staff.Username}</td>
                                                <td style={{ padding: '15px' }}><span style={{ backgroundColor: staff.Role === 'Doctor' ? '#e8f4fd' : '#fff0f1', color: staff.Role === 'Doctor' ? '#0984e3' : '#e17055', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{staff.Role === 'Doctor' ? 'Bác sĩ' : 'Y tá'}</span></td>
                                                <td style={{ padding: '15px', color: '#00b894', fontWeight: 'bold', textAlign: 'center' }}>{staff.Room ? `Phòng ${staff.Room}` : <span style={{ color: '#aaa', fontStyle: 'italic', fontWeight: 'normal' }}>Chưa có phòng</span>}</td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}><button onClick={() => openRoomModal(staff.UserID, staff.Room)} style={{ backgroundColor: '#0984e3', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>Đổi phòng</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {showRoomModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #74b9ff', paddingBottom: '15px', textAlign: 'center' }}>PHÂN KHOA / PHÒNG TRỰC</h3>
                                <p style={{ color: '#555', fontSize: '15px', marginBottom: '10px', fontWeight: 'bold' }}>Vui lòng chọn khoa/phòng làm việc cố định:</p>
                                <select value={roomValue} onChange={(e) => setRoomValue(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #74b9ff', fontSize: '16px', outline: 'none', cursor: 'pointer', marginBottom: '25px', backgroundColor: '#e8f4fd', color: '#333', fontWeight: 'bold' }}>
                                    {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowRoomModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Hủy</button>
                                    <button onClick={submitStaffRoom} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(9, 132, 227, 0.2)' }}>Xác nhận</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;