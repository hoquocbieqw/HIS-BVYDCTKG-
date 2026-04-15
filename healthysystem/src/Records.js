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

const formatDateTime = (dateString) => new Date(dateString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

const StatCard = ({ title, value, color }) => (
    <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#ffffff', padding: '20px 15px', borderRadius: '8px', textAlign: 'center', borderBottom: `4px solid ${color}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ color: '#64748b', fontSize: '15px', fontWeight: 'bold' }}>{title}</div>
        <div style={{ color, fontSize: '32px', fontWeight: 'bold', marginTop: '10px' }}>{value}</div>
    </div>
);

const StatusBadge = ({ status }) => {
    const config = {
        Pending: { bg: '#fef08a', text: '#a16207', label: 'Đang chờ' },
        Confirmed: { bg: '#d1fae5', text: '#047857', label: 'Đã duyệt' },
        Cancelled: { bg: '#fee2e2', text: '#b91c1c', label: 'Đã hủy' }
    };
    const curr = config[status] || config.Pending;
    return <span style={{ backgroundColor: curr.bg, color: curr.text, padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', minWidth: '80px', textAlign: 'center' }}>{curr.label}</span>;
};

// CẬP NHẬT CỘT THAO TÁC: Cố định độ rộng và thêm chức năng khoảng trống ẩn (hidden)
const ActionBtn = ({ bg, label, onClick, hidden }) => {
    if (hidden) {
        return <div style={{ width: '65px', height: '26px' }}></div>; // Khoảng trống giữ chỗ để các nút khác không dồn sang
    }
    return (
        <button onClick={onClick} style={{ backgroundColor: bg, color: 'white', border: 'none', padding: '6px 0', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '65px', textAlign: 'center' }}>
            {label}
        </button>
    );
};

const Records = ({ user }) => {
    const [records, setRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [adminStats, setAdminStats] = useState(null);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [roomApptId, setRoomApptId] = useState(null);
    const [roomValue, setRoomValue] = useState('01'); 
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    useEffect(() => {
        fetchRecords();
        if (user?.role === 'Admin') fetchAdminStats();
    }, [user]);

    const fetchRecords = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/api/records', { headers: { 'Authorization': `Bearer ${token}` } });
            setRecords(res.data);
        } catch (err) {}
    };

    const fetchAdminStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/api/admin/users-count', { headers: { 'Authorization': `Bearer ${token}` } });
            setAdminStats(res.data);
        } catch (err) {}
    };

    const handleUpdateStatus = async (id, newStatus, doctorName) => {
        if (newStatus === 'Confirmed') {
            try {
                const token = localStorage.getItem('token');
                const resStaff = await axios.get('http://localhost:3001/api/admin/staff', { headers: { 'Authorization': `Bearer ${token}` } });
                const doctorRoom = resStaff.data.find(u => u.Username === doctorName)?.Room || "Chưa rõ";

                if (!window.confirm(`Duyệt lịch khám cho bệnh nhân vào Phòng ${doctorRoom} của Bs. ${doctorName}?`)) return;

                await axios.put(`http://localhost:3001/api/appointments/${id}/status`, { status: 'Confirmed' }, { headers: { 'Authorization': `Bearer ${token}` } });
                await axios.put(`http://localhost:3001/api/appointments/${id}/room`, { room: doctorRoom }, { headers: { 'Authorization': `Bearer ${token}` } });
                
                alert(`Đã đưa bệnh nhân vào Phòng ${doctorRoom}`);
                fetchRecords();
            } catch (err) { alert("Lỗi: Không thể lấy thông tin phòng của Bác sĩ."); }
        } else {
            if (!window.confirm("Xác nhận hủy lịch khám này?")) return;
            try {
                const token = localStorage.getItem('token');
                await axios.put(`http://localhost:3001/api/appointments/${id}/status`, { status: newStatus }, { headers: { 'Authorization': `Bearer ${token}` } });
                alert("Đã hủy thành công!");
                fetchRecords(); 
            } catch (err) { alert("Lỗi thao tác."); }
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`CẢNH BÁO: Xóa vĩnh viễn lịch khám #${id}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:3001/api/appointments/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            alert("Đã xóa thành công!");
            fetchRecords(); 
        } catch (err) { alert("Lỗi server."); }
    };

    const openRoomModal = (id, currentRoom) => { setRoomApptId(id); setRoomValue(currentRoom || '01'); setShowRoomModal(true); };

    const submitRoomAssign = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/api/appointments/${roomApptId}/room`, { room: roomValue }, { headers: { 'Authorization': `Bearer ${token}` } });
            alert("Đã báo phòng khám cho Bệnh nhân!");
            setShowRoomModal(false); 
            fetchRecords(); 
        } catch (err) { alert("Lỗi xếp phòng."); }
    };

    const openDetailModal = (record) => {
        setSelectedRecord(record);
        setShowDetailModal(true);
    };

    const isManager = user?.role === 'Nurse' || user?.role === 'Admin';
    const filteredRecords = records.filter(record => {
        const term = searchTerm.toLowerCase();
        const patientName = record.PatientFullName || record.PatientNameFallback || '';
        return patientName.toLowerCase().includes(term) || 
               (record.DoctorName || '').toLowerCase().includes(term) || 
               (record.Reason || '').toLowerCase().includes(term) || 
               (record.Room || '').includes(term) || 
               record.AppointmentID.toString().includes(term);
    });

    return (
        <div style={{ padding: '10px', position: 'relative' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>
                Quản Lý Hồ Sơ Bệnh Án
            </h2>

            {user?.role === 'Admin' && adminStats && (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                    <StatCard title="TỔNG BỆNH NHÂN" value={adminStats.Patient || 0} color="#0984e3" />
                    <StatCard title="TỔNG BÁC SĨ" value={adminStats.Doctor || 0} color="#2ecc71" />
                    <StatCard title="TỔNG Y TÁ" value={adminStats.Nurse || 0} color="#e67e22" />
                </div>
            )}
            
            {user?.role !== 'Patient' && (
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '5px 15px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <input type="text" placeholder="Tìm theo tên, bác sĩ, lý do, phòng khám hoặc mã lịch..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', border: 'none', padding: '12px 5px', fontSize: '15px', outline: 'none', color: '#1e293b', background: 'transparent' }} />
                </div>
            )}

            <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                    <thead style={{ backgroundColor: '#0984e3', color: 'white', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>Mã Lịch</th>
                            {user?.role !== 'Patient' && <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>Tên bệnh nhân</th>}
                            {user?.role !== 'Doctor' && <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>Bác sĩ phụ trách</th>}
                            <th style={{ padding: '15px', textAlign: 'center', whiteSpace: 'nowrap' }}>Phòng khám</th>
                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>Thời gian hẹn</th>
                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>Lý do khám</th>
                            <th style={{ padding: '15px', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                            {user?.role !== 'Patient' && <th style={{ padding: '15px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length > 0 ? filteredRecords.map((record, index) => (
                            <tr key={record.AppointmentID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '12px 15px', color: '#0984e3', fontWeight: 'bold' }}>#{record.AppointmentID}</td>
                                {user?.role !== 'Patient' && (
                                    <td style={{ padding: '12px 15px', color: '#0984e3', fontWeight: 'bold' }}>
                                        {record.PatientFullName || record.PatientNameFallback || 'Bệnh nhân'} 
                                        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'normal', display: 'block' }}>ID: {record.PatientID}</span>
                                    </td>
                                )}
                                {user?.role !== 'Doctor' && <td style={{ padding: '12px 15px', color: '#1e293b', fontWeight: '600' }}>Bs. {record.DoctorName || 'Chưa xếp'}</td>}
                                
                                <td style={{ padding: '12px 15px', color: '#059669', fontWeight: 'bold', textAlign: 'center' }}>
                                    {record.Room ? `Phòng ${record.Room}` : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>Chưa xếp</span>}
                                </td>
                                
                                <td style={{ padding: '12px 15px', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>{formatDateTime(record.AppointmentDate)}</td>
                                <td style={{ padding: '12px 15px', color: '#475569', fontSize: '14px' }}>{record.Reason}</td>
                                <td style={{ padding: '12px 15px', textAlign: 'center' }}><StatusBadge status={record.Status} /></td>
                                
                                {user?.role !== 'Patient' && (
                                    <td style={{ padding: '10px 15px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                            <ActionBtn bg="#3b82f6" label="Xem" onClick={() => openDetailModal(record)} />

                                            {isManager && (
                                                <ActionBtn 
                                                    bg="#10b981" 
                                                    label="Duyệt" 
                                                    onClick={() => handleUpdateStatus(record.AppointmentID, 'Confirmed', record.DoctorName)} 
                                                    hidden={record.Status !== 'Pending'} 
                                                />
                                            )}

                                            {isManager && (
                                                <ActionBtn 
                                                    bg="#0984e3" 
                                                    label={record.Room ? 'Sửa P.' : 'Xếp P.'} 
                                                    onClick={() => openRoomModal(record.AppointmentID, record.Room)} 
                                                />
                                            )}

                                            {user?.role === 'Admin' && (
                                                <ActionBtn 
                                                    bg="#f59e0b" 
                                                    label="Hủy" 
                                                    onClick={() => handleUpdateStatus(record.AppointmentID, 'Cancelled')} 
                                                    hidden={record.Status === 'Cancelled'} 
                                                />
                                            )}

                                            {user?.role === 'Admin' && (
                                                <ActionBtn 
                                                    bg="#ef4444" 
                                                    label="Xóa" 
                                                    onClick={() => handleDelete(record.AppointmentID)} 
                                                />
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        )) : <tr><td colSpan={user?.role !== 'Patient' ? "8" : "6"} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Không tìm thấy dữ liệu.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal Xếp Phòng */}
            {showRoomModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            XẾP PHÒNG KHÁM
                        </h3>
                        <p style={{ color: '#475569', fontSize: '15px', marginBottom: '10px', fontWeight: '600' }}>Chọn khoa/phòng để bệnh nhân đến khám:</p>
                        <select value={roomValue} onChange={(e) => setRoomValue(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '16px', outline: 'none', cursor: 'pointer', marginBottom: '25px', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                            {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRoomModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy</button>
                            <button onClick={submitRoomAssign} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Xem Chi Tiết */}
            {showDetailModal && selectedRecord && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '600px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            CHI TIẾT HỒ SƠ KHÁM BỆNH #{selectedRecord.AppointmentID}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Họ và tên bệnh nhân:</strong>
                                <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{selectedRecord.PatientFullName || selectedRecord.PatientNameFallback || 'Không có dữ liệu'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Ngày sinh:</strong>
                                <span style={{ color: '#1e293b' }}>{selectedRecord.DOB ? new Date(selectedRecord.DOB).toLocaleDateString('vi-VN') : 'Không có dữ liệu'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Số điện thoại:</strong>
                                <span style={{ color: '#1e293b' }}>{selectedRecord.ContactPhone || 'Không có dữ liệu'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Địa chỉ:</strong>
                                <span style={{ color: '#1e293b' }}>{selectedRecord.Address || 'Không có dữ liệu'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Người giám hộ:</strong>
                                <span style={{ color: '#1e293b' }}>{selectedRecord.Guardian || 'Không có'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Khoa khám bệnh:</strong>
                                <span style={{ color: '#0984e3', fontWeight: 'bold' }}>{selectedRecord.Department || 'Chưa phân khoa'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Bác sĩ phụ trách:</strong>
                                <span style={{ color: '#1e293b' }}>Bs. {selectedRecord.DoctorName || 'Chưa phân công'}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Thời gian dự kiến:</strong>
                                <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>{formatDateTime(selectedRecord.AppointmentDate)}</span>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Lý do khám:</strong>
                                <span style={{ color: '#1e293b' }}>{selectedRecord.Reason}</span>
                            </div>
                            <div style={{ display: 'flex', paddingBottom: '10px' }}>
                                <strong style={{ width: '180px', color: '#475569' }}>Trạng thái:</strong>
                                <span><StatusBadge status={selectedRecord.Status} /></span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
                            <button onClick={() => setShowDetailModal(false)} style={{ padding: '12px 30px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Records;