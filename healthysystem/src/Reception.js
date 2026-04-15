import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const Reception = () => {
    const [formData, setFormData] = useState({
        patientName: '', dob: '', phone: '', healthInsuranceID: '',
        insuranceType: 'None', department: 'Khoa Châm cứu - Dưỡng sinh',
        reason: '', isTransfer: false
    });
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);

    const departments = [
        'Khoa Châm cứu - Dưỡng sinh',
        'Khoa Phục hồi chức năng (PHCN)',
        'Khoa Nội Tổng hợp YHCT',
        'Khoa Cơ xương khớp',
    ];

    const insuranceTypes = [
        { value: 'None', label: 'Không có BHYT' },
        { value: 'K3', label: 'BHYT K3 (Hộ nghèo - miễn phí)' },
        { value: 'K2', label: 'BHYT K2 (Được hưởng 80%)' },
        { value: 'K1', label: 'BHYT K1 (Được hưởng 70%)' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(`${API}/api/reception/walk-in`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTicket(res.data.ticket);
            setFormData({
                patientName: '', dob: '', phone: '', healthInsuranceID: '',
                insuranceType: 'None', department: 'Khoa Châm cứu - Dưỡng sinh',
                reason: '', isTransfer: false
            });
        } catch (err) {
            alert("Lỗi cấp số: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '30px', fontFamily: 'Arial, sans-serif' },
        panel: { flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
        h2: { borderBottom: '2px solid #2980b9', paddingBottom: '10px', color: '#2c3e50', marginTop: 0 },
        label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' },
        input: { width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '3px', boxSizing: 'border-box', fontSize: '14px' },
    };

    return (
        <div style={styles.container}>
            <div style={styles.panel}>
                <h2 style={styles.h2}>ĐĂNG KÝ KHÁM VÃNG LAI</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '15px' }}>
                    <div>
                        <label style={styles.label}>Họ và tên Bệnh nhân <span style={{ color: '#c0392b' }}>*</span></label>
                        <input style={styles.input} type="text" required
                            value={formData.patientName}
                            onChange={e => setFormData({ ...formData, patientName: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={styles.label}>Ngày sinh <span style={{ color: '#c0392b' }}>*</span></label>
                            <input style={styles.input} type="date" required
                                value={formData.dob}
                                onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={styles.label}>Số điện thoại <span style={{ color: '#c0392b' }}>*</span></label>
                            <input style={styles.input} type="text" required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label style={styles.label}>Loại thẻ BHYT</label>
                        <select style={styles.input} value={formData.insuranceType}
                            onChange={e => {
                                const val = e.target.value;
                                setFormData({ ...formData, insuranceType: val, isTransfer: val === 'None' ? false : formData.isTransfer });
                            }}>
                            {insuranceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    {formData.insuranceType !== 'None' && (
                        <>
                            <div>
                                <label style={styles.label}>Mã thẻ BHYT</label>
                                <input style={styles.input} type="text" placeholder="VD: GD4123456789"
                                    value={formData.healthInsuranceID}
                                    onChange={e => setFormData({ ...formData, healthInsuranceID: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#c0392b', fontSize: '14px' }}>
                                    <input type="checkbox" checked={formData.isTransfer}
                                        onChange={e => setFormData({ ...formData, isTransfer: e.target.checked })} />
                                    Bệnh nhân có Giấy chuyển tuyến hợp lệ
                                    {formData.insuranceType === 'K3' && formData.isTransfer && (
                                        <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '13px' }}>→ Được hưởng BHYT 100%</span>
                                    )}
                                </label>
                            </div>
                        </>
                    )}

                    <div>
                        <label style={styles.label}>Khoa khám</label>
                        <select style={styles.input} value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>Lý do khám <span style={{ color: '#c0392b' }}>*</span></label>
                        <textarea required style={{ ...styles.input, height: '70px', resize: 'vertical' }}
                            placeholder="Triệu chứng, lý do đến khám..."
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                    </div>
                    <button type="submit" disabled={loading}
                        style={{ backgroundColor: loading ? '#95a5a6' : '#27ae60', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                        {loading ? 'Đang xử lý...' : 'LƯU & CẤP SỐ KHÁM'}
                    </button>
                </form>
            </div>

            {/* PHIẾU SỐ THỨ TỰ */}
            <div style={{ flex: '0 0 320px' }}>
                {ticket ? (
                    <div style={{ border: '2px dashed #27ae60', padding: '25px', backgroundColor: '#f0fff4', textAlign: 'center', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>BV YDCT KIÊN GIANG</div>
                        <div style={{ fontSize: '13px', color: '#7f8c8d', margin: '4px 0 12px' }}>PHIẾU CẤP SỐ THỨ TỰ</div>
                        <hr style={{ borderTop: '1px solid #c3e6cb' }} />
                        <div style={{ fontSize: '60px', fontWeight: 'bold', color: '#e74c3c', margin: '15px 0', lineHeight: 1 }}>
                            {String(ticket.QueueNumber).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>{ticket.PatientName}</div>
                        <div style={{ fontSize: '15px', color: '#2980b9', fontWeight: 'bold', marginBottom: '8px' }}>{ticket.Department}</div>
                        {ticket.InsuranceType !== 'None' && (
                            <div style={{ display: 'inline-block', padding: '3px 10px', backgroundColor: ticket.HasTransfer && ticket.InsuranceType === 'K3' ? '#27ae60' : '#2980b9', color: '#fff', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                                BHYT {ticket.InsuranceType}{ticket.HasTransfer ? ' + Chuyển tuyến' : ''}
                            </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>Giờ in: {ticket.Time}</div>
                        <button onClick={() => window.print()}
                            style={{ marginTop: '15px', padding: '9px 25px', border: '1px solid #27ae60', cursor: 'pointer', backgroundColor: 'white', borderRadius: '4px', fontWeight: 'bold', color: '#27ae60' }}>
                            In phiếu
                        </button>
                        <button onClick={() => setTicket(null)}
                            style={{ marginTop: '8px', marginLeft: '10px', padding: '9px 25px', border: 'none', cursor: 'pointer', backgroundColor: '#ecf0f1', borderRadius: '4px' }}>
                            Tiếp theo
                        </button>
                    </div>
                ) : (
                    <div style={{ border: '2px dashed #bdc3c7', padding: '25px', textAlign: 'center', borderRadius: '8px', color: '#95a5a6' }}>
                        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🎫</div>
                        <div>Phiếu số thứ tự sẽ hiển thị ở đây sau khi đăng ký</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reception;