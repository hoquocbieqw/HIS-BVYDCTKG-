import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const Reception = () => {
    const [activeTab, setActiveTab] = useState('register');
    const [formData, setFormData] = useState({
        patientName: '', dob: '', phone: '', healthInsuranceID: '',
        department: 'Khoa Cơ xương khớp', reason: '', isTransfer: false
    });
    const [ticket, setTicket] = useState(null);
    const [queue, setQueue] = useState([]);
    const [calledNumber, setCalledNumber] = useState(null);

    const departments = [
        "Khoa Cơ xương khớp", "Khoa Thần kinh", "Khoa Phục hồi chức năng",
        "Khoa Nội YHCT", "Khoa Khám bệnh", "Khoa Cấp cứu"
    ];

    const fetchQueue = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/queue/today`, auth());
            setQueue(res.data || []);
        } catch (err) {
            console.error("Lỗi tải hàng đợi:", err);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000); // refresh mỗi 10s
        return () => clearInterval(interval);
    }, [fetchQueue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API}/api/reception/walk-in`, formData, auth());
            setTicket(res.data.ticket);
            setFormData({ patientName: '', dob: '', phone: '', healthInsuranceID: '', department: 'Khoa Cơ xương khớp', reason: '', isTransfer: false });
            fetchQueue();
        } catch (err) {
            alert("Lỗi cấp số: " + (err.response?.data?.message || err.message));
        }
    };

    const handleApprove = async (appointmentId) => {
        try {
            await axios.put(`${API}/api/queue/${appointmentId}/approve`, {}, auth());
            fetchQueue();
        } catch (err) {
            alert("Lỗi duyệt: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCall = async (appointmentId, queueNumber) => {
        try {
            await axios.put(`${API}/api/queue/${appointmentId}/call`, {}, auth());
            setCalledNumber(queueNumber);
            fetchQueue();
            // Thông báo gọi số
            if (window.speechSynthesis) {
                const msg = new SpeechSynthesisUtterance(`Mời bệnh nhân số ${queueNumber} vào phòng khám`);
                msg.lang = 'vi-VN';
                window.speechSynthesis.speak(msg);
            }
        } catch (err) {
            alert("Lỗi gọi số: " + (err.response?.data?.message || err.message));
        }
    };

    const getStatusLabel = (status) => {
        const map = {
            'Pending': { label: 'Chờ duyệt', color: '#f39c12' },
            'WalkIn': { label: 'Vãng lai - Chờ duyệt', color: '#e67e22' },
            'Approved': { label: 'Đã duyệt', color: '#27ae60' },
            'Called': { label: 'Đã gọi vào', color: '#2980b9' },
            'Examined': { label: 'Đã khám', color: '#8e44ad' },
            'Confirmed': { label: 'Xác nhận', color: '#16a085' },
        };
        return map[status] || { label: status, color: '#95a5a6' };
    };

    const printTicket = () => {
        const printContents = document.getElementById('print-ticket').innerHTML;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Phiếu số</title>
        <style>body{font-family:Arial;text-align:center;margin:20px;}h1{font-size:40px;color:#e74c3c;margin:15px 0;}
        .info{font-size:16px;margin:8px 0;}</style></head>
        <body>${printContents}</body></html>`);
        w.document.close();
        w.print();
    };

    return (
        <div style={{ padding: '15px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '20px', fontWeight: '800' }}>
                Tiếp nhận bệnh nhân - Lễ tân
            </h2>

            {/* TAB */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #dfe6e9' }}>
                {[
                    { key: 'register', label: 'Đăng ký vãng lai' },
                    { key: 'queue', label: `Danh sách hàng đợi (${queue.length})` }
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        padding: '12px 25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                        backgroundColor: activeTab === tab.key ? '#0984e3' : '#f1f2f6',
                        color: activeTab === tab.key ? 'white' : '#636e72',
                        borderBottom: activeTab === tab.key ? '2px solid #0984e3' : 'none'
                    }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: FORM ĐĂNG KÝ */}
            {activeTab === 'register' && (
                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid #dfe6e9' }}>
                        <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #0984e3', paddingBottom: '10px' }}>
                            ĐĂNG KÝ KHÁCH VÃNG LAI (OFFLINE)
                        </h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Họ và tên Bệnh nhân <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" value={formData.patientName} onChange={e => setFormData({ ...formData, patientName: e.target.value })} required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Ngày sinh</label>
                                    <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                        style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required
                                        style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Mã thẻ BHYT (nếu có)</label>
                                <input type="text" value={formData.healthInsuranceID} onChange={e => setFormData({ ...formData, healthInsuranceID: e.target.value })}
                                    placeholder="Nhập mã thẻ BHYT..."
                                    style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>
                            {formData.healthInsuranceID && (
                                <div style={{ backgroundColor: '#fff3cd', padding: '12px', borderRadius: '6px', border: '1px solid #ffc107' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#856404', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={formData.isTransfer} onChange={e => setFormData({ ...formData, isTransfer: e.target.checked })} />
                                        Bệnh nhân có Giấy chuyển tuyến (BHYT K3 - Miễn phí 100%)
                                    </label>
                                </div>
                            )}
                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Khoa khám</label>
                                <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Lý do khám <span style={{ color: 'red' }}>*</span></label>
                                <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', height: '70px', resize: 'vertical', boxSizing: 'border-box' }}></textarea>
                            </div>
                            <button type="submit" style={{ backgroundColor: '#27ae60', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                                LƯU & CẤP SỐ KHÁM
                            </button>
                        </form>
                    </div>

                    {/* PHIẾU IN */}
                    {ticket && (
                        <div style={{ flex: '0 0 340px' }}>
                            <div id="print-ticket" style={{ border: '2px dashed #2c3e50', padding: '25px', backgroundColor: '#fdfbfb', textAlign: 'center', borderRadius: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50', textTransform: 'uppercase' }}>
                                    Bệnh viện Y Dược Cổ Truyền Kiên Giang
                                </div>
                                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>PHIẾU CẤP SỐ THỨ TỰ</div>
                                <hr style={{ borderTop: '1px solid #ccc', margin: '12px 0' }} />
                                <div style={{ fontSize: '60px', fontWeight: 'bold', color: '#e74c3c', margin: '10px 0', lineHeight: 1 }}>
                                    {ticket.QueueNumber < 10 ? `0${ticket.QueueNumber}` : ticket.QueueNumber}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{ticket.PatientName}</div>
                                <div style={{ fontSize: '14px', color: '#2980b9', marginBottom: '5px' }}>Khoa: {ticket.Department}</div>
                                {ticket.HealthInsuranceID && (
                                    <div style={{ fontSize: '13px', color: '#27ae60', fontWeight: 'bold' }}>
                                        BHYT: {ticket.HealthInsuranceID}
                                        {ticket.InsuranceType === 'BHYT_K3' && <span style={{ color: '#c0392b' }}> (K3 - Chuyển tuyến)</span>}
                                    </div>
                                )}
                                <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '8px' }}>Giờ cấp: {ticket.Time}</div>
                                <hr style={{ borderTop: '1px dashed #ccc', margin: '12px 0' }} />
                                <div style={{ fontSize: '11px', color: '#7f8c8d', fontStyle: 'italic' }}>Vui lòng giữ phiếu và chờ gọi số</div>
                            </div>
                            <button onClick={printTicket} style={{ width: '100%', marginTop: '12px', padding: '10px', border: '2px solid #2c3e50', cursor: 'pointer', backgroundColor: 'white', fontWeight: 'bold', borderRadius: '6px', fontSize: '14px' }}>
                                In phiếu số
                            </button>
                            <button onClick={() => setTicket(null)} style={{ width: '100%', marginTop: '8px', padding: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                                Đóng
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: DANH SÁCH HÀNG ĐỢI */}
            {activeTab === 'queue' && (
                <div>
                    {calledNumber && (
                        <div style={{ backgroundColor: '#2980b9', color: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
                            ĐANG GỌI SỐ: {calledNumber < 10 ? `0${calledNumber}` : calledNumber} - Mời bệnh nhân vào phòng khám!
                        </div>
                    )}
                    <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #dfe6e9' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#0984e3', color: 'white' }}>
                                <tr>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Số TT</th>
                                    <th style={{ padding: '14px', textAlign: 'left' }}>Họ tên</th>
                                    <th style={{ padding: '14px', textAlign: 'left' }}>Khoa khám</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Nguồn</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>BHYT</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Trạng thái</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.length === 0 ? (
                                    <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>Chưa có bệnh nhân nào hôm nay.</td></tr>
                                ) : queue.map((item, idx) => {
                                    const statusInfo = getStatusLabel(item.Status);
                                    const canApprove = ['Pending', 'WalkIn'].includes(item.Status);
                                    const canCall = item.Status === 'Approved';
                                    return (
                                        <tr key={item.AppointmentID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#e74c3c' }}>
                                                    {item.QueueNumber < 10 ? `0${item.QueueNumber}` : item.QueueNumber}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', fontWeight: 'bold', color: '#1e293b' }}>{item.PatientFullName}</td>
                                            <td style={{ padding: '14px', color: '#475569' }}>{item.Department}</td>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', backgroundColor: item.AppointmentSource === 'Online' ? '#e8f4fd' : '#fff3cd', color: item.AppointmentSource === 'Online' ? '#0984e3' : '#856404', fontWeight: 'bold' }}>
                                                    {item.AppointmentSource === 'Online' ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: item.InsuranceType !== 'None' ? '#27ae60' : '#95a5a6' }}>
                                                {item.InsuranceType === 'BHYT_K3' ? 'BHYT K3' : item.InsuranceType === 'BHYT' ? 'BHYT' : 'Tự túc'}
                                                {item.TransferTicket ? ' + Chuyển tuyến' : ''}
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <span style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: statusInfo.color + '22', color: statusInfo.color }}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    {canApprove && (
                                                        <button onClick={() => handleApprove(item.AppointmentID)} style={{ padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                                                            Duyệt
                                                        </button>
                                                    )}
                                                    {canCall && (
                                                        <button onClick={() => handleCall(item.AppointmentID, item.QueueNumber)} style={{ padding: '6px 12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                                                            Gọi số
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reception;