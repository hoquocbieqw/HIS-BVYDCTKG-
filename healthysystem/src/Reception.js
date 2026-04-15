import React, { useState } from 'react';
import axios from 'axios';

const Reception = () => {
    const [formData, setFormData] = useState({
        patientName: '', dob: '', phone: '', healthInsuranceID: '', department: 'Khoa Cơ xương khớp', reason: '', isTransfer: false
    });
    const [ticket, setTicket] = useState(null);

    const departments = [
        "Khoa Cơ xương khớp", "Khoa Thần kinh", "Khoa Phục hồi chức năng", "Khoa Nội YHCT"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('http://localhost:3001/api/reception/walk-in', formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTicket(res.data.ticket);
            setFormData({ patientName: '', dob: '', phone: '', healthInsuranceID: '', department: 'Khoa Cơ xương khớp', reason: '', isTransfer: false });
        } catch (err) {
            alert("Lỗi cấp số: " + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '30px' }}>
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ borderBottom: '2px solid #2980b9', paddingBottom: '10px', color: '#2c3e50' }}>ĐĂNG KÝ KHÁCH VÃNG LAI</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    <div>
                        <label>Họ và tên Bệnh nhân:</label>
                        <input type="text" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }}/>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label>Ngày sinh:</label>
                            <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }}/>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Số điện thoại:</label>
                            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }}/>
                        </div>
                    </div>
                    <div>
                        <label>Mã BHYT (Nếu có):</label>
                        <input type="text" value={formData.healthInsuranceID} onChange={e => setFormData({...formData, healthInsuranceID: e.target.value})} placeholder="Nhập mã thẻ BHYT..." style={{ width: '100%', padding: '8px', marginTop: '5px' }}/>
                    </div>
                    {formData.healthInsuranceID && (
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#c0392b' }}>
                                <input type="checkbox" checked={formData.isTransfer} onChange={e => setFormData({...formData, isTransfer: e.target.checked})} />
                                Bệnh nhân có Giấy chuyển tuyến
                            </label>
                        </div>
                    )}
                    <div>
                        <label>Khoa khám:</label>
                        <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Lý do khám:</label>
                        <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px', height: '60px' }}></textarea>
                    </div>
                    <button type="submit" style={{ backgroundColor: '#27ae60', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>LƯU & CẤP SỐ KHÁM</button>
                </form>
            </div>

            {/* PHIẾU IN CẤP SỐ */}
            {ticket && (
                <div style={{ flex: '0 0 350px' }}>
                    <div style={{ border: '2px dashed #34495e', padding: '20px', backgroundColor: '#fdfbfb', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: '#2c3e50' }}>BV YDCT KIÊN GIANG</h3>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#7f8c8d' }}>Phiếu Cấp Số Thứ Tự</p>
                        <hr style={{ borderTop: '1px solid #ccc' }} />
                        <div style={{ fontSize: '50px', fontWeight: 'bold', color: '#e74c3c', margin: '15px 0' }}>
                            {ticket.QueueNumber < 10 ? `0${ticket.QueueNumber}` : ticket.QueueNumber}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{ticket.PatientName}</div>
                        <div style={{ fontSize: '16px', margin: '10px 0', color: '#2980b9' }}>Phòng: {ticket.Department}</div>
                        <p style={{ fontSize: '12px', color: '#95a5a6' }}>Giờ in: {ticket.Time}</p>
                        <button style={{ marginTop: '15px', padding: '8px 20px', border: '1px solid #34495e', cursor: 'pointer', backgroundColor: 'white' }} onClick={() => window.print()}>In phiếu này</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reception;