import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

// Phân luồng tự động theo triệu chứng
const autoDetectDepartment = (reason) => {
    const r = reason.toLowerCase();
    if (r.includes('co') || r.includes('vai') || r.includes('gay') || r.includes('lung') || r.includes('cot song')) return 'Khoa Co Xuong Khop';
    if (r.includes('liet') || r.includes('than kinh') || r.includes('dau dau') || r.includes('chong mat')) return 'Khoa Than Kinh';
    if (r.includes('phuc hoi') || r.includes('keo') || r.includes('vat ly')) return 'Khoa Phuc Hoi Chuc Nang';
    if (r.includes('chau cuu') || r.includes('xoa bop') || r.includes('bam huyet')) return 'Khoa Chau Cuu - Duong Sinh';
    return 'Khoa Noi YHCT';
};

const insuranceTypes = [
    { value: 'None', label: 'Khong co BHYT' },
    { value: 'K3', label: 'K3 - He Ngheo / Chinh Sach' },
    { value: 'K2', label: 'K2 - Can Ngheo (80%)' },
    { value: 'K1', label: 'K1 - Binh Thuong (70%)' },
];

const Reception = () => {
    const [formData, setFormData] = useState({
        patientName: '', dob: '', phone: '', healthInsuranceID: '',
        department: 'Khoa Co Xuong Khop', reason: '', isTransfer: false, insuranceType: 'None'
    });
    const [ticket, setTicket] = useState(null);
    const [todayQueue, setTodayQueue] = useState([]);
    const [bhytStatus, setBhytStatus] = useState(null); // null | 'valid' | 'invalid'
    const [activeTab, setActiveTab] = useState('register'); // 'register' | 'queue'

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchTodayQueue(); }, []);

    const fetchTodayQueue = async () => {
        try {
            const res = await axios.get(`${API}/api/appointments/pending`, getAuthHeader());
            setTodayQueue(res.data);
        } catch {}
    };

    // Giả lập xác minh BHYT (thực tế gọi cổng BHXH)
    const handleVerifyBHYT = () => {
        if (!formData.healthInsuranceID || formData.healthInsuranceID.length < 10) {
            setBhytStatus('invalid');
            return alert("Ma the BHYT khong hop le! Phai tu 10 ky tu.");
        }
        // Giả lập: mã bắt đầu bằng DN, HN, AG... là hợp lệ
        const validPrefixes = ['DN', 'HN', 'AG', 'KG', 'CT', 'VT', 'BT'];
        const isValid = validPrefixes.some(p => formData.healthInsuranceID.toUpperCase().startsWith(p));
        setBhytStatus(isValid ? 'valid' : 'invalid');
        if (!isValid) alert("The BHYT khong xac thuc duoc. Kiem tra lai ma the.");
    };

    // Tự động phân luồng khi nhập lý do
    const handleReasonChange = (value) => {
        const dept = autoDetectDepartment(value);
        setFormData({ ...formData, reason: value, department: dept });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.insuranceType !== 'None' && !formData.healthInsuranceID) {
            return alert("Vui long nhap ma the BHYT!");
        }
        if (formData.insuranceType === 'K3' && !formData.isTransfer) {
            const ok = window.confirm("Benh nhan BHYT K3 nhung khong co giay chuyen tuyen.\nSe KHONG duoc mien phi 100%. Tiep tuc?");
            if (!ok) return;
        }
        try {
            const res = await axios.post(`${API}/api/reception/walk-in`, formData, getAuthHeader());
            setTicket(res.data.ticket);
            setFormData({ patientName: '', dob: '', phone: '', healthInsuranceID: '', department: 'Khoa Co Xuong Khop', reason: '', isTransfer: false, insuranceType: 'None' });
            setBhytStatus(null);
            fetchTodayQueue();
        } catch (err) {
            alert("Loi cap so: " + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await axios.put(`${API}/api/appointments/${id}/status`, { status }, getAuthHeader());
            fetchTodayQueue();
        } catch {}
    };

    const inputStyle = { width: '100%', padding: '9px', border: '1px solid #bdc3c7', boxSizing: 'border-box', borderRadius: '4px' };
    const labelStyle = { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '14px', color: '#2c3e50' };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#2980b9', borderBottom: '3px solid #2980b9', paddingBottom: '10px', marginBottom: '20px', fontWeight: '800' }}>
                TIEP NHAN & KIEM SOAT LUONG BHYT
            </h2>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('register')}
                    style={{ padding: '10px 24px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'register' ? '#2980b9' : 'transparent', color: activeTab === 'register' ? '#fff' : '#64748b' }}>
                    DANG KY VANG LAI
                </button>
                <button onClick={() => { setActiveTab('queue'); fetchTodayQueue(); }}
                    style={{ padding: '10px 24px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'queue' ? '#27ae60' : 'transparent', color: activeTab === 'queue' ? '#fff' : '#64748b' }}>
                    HANG DOI HOM NAY ({todayQueue.length})
                </button>
            </div>

            {activeTab === 'register' && (
                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                    {/* Form đăng ký */}
                    <div style={{ flex: 1, background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ margin: '0 0 20px', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            THONG TIN BENH NHAN
                        </h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={labelStyle}>Ho va ten Benh nhan: <span style={{ color: '#e74c3c' }}>*</span></label>
                                <input type="text" value={formData.patientName}
                                    onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                                    required placeholder="Nhap ho va ten day du..."
                                    style={inputStyle} />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Ngay sinh: <span style={{ color: '#e74c3c' }}>*</span></label>
                                    <input type="date" value={formData.dob}
                                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                        required style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>So dien thoai: <span style={{ color: '#e74c3c' }}>*</span></label>
                                    <input type="text" value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        required placeholder="0xxx..." style={inputStyle} />
                                </div>
                            </div>

                            {/* BHYT Section */}
                            <div style={{ background: '#f8fafc', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                <label style={{ ...labelStyle, color: '#1e40af' }}>KIEM SOAT LUONG BHYT</label>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>Loai BHYT:</label>
                                    <select value={formData.insuranceType}
                                        onChange={e => { setFormData({ ...formData, insuranceType: e.target.value, isTransfer: false, healthInsuranceID: '' }); setBhytStatus(null); }}
                                        style={inputStyle}>
                                        {insuranceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>

                                {formData.insuranceType !== 'None' && (
                                    <>
                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={labelStyle}>Ma the BHYT:</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input type="text" value={formData.healthInsuranceID}
                                                    onChange={e => { setFormData({ ...formData, healthInsuranceID: e.target.value }); setBhytStatus(null); }}
                                                    placeholder="VD: AG4012345678..."
                                                    style={{ ...inputStyle, borderColor: bhytStatus === 'valid' ? '#27ae60' : bhytStatus === 'invalid' ? '#e74c3c' : '#bdc3c7' }} />
                                                <button type="button" onClick={handleVerifyBHYT}
                                                    style={{ padding: '9px 15px', background: '#1e40af', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                                    Xac Minh
                                                </button>
                                            </div>
                                            {bhytStatus === 'valid' && <div style={{ color: '#27ae60', fontSize: '13px', marginTop: '4px', fontWeight: 'bold' }}>The BHYT hop le</div>}
                                            {bhytStatus === 'invalid' && <div style={{ color: '#e74c3c', fontSize: '13px', marginTop: '4px', fontWeight: 'bold' }}>Khong xac thuc duoc - Kiem tra lai</div>}
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: formData.isTransfer ? '#dcfce7' : '#fff', border: `2px solid ${formData.isTransfer ? '#16a34a' : '#e2e8f0'}`, borderRadius: '6px' }}>
                                            <input type="checkbox" checked={formData.isTransfer}
                                                onChange={e => setFormData({ ...formData, isTransfer: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }} />
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Co Giay Chuyen Tuyen hop le</div>
                                                {formData.insuranceType === 'K3' && formData.isTransfer && (
                                                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>BHYT se chi tra 100% - Benh nhan khong mat phi</div>
                                                )}
                                            </div>
                                        </label>
                                    </>
                                )}
                            </div>

                            {/* Lý do - tự động phân luồng */}
                            <div>
                                <label style={labelStyle}>Ly do kham (Trieu chung): <span style={{ color: '#e74c3c' }}>*</span></label>
                                <textarea value={formData.reason} onChange={e => handleReasonChange(e.target.value)}
                                    required placeholder="Nhap trieu chung de he thong tu dong phan luong khoa... (vd: Dau co vai gay, Phuc hoi chuc nang...)"
                                    style={{ ...inputStyle, height: '70px', resize: 'vertical' }} />
                            </div>

                            {/* Khoa - tự động điền */}
                            <div>
                                <label style={labelStyle}>Khoa kham (Tu dong phan luong):</label>
                                <select value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    style={{ ...inputStyle, background: '#e8f4f8', fontWeight: 'bold' }}>
                                    <option value="Khoa Co Xuong Khop">Khoa Co Xuong Khop</option>
                                    <option value="Khoa Than Kinh">Khoa Than Kinh</option>
                                    <option value="Khoa Phuc Hoi Chuc Nang">Khoa Phuc Hoi Chuc Nang</option>
                                    <option value="Khoa Chau Cuu - Duong Sinh">Khoa Chau Cuu - Duong Sinh</option>
                                    <option value="Khoa Noi YHCT">Khoa Noi YHCT</option>
                                </select>
                                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>He thong tu dong goi y khoa phu hop theo trieu chung.</div>
                            </div>

                            <button type="submit"
                                style={{ background: '#27ae60', color: '#fff', padding: '14px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '5px' }}>
                                LUU & CAP SO KHAM
                            </button>
                        </form>
                    </div>

                    {/* Phiếu số */}
                    {ticket && (
                        <div style={{ width: '320px', flexShrink: 0 }}>
                            <div style={{ border: '2px dashed #34495e', padding: '25px', background: '#fdfbfb', textAlign: 'center', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>BENH VIEN YDCT KIEN GIANG</div>
                                <div style={{ fontSize: '13px', color: '#7f8c8d', margin: '4px 0 15px' }}>Phieu Cap So Thu Tu</div>
                                <hr style={{ borderTop: '1px solid #ccc' }} />
                                <div style={{ fontSize: '60px', fontWeight: 'bold', color: '#e74c3c', margin: '15px 0', lineHeight: 1 }}>
                                    {String(ticket.QueueNumber).padStart(2, '0')}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{ticket.PatientName}</div>
                                <div style={{ fontSize: '15px', margin: '8px 0', color: '#2980b9', fontWeight: 'bold' }}>{ticket.Department}</div>
                                {ticket.InsuranceType !== 'None' && (
                                    <div style={{ fontSize: '13px', margin: '5px 0', background: ticket.TransferTicket && ticket.InsuranceType === 'K3' ? '#dcfce7' : '#fef3c7', padding: '4px', borderRadius: '4px', color: ticket.TransferTicket && ticket.InsuranceType === 'K3' ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>
                                        BHYT {ticket.InsuranceType} {ticket.TransferTicket ? '- Dung Tuyen' : '- Trai Tuyen'}
                                    </div>
                                )}
                                <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '10px' }}>Gio in: {ticket.Time}</div>
                                <button onClick={() => window.print()}
                                    style={{ marginTop: '15px', padding: '8px 24px', border: '1px solid #34495e', cursor: 'pointer', background: '#fff', borderRadius: '4px', fontWeight: 'bold' }}>
                                    In Phieu
                                </button>
                                <button onClick={() => setTicket(null)}
                                    style={{ marginTop: '8px', padding: '6px 20px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#7f8c8d', display: 'block', width: '100%' }}>
                                    Dong
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'queue' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 15px', color: '#27ae60' }}>DANH SACH CHO KHAM HOM NAY</h3>
                    {todayQueue.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Khong co benh nhan nao trong hang doi.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f1f5f9' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>STT</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Benh nhan</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Khoa</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>BHYT</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Ly do</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Trang thai</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Thao tac</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayQueue.map(p => (
                                    <tr key={p.AppointmentID} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ background: '#e74c3c', color: '#fff', padding: '3px 10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                                                #{p.QueueNumber || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.PatientName}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#2980b9' }}>{p.Department}</td>
                                        <td style={{ padding: '12px' }}>
                                            {p.InsuranceType && p.InsuranceType !== 'None' ? (
                                                <span style={{ background: p.InsuranceType === 'K3' && p.TransferTicket ? '#dcfce7' : '#fef3c7', color: p.InsuranceType === 'K3' && p.TransferTicket ? '#16a34a' : '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    {p.InsuranceType} {p.TransferTicket ? '' : '(Trai tuyen)'}
                                                </span>
                                            ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>Khong</span>}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', maxWidth: '200px' }}>{p.Reason}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                                Cho kham
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button onClick={() => handleUpdateStatus(p.AppointmentID, 'Confirmed')}
                                                style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginRight: '5px' }}>
                                                Xac nhan
                                            </button>
                                            <button onClick={() => handleUpdateStatus(p.AppointmentID, 'Cancelled')}
                                                style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                                Huy
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reception;