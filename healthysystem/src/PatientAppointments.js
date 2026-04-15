import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PatientAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAppt, setEditingAppt] = useState(null);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/api/patient/appointments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAppointments(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Lỗi lấy danh sách lịch khám:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleDeleteAppt = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy lịch khám này?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:3001/api/patient/appointments/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Đã hủy lịch khám thành công!");
            fetchAppointments();
        } catch (error) {
            alert("Lỗi khi hủy lịch. Có thể lịch này không còn ở trạng thái chờ.");
        }
    };

    const openEditModal = (appt) => {
        const dateObj = new Date(appt.AppointmentDate);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);

        setEditingAppt({ ...appt, appointmentDate: localISOTime });
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        setEditingAppt({ ...editingAppt, [e.target.name]: e.target.value });
    };

    const submitEditAppt = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                patientName: editingAppt.PatientFullName,
                dob: editingAppt.DOB,
                phone: editingAppt.ContactPhone,
                address: editingAppt.Address,
                guardian: editingAppt.Guardian,
                department: editingAppt.Department,
                appointmentDate: editingAppt.appointmentDate,
                reason: editingAppt.Reason,
            };

            await axios.put(`http://localhost:3001/api/patient/appointments/${editingAppt.AppointmentID}`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Cập nhật thông tin lịch khám thành công!");
            setShowEditModal(false);
            fetchAppointments();
        } catch (error) {
            alert("Lỗi cập nhật. Hãy chắc chắn lịch này vẫn đang chờ khám.");
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'Pending': return { color: '#e67e22', fontWeight: 'bold' };
            case 'Confirmed': return { color: '#27ae60', fontWeight: 'bold' };
            case 'Cancelled': return { color: '#c0392b', fontWeight: 'bold', textDecoration: 'line-through' };
            default: return {};
        }
    };

    const getStatusText = (status) => {
        switch(status) {
            case 'Pending': return 'Chờ khám';
            case 'Confirmed': return 'Đã khám';
            case 'Cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Đang tải dữ liệu...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>
                LỊCH SỬ ĐĂNG KÝ KHÁM CỦA TÔI
            </h2>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Thời gian hẹn</th>
                            <th style={{ padding: '12px' }}>Bệnh nhân</th>
                            <th style={{ padding: '12px' }}>Khoa khám</th>
                            <th style={{ padding: '12px' }}>Bác sĩ</th>
                            <th style={{ padding: '12px' }}>Trạng thái</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.length > 0 ? appointments.map(a => (
                            <tr key={a.AppointmentID} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px' }}>{new Date(a.AppointmentDate).toLocaleString('vi-VN')}</td>
                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#0984e3' }}>{a.PatientFullName}</td>
                                <td style={{ padding: '12px' }}>{a.Department}</td>
                                <td style={{ padding: '12px' }}>Bs. {a.DoctorName}</td>
                                <td style={{ padding: '12px' }}><span style={getStatusStyle(a.Status)}>{getStatusText(a.Status)}</span></td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {a.Status === 'Pending' && (
                                        <>
                                            <button onClick={() => openEditModal(a)} style={{ background: '#f1c40f', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontWeight: 'bold' }}>Sửa</button>
                                            <button onClick={() => handleDeleteAppt(a.AppointmentID)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        )) : <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Chưa có lịch đăng ký nào.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* MODAL SỬA LỊCH KHÁM */}
            {showEditModal && editingAppt && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '600px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>CẬP NHẬT LỊCH ĐĂNG KÝ</h3>
                        <form onSubmit={submitEditAppt} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Họ Tên Bệnh Nhân:</label>
                                <input name="PatientFullName" value={editingAppt.PatientFullName} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Ngày sinh:</label>
                                <input type="date" name="DOB" value={editingAppt.DOB ? editingAppt.DOB.split('T')[0] : ''} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Điện thoại:</label>
                                <input name="ContactPhone" value={editingAppt.ContactPhone} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Địa chỉ:</label>
                                <input name="Address" value={editingAppt.Address} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Người giám hộ (nếu có):</label>
                                <input name="Guardian" value={editingAppt.Guardian || ''} onChange={handleEditChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Khoa Khám Bệnh:</label>
                                <input name="Department" value={editingAppt.Department} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Thời gian hẹn:</label>
                                <input type="datetime-local" name="appointmentDate" value={editingAppt.appointmentDate} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>Lý do (Triệu chứng):</label>
                                <textarea name="Reason" value={editingAppt.Reason} onChange={handleEditChange} rows="3" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '5px' }}></textarea>
                            </div>
                            
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy Bỏ</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#f1c40f', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Lưu Thay Đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientAppointments;