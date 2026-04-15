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

// Sơ đồ bệnh viện giả định dạng SVG
const HospitalMap = () => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #74b9ff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 15px rgba(9,132,227,0.05)' }}>
        <h3 style={{ color: '#0984e3', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: '16px' }}>
            Sơ đồ Bệnh viện Y Dược Cổ truyền Kiên Giang
        </h3>
        <svg viewBox="0 0 600 400" style={{ width: '100%', maxHeight: '350px', border: '1px solid #dfe6e9', borderRadius: '8px' }}>
            {/* Nền */}
            <rect width="600" height="400" fill="#f0f9ff" rx="8"/>
            {/* Đường vào */}
            <rect x="250" y="370" width="100" height="30" fill="#b2bec3" rx="2"/>
            <text x="300" y="390" textAnchor="middle" fill="#2d3436" fontSize="10" fontWeight="bold">Cổng Chính</text>

            {/* Tòa nhà chính */}
            <rect x="50" y="50" width="500" height="300" fill="#dfe6e9" stroke="#b2bec3" strokeWidth="2" rx="4"/>

            {/* Hành lang giữa */}
            <rect x="275" y="50" width="50" height="300" fill="#e8f4fd" stroke="#74b9ff" strokeWidth="1"/>
            <text x="300" y="205" textAnchor="middle" fill="#0984e3" fontSize="9" fontWeight="bold" transform="rotate(-90, 300, 205)">Hành lang trung tâm</text>

            {/* Khu A - Cánh trái trên */}
            <rect x="60" y="60" width="205" height="70" fill="#00b894" stroke="#00a381" strokeWidth="1.5" rx="3"/>
            <text x="163" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Khoa Khám bệnh</text>
            <text x="163" y="100" textAnchor="middle" fill="white" fontSize="9">Phòng 01 | Tầng 1</text>
            <text x="163" y="115" textAnchor="middle" fill="#b2f0e8" fontSize="8">Lễ tân - Tiếp nhận</text>

            {/* Khu B - Cánh phải trên */}
            <rect x="335" y="60" width="205" height="70" fill="#e17055" stroke="#d35400" strokeWidth="1.5" rx="3"/>
            <text x="438" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Khoa Cấp cứu</text>
            <text x="438" y="100" textAnchor="middle" fill="white" fontSize="9">Phòng 02 | Tầng 1</text>
            <text x="438" y="115" textAnchor="middle" fill="#ffeaa7" fontSize="8">24/7 - Ưu tiên cao</text>

            {/* Khu C - Cánh trái giữa */}
            <rect x="60" y="140" width="205" height="65" fill="#0984e3" stroke="#0056b3" strokeWidth="1.5" rx="3"/>
            <text x="163" y="163" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Khoa YHCT - Chẩn đoán</text>
            <text x="163" y="178" textAnchor="middle" fill="white" fontSize="9">Phòng 03-04 | Tầng 1</text>
            <text x="163" y="194" textAnchor="middle" fill="#a9d4f5" fontSize="8">Bác sĩ YHCT - EMR</text>

            {/* Khu D - Cánh phải giữa */}
            <rect x="335" y="140" width="205" height="65" fill="#6c5ce7" stroke="#5a4bd1" strokeWidth="1.5" rx="3"/>
            <text x="438" y="163" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Khu Điều trị YHCT</text>
            <text x="438" y="178" textAnchor="middle" fill="white" fontSize="9">Phòng 05-08 | Tầng 1</text>
            <text x="438" y="194" textAnchor="middle" fill="#ddd" fontSize="8">Châm cứu - Xoa bóp</text>

            {/* Khu E - Cánh trái dưới */}
            <rect x="60" y="215" width="205" height="65" fill="#fdcb6e" stroke="#e0a80d" strokeWidth="1.5" rx="3"/>
            <text x="163" y="238" textAnchor="middle" fill="#2d3436" fontSize="11" fontWeight="bold">Kho Dược - Nhà thuốc</text>
            <text x="163" y="253" textAnchor="middle" fill="#2d3436" fontSize="9">Phòng 09-10 | Tầng 1</text>
            <text x="163" y="269" textAnchor="middle" fill="#636e72" fontSize="8">Cấp phát - Kho FEFO</text>

            {/* Khu F - Cánh phải dưới */}
            <rect x="335" y="215" width="205" height="65" fill="#55efc4" stroke="#00b894" strokeWidth="1.5" rx="3"/>
            <text x="438" y="238" textAnchor="middle" fill="#2d3436" fontSize="11" fontWeight="bold">Thu ngân - Viện phí</text>
            <text x="438" y="253" textAnchor="middle" fill="#2d3436" fontSize="9">Phòng 11 | Tầng 1</text>
            <text x="438" y="269" textAnchor="middle" fill="#636e72" fontSize="8">Thanh toán - BHYT</text>

            {/* Khu G - Dưới cùng toàn span */}
            <rect x="60" y="290" width="480" height="50" fill="#2d3436" stroke="#1a1a2e" strokeWidth="1.5" rx="3"/>
            <text x="300" y="311" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Tầng 2: X-Quang (PACS) | Phục hồi chức năng | Phòng bệnh nội trú</text>
            <text x="300" y="328" textAnchor="middle" fill="#b2bec3" fontSize="9">Phòng 12-15 | Khu nội trú 50 giường</text>

            {/* Chú thích */}
            <text x="300" y="358" textAnchor="middle" fill="#636e72" fontSize="8" fontStyle="italic">
                Sơ đồ giả định - Bệnh viện Y Dược Cổ Truyền Kiên Giang
            </text>
        </svg>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {[
                { color: '#00b894', label: 'Tiếp nhận / Khám bệnh' },
                { color: '#0984e3', label: 'YHCT - Chẩn đoán' },
                { color: '#6c5ce7', label: 'Khu điều trị' },
                { color: '#fdcb6e', label: 'Nhà thuốc / Kho dược' },
                { color: '#55efc4', label: 'Thu ngân' },
                { color: '#e17055', label: 'Cấp cứu' },
            ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                    <div style={{ width: '14px', height: '14px', backgroundColor: item.color, borderRadius: '2px', flexShrink: 0 }}></div>
                    <span style={{ color: '#636e72' }}>{item.label}</span>
                </div>
            ))}
        </div>
    </div>
);

const Dashboard = ({ user }) => {
    const [stats, setStats] = useState({ appointments: 0, patients: 0, doctors: 0 });
    const [staffList, setStaffList] = useState([]);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [roomValue, setRoomValue] = useState('01');
    const [patientData, setPatientData] = useState({ debts: [], upcoming: [], history: [], queueInfo: [] });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (user?.role !== 'Patient') {
            axios.get('http://localhost:3001/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => setStats(res.data)).catch(console.error);
            if (user?.role === 'Admin') {
                axios.get('http://localhost:3001/api/admin/staff', { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(res => setStaffList(res.data)).catch(console.error);
            }
        } else {
            axios.get('http://localhost:3001/api/patient/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => setPatientData(res.data)).catch(console.error);
        }
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
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>
                {user?.role === 'Patient' ? "TRANG THÔNG TIN BỆNH NHÂN" : "BẢNG ĐIỀU KHIỂN TỔNG QUAN"}
            </h2>

            {/* DASHBOARD BỆNH NHÂN */}
            {user?.role === 'Patient' ? (
                <div>
                    {patientData.debts && patientData.debts.length > 0 && (
                        <div style={{ backgroundColor: '#ff7675', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 10px 0' }}>CẢNH BÁO CÔNG NỢ VIỆN PHÍ</h3>
                            <p style={{ margin: 0, fontSize: '16px' }}>Bạn đang có <strong>{patientData.debts.length}</strong> hồ sơ chưa hoàn tất thanh toán. Vui lòng liên hệ quầy thu ngân để đóng phí và nhận thuốc.</p>
                        </div>
                    )}

                    {/* SỐ THỨ TỰ HIỆN TẠI */}
                    {patientData.queueInfo && patientData.queueInfo.length > 0 && (
                        <div style={{ backgroundColor: '#e8f4fd', border: '2px solid #0984e3', borderRadius: '10px', padding: '20px', marginBottom: '25px', textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', color: '#0984e3', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>
                                Số thứ tự khám của bạn
                            </div>
                            <div style={{ fontSize: '60px', fontWeight: 'bold', color: '#e74c3c', lineHeight: 1 }}>
                                {patientData.queueInfo[0].QueueNumber < 10 ? `0${patientData.queueInfo[0].QueueNumber}` : patientData.queueInfo[0].QueueNumber}
                            </div>
                            <div style={{ fontSize: '15px', color: '#555', marginTop: '8px' }}>
                                Khoa: <strong>{patientData.queueInfo[0].Department}</strong>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <span style={{ backgroundColor: patientData.queueInfo[0].Status === 'Called' ? '#d4edda' : '#fff3cd', color: patientData.queueInfo[0].Status === 'Called' ? '#155724' : '#856404', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                                    {patientData.queueInfo[0].Status === 'Called' ? 'Đã được gọi vào - Vui lòng vào phòng khám!' :
                                        patientData.queueInfo[0].Status === 'Approved' ? 'Đã được duyệt - Chờ gọi số...' :
                                            'Đang chờ duyệt...'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '25px', border: '1px solid #74b9ff', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#0984e3', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Lịch Khám Sắp Tới</h3>
                            {patientData.upcoming && patientData.upcoming.length > 0 ? (
                                <ul style={{ paddingLeft: '20px', color: '#333' }}>
                                    {patientData.upcoming.map(u => (
                                        <li key={u.AppointmentID} style={{ marginBottom: '10px' }}>
                                            Ngày: <strong>{new Date(u.AppointmentDate).toLocaleDateString('vi-VN')}</strong> - Khoa: {u.Department}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p style={{ color: '#7f8c8d' }}>Chưa có lịch hẹn sắp tới.</p>}

                            <h3 style={{ color: '#27ae60', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Lịch Sử Khám Bệnh</h3>
                            {patientData.history && patientData.history.length > 0 ? (
                                <ul style={{ paddingLeft: '20px', color: '#333' }}>
                                    {patientData.history.map(h => (
                                        <li key={h.RecordID} style={{ marginBottom: '10px' }}>
                                            Ngày: <strong>{new Date(h.AppointmentDate).toLocaleDateString('vi-VN')}</strong> - BS: {h.DoctorName} - CĐ: {h.Diagnosis}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p style={{ color: '#7f8c8d' }}>Chưa có lịch sử khám.</p>}
                        </div>

                        <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '25px', border: '1px solid #74b9ff', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#0984e3', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Thông Tin Hỗ Trợ</h3>
                            <div style={{ marginTop: '15px', color: '#555', lineHeight: '2', fontSize: '14px' }}>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Dia chi:</strong> 179-187 Nam Ky Khoi Nghia, Kien Giang</p>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Hotline:</strong> 0297 3812 345</p>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Email:</strong> bvydctkg@gmail.com</p>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Gio lam viec:</strong> 6:00 - 16:30 (Thu 2 - Thu 7)</p>
                                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px', color: '#0984e3', fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic', fontSize: '15px' }}>
                                    "Ke thua tinh hoa - Phuc hoi sinh luc"
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAP CHO BỆNH NHÂN */}
                    <div style={{ marginTop: '25px' }}>
                        <HospitalMap />
                    </div>
                </div>
            ) : (
                /* DASHBOARD NHÂN VIÊN */
                <>
                    <div style={{ backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '10px', borderLeft: '6px solid #0984e3', marginBottom: '35px', boxShadow: '0 4px 10px rgba(9, 132, 227, 0.05)' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Xin chào, {user?.username}!</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>Bạn đang truy cập hệ thống với quyền: <strong style={{ color: '#0984e3', textTransform: 'uppercase' }}>{user?.role}</strong></p>
                        <p style={{ margin: '10px 0 0 0', color: '#888', fontStyle: 'italic' }}>Chúc bạn một ngày làm việc hiệu quả. Hãy sử dụng menu bên trái để điều hướng.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '35px' }}>
                        {[
                            { label: 'Tổng Số Lịch Hẹn', value: stats.appointments, color: '#0984e3' },
                            { label: 'Tổng Hồ Sơ Bệnh Nhân', value: stats.patients, color: '#27ae60' },
                            { label: 'Bác Sĩ Đang Trực', value: stats.doctors, color: '#e17055' },
                        ].map(item => (
                            <div key={item.label} style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #74b9ff', textAlign: 'center' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '16px' }}>{item.label}</h4>
                                <div style={{ fontSize: '40px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* MAP BỆNH VIỆN - Hiện cho tất cả nhân viên */}
                    <div style={{ marginBottom: '35px' }}>
                        <HospitalMap />
                    </div>

                    {user?.role === 'Admin' && (
                        <>
                            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '25px' }}>Quản Lý Phân Công Phòng Trực (Nhân Sự)</h2>
                            <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(9, 132, 227, 0.1)', border: '1px solid #74b9ff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                                    <thead style={{ backgroundColor: '#0984e3', color: 'white', textAlign: 'left' }}>
                                        <tr>
                                            <th style={{ padding: '16px' }}>Mã NV</th>
                                            <th style={{ padding: '16px' }}>Họ và tên</th>
                                            <th style={{ padding: '16px' }}>Chức vụ</th>
                                            <th style={{ padding: '16px', textAlign: 'center' }}>Phòng trực</th>
                                            <th style={{ padding: '16px', textAlign: 'center' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffList.map((staff, index) => (
                                            <tr key={staff.UserID} style={{ borderBottom: '1px solid #dfe6e9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                                <td style={{ padding: '15px', color: '#666', fontWeight: 'bold' }}>NV{staff.UserID}</td>
                                                <td style={{ padding: '15px', color: '#2d3436', fontWeight: 'bold' }}>{staff.Username}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <span style={{ backgroundColor: staff.Role === 'Doctor' ? '#e8f4fd' : '#fff0f1', color: staff.Role === 'Doctor' ? '#0984e3' : '#e17055', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                                                        {staff.Role === 'Doctor' ? 'Bac si' : staff.Role === 'Nurse' ? 'Y ta' : staff.Role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '15px', color: '#00b894', fontWeight: 'bold', textAlign: 'center' }}>
                                                    {staff.Room ? `Phong ${staff.Room}` : <span style={{ color: '#aaa', fontStyle: 'italic', fontWeight: 'normal' }}>Chua co phong</span>}
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    <button onClick={() => openRoomModal(staff.UserID, staff.Room)} style={{ backgroundColor: '#0984e3', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                        Doi phong
                                                    </button>
                                                </td>
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
                                <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #74b9ff', paddingBottom: '15px', textAlign: 'center' }}>PHAN KHOA / PHONG TRUC</h3>
                                <p style={{ color: '#555', fontSize: '15px', marginBottom: '10px', fontWeight: 'bold' }}>Vui long chon khoa/phong lam viec:</p>
                                <select value={roomValue} onChange={(e) => setRoomValue(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '2px solid #74b9ff', fontSize: '15px', outline: 'none', cursor: 'pointer', marginBottom: '25px', backgroundColor: '#e8f4fd', color: '#333', fontWeight: 'bold' }}>
                                    {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button onClick={() => setShowRoomModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>Huy</button>
                                    <button onClick={submitStaffRoom} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>Xac nhan</button>
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