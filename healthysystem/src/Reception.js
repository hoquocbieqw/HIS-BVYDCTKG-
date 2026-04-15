import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Reception = () => {
    const [appointments, setAppointments] = useState([]);

    const fetchAppointments = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/api/records', { headers: { Authorization: `Bearer ${token}` } });
            // Lọc ra những lịch hẹn đang chờ tiếp nhận
            setAppointments(res.data.filter(a => a.Status === 'Pending'));
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    const handleConfirm = async (id, name) => {
        const room = Math.floor(Math.random() * 5) + 1; // Random phòng từ 1-5
        const stt = Math.floor(Math.random() * 100) + 1; // Random Số thứ tự
        if (window.confirm(`Xác nhận tiếp nhận bệnh nhân ${name}?\n- Cấp Số thứ tự: ${stt}\n- Phân vào Phòng khám: 0${room}`)) {
            try {
                const token = localStorage.getItem('token');
                // Gọi API chuyển trạng thái sang Confirmed
                await axios.put(`http://localhost:3001/api/appointments/${id}/status`, { status: 'Confirmed' }, { headers: { Authorization: `Bearer ${token}` } });
                alert(`Đã cấp số ${stt} thành công. Vui lòng hướng dẫn bệnh nhân đến Phòng 0${room}.`);
                fetchAppointments();
            } catch (err) { alert("Lỗi tiếp nhận!"); }
        }
    };

    return (
        <div style={{ padding: '20px', background: '#f8fafc', minHeight: '80vh' }}>
            <h2 style={{ color: '#7e22ce', borderBottom: '3px solid #7e22ce', paddingBottom: '10px' }}>📋 QUẦY LỄ TÂN - TIẾP NHẬN & CẤP SỐ</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f3e8ff', color: '#6b21a8', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Mã LH</th>
                            <th style={{ padding: '12px' }}>Tên Bệnh Nhân</th>
                            <th style={{ padding: '12px' }}>SĐT</th>
                            <th style={{ padding: '12px' }}>Ngày hẹn</th>
                            <th style={{ padding: '12px' }}>BHYT</th>
                            <th style={{ padding: '12px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.length > 0 ? appointments.map(app => (
                            <tr key={app.AppointmentID} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>#{app.AppointmentID}</td>
                                <td style={{ padding: '12px' }}>{app.PatientFullName}</td>
                                <td style={{ padding: '12px' }}>{app.ContactPhone}</td>
                                <td style={{ padding: '12px' }}>{new Date(app.AppointmentDate).toLocaleDateString('vi-VN')}</td>
                                <td style={{ padding: '12px' }}>{app.InsuranceType === 'BHYT' ? '✅ Có' : '❌ Không'}</td>
                                <td style={{ padding: '12px' }}>
                                    <button onClick={() => handleConfirm(app.AppointmentID, app.PatientFullName)} style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Cấp Số Khám
                                    </button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Không có bệnh nhân chờ.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default Reception;