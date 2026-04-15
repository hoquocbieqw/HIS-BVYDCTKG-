import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const Treatment = () => {
    const userStr = localStorage.getItem('user');
    const role = userStr ? JSON.parse(userStr).role : localStorage.getItem('role');
    const [activeTab, setActiveTab] = useState('treatment');
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [sessionRunning, setSessionRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

    // Tab xác nhận BHYT (Y tá)
    const [nurseQueue, setNurseQueue] = useState([]);
    const [selectedNurseRecord, setSelectedNurseRecord] = useState(null);

    const [form, setForm] = useState({
        TechniqueType: 'Châm cứu', BloodPressure: '', HeartRate: '', Result: '', Notes: ''
    });

    const techniques = [
        'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống cổ',
        'Kéo giãn cột sống thắt lưng', 'Điện châm', 'Cứu ngải',
        'Chiếu đèn hồng ngoại', 'Cấy chỉ', 'Dưỡng sinh', 'Vật lý trị liệu'
    ];

    useEffect(() => { fetchRecords(); if (role === 'Nurse') fetchNurseQueue(); }, []);
    useEffect(() => { if (selectedRecord) fetchSessions(selectedRecord.RecordID); }, [selectedRecord]);
    useEffect(() => {
        if (sessionRunning) { timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
        else { clearInterval(timerRef.current); }
        return () => clearInterval(timerRef.current);
    }, [sessionRunning]);

    const fetchRecords = async () => {
        try {
            const res = await axios.get(`${API}/api/medical-records`, auth());
            setRecords(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSessions = async (recordId) => {
        try {
            const res = await axios.get(`${API}/api/treatments/${recordId}`, auth());
            setSessions(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchNurseQueue = async () => {
        try {
            const res = await axios.get(`${API}/api/nurse/pending-confirm`, auth());
            setNurseQueue(res.data);
        } catch (e) { console.error("Lỗi tải nurse queue:", e.message); }
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartSession = () => {
        if (!form.BloodPressure || !form.HeartRate) return alert('Vui lòng ghi nhận sinh hiệu (Huyết áp, Nhịp tim) trước khi bắt đầu!');
        setStartTime(new Date());
        setElapsed(0);
        setSessionRunning(true);
    };

    const handleEndSession = async () => {
        setSessionRunning(false);
        const durationMin = Math.round(elapsed / 60);
        if (!form.Result) return alert('Vui lòng nhập kết quả buổi điều trị!');
        if (!selectedRecord) return alert('Chọn hồ sơ bệnh án trước!');
        try {
            await axios.post(`${API}/api/treatments`, {
                recordId: selectedRecord.RecordID,
                TechniqueType: form.TechniqueType,
                Result: form.Result,
                Notes: `[Sinh hiệu: HA ${form.BloodPressure} mmHg, Nhịp tim ${form.HeartRate} lần/phút] [Thời gian: ${durationMin} phút] ${form.Notes}`
            }, auth());
            alert(`Ghi nhận thành công! Thời gian điều trị: ${durationMin} phút.`);
            setElapsed(0);
            setForm({ TechniqueType: 'Châm cứu', BloodPressure: '', HeartRate: '', Result: '', Notes: '' });
            fetchSessions(selectedRecord.RecordID);
        } catch (err) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
    };

    const handleSaveWithoutTimer = async () => {
        if (!selectedRecord) return alert('Chọn hồ sơ bệnh án!');
        if (!form.Result) return alert('Vui lòng nhập kết quả!');
        try {
            await axios.post(`${API}/api/treatments`, {
                recordId: selectedRecord.RecordID,
                TechniqueType: form.TechniqueType,
                Result: form.Result,
                Notes: `[Sinh hiệu: HA ${form.BloodPressure || 'N/A'}, Nhịp ${form.HeartRate || 'N/A'}] ${form.Notes}`
            }, auth());
            alert('Ghi nhận liệu trình thành công!');
            setForm({ TechniqueType: 'Châm cứu', BloodPressure: '', HeartRate: '', Result: '', Notes: '' });
            fetchSessions(selectedRecord.RecordID);
        } catch (err) { alert('Lỗi: ' + err.message); }
    };

    // Y tá xác nhận BHYT và in phiếu thanh toán
    const handleConfirmInsurance = async (recordId, isInsured) => {
        try {
            await axios.put(`${API}/api/medical-records/${recordId}/confirm-insurance`, { InsuranceConfirmed: isInsured }, auth());
            alert(isInsured ? "Đã xác nhận BHYT! Bệnh nhân ra Thu ngân thanh toán." : "Đã xác nhận tự trả! Bệnh nhân ra Thu ngân thanh toán.");
            fetchNurseQueue();
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.message || err.message));
        }
    };

    // In phiếu thanh toán chuyển cho bệnh nhân đến Thu ngân
    const handlePrintPaymentSlip = (rec) => {
        const isK3Free = rec.InsuranceType === 'K3' && rec.TransferTicket;
        const printContent = `
            <html>
            <head>
                <title>Phiếu Thu Ngân</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 18px; }
                    h2 { margin: 0; font-size: 15px; }
                    h1 { margin: 5px 0; font-size: 18px; color: #e67e22; }
                    .row { display: flex; margin-bottom: 10px; font-size: 14px; }
                    .label { width: 180px; font-weight: bold; color: #555; }
                    .value { flex: 1; }
                    .note { margin-top: 20px; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 13px; text-align: center; }
                    .footer { margin-top: 25px; text-align: center; font-size: 12px; color: #888; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>BV Y DƯỢC CỔ TRUYỀN KIÊN GIANG</h2>
                    <h1>PHIẾU CHUYỂN THU NGÂN</h1>
                </div>
                <div class="row"><span class="label">Bệnh nhân:</span><span class="value"><strong>${rec.PatientName}</strong></span></div>
                <div class="row"><span class="label">Chẩn đoán:</span><span class="value">${rec.Diagnosis}</span></div>
                <div class="row"><span class="label">Mã ICD-10:</span><span class="value">${rec.ICD10 || 'N/A'}</span></div>
                <div class="row"><span class="label">Khoa khám:</span><span class="value">${rec.Department || 'YHCT'}</span></div>
                <div class="row"><span class="label">Loại BH:</span><span class="value"><strong style="color:${isK3Free ? '#16a34a' : '#e67e22'}">${rec.InsuranceType || 'Tự trả'} ${rec.TransferTicket ? '(Đúng tuyến)' : ''}</strong></span></div>
                <div class="row"><span class="label">Mã hồ sơ:</span><span class="value">BA-${rec.RecordID}</span></div>
                <div class="row"><span class="label">Ngày khám:</span><span class="value">${new Date(rec.CreatedAt || rec.AppointmentDate).toLocaleString('vi-VN')}</span></div>

                ${isK3Free ? `<div style="background:#dcfce7;border:2px solid #16a34a;padding:12px;text-align:center;font-weight:bold;color:#15803d;margin-top:15px;border-radius:4px;">
                    BHYT K3 + ĐÚNG TUYẾN: MIỄN PHÍ HOÀN TOÀN (0 VNĐ)
                </div>` : ''}

                <div class="note">
                    Y tá đã xác nhận. Bệnh nhân mang phiếu này đến quầy Thu ngân để thanh toán và nhận thuốc.
                </div>
                <div class="footer">In lúc: ${new Date().toLocaleString('vi-VN')}</div>
            </body>
            </html>
        `;
        const pw = window.open('', '_blank', 'width=700,height=550');
        pw.document.write(printContent);
        pw.document.close();
        pw.focus();
        setTimeout(() => pw.print(), 500);
    };

    // Bác sĩ và Y tá đều thao tác được tab liệu trình
    const canDoTreatment = ['Doctor', 'Nurse', 'Admin'].includes(role);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('treatment')}
                    style={{ padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', background: activeTab === 'treatment' ? '#27ae60' : 'transparent', color: activeTab === 'treatment' ? 'white' : '#64748b' }}>
                    Thực hiện Liệu trình YHCT
                </button>
                {role === 'Nurse' && (
                    <button onClick={() => { setActiveTab('confirm'); fetchNurseQueue(); }}
                        style={{ padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', background: activeTab === 'confirm' ? '#e67e22' : 'transparent', color: activeTab === 'confirm' ? 'white' : '#64748b' }}>
                        Xác nhận BHYT & Xuất phiếu TN ({nurseQueue.length})
                    </button>
                )}
            </div>

            {/* TAB LIỆU TRÌNH - Bác sĩ VÀ Y tá đều dùng được */}
            {activeTab === 'treatment' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    {/* CỘT TRÁI: DANH SÁCH HỒ SƠ */}
                    <div style={{ width: '320px', background: '#fff', border: '1px solid #bdc3c7', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ background: '#27ae60', color: '#fff', padding: '12px 15px', fontWeight: 'bold', fontSize: '14px' }}>
                            HỒ SƠ BỆNH ÁN ({records.length})
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                            {records.map(r => (
                                <li key={r.RecordID}
                                    onClick={() => setSelectedRecord(r)}
                                    style={{
                                        padding: '12px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                                        background: selectedRecord?.RecordID === r.RecordID ? '#e8f8f5' : '#fff',
                                        borderLeft: selectedRecord?.RecordID === r.RecordID ? '4px solid #27ae60' : '4px solid transparent'
                                    }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{r.PatientName}</div>
                                    <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '2px' }}>{r.Diagnosis}</div>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>ICD: {r.ICD10} | {new Date(r.AppointmentDate || r.CreatedAt).toLocaleDateString('vi-VN')}</div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CỘT PHẢI */}
                    <div style={{ flex: 1 }}>
                        {!selectedRecord ? (
                            <div style={{ background: '#fff', padding: '60px', textAlign: 'center', color: '#7f8c8d', border: '1px solid #ddd', borderRadius: '8px' }}>
                                Chọn hồ sơ bệnh án từ danh sách để xem và thực hiện liệu trình.
                            </div>
                        ) : (
                            <>
                                <div style={{ background: '#fff', border: '1px solid #27ae60', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>{selectedRecord.PatientName}</div>
                                            <div style={{ color: '#27ae60', fontSize: '14px', marginTop: '4px' }}>{selectedRecord.Diagnosis}</div>
                                            <div style={{ color: '#7f8c8d', fontSize: '13px', marginTop: '4px' }}>Kế hoạch: {selectedRecord.TreatmentPlan}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>
                                            <div>Mã hồ sơ: <strong>#{selectedRecord.RecordID}</strong></div>
                                            <div>Đã thực hiện: <strong style={{ color: '#27ae60' }}>{sessions.length}</strong> buổi</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {/* FORM THỰC HIỆN (Bác sĩ VÀ Y tá đều làm được) */}
                                    {canDoTreatment && (
                                        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '18px' }}>
                                            <h3 style={{ color: '#27ae60', marginTop: 0, fontSize: '15px' }}>
                                                Thực Hiện Kỹ Thuật YHCT
                                                {role === 'Doctor' && <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px', fontWeight: 'normal' }}>(Bác sĩ thao tác trực tiếp)</span>}
                                            </h3>

                                            {/* SINH HIỆU */}
                                            <div style={{ background: '#f0fff4', border: '1px solid #27ae60', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#27ae60', marginBottom: '8px', fontSize: '13px' }}>Ghi Nhận Sinh Hiệu Trước Điều Trị</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block' }}>Huyết Áp (mmHg)</label>
                                                        <input type="text" placeholder="vd: 120/80" value={form.BloodPressure}
                                                            onChange={e => setForm({ ...form, BloodPressure: e.target.value })}
                                                            style={{ width: '100%', padding: '7px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block' }}>Nhịp Tim (lần/phút)</label>
                                                        <input type="number" placeholder="vd: 72" value={form.HeartRate}
                                                            onChange={e => setForm({ ...form, HeartRate: e.target.value })}
                                                            style={{ width: '100%', padding: '7px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CHỌN KỸ THUẬT */}
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '5px' }}>Kỹ Thuật Thực Hiện</label>
                                                <select value={form.TechniqueType} onChange={e => setForm({ ...form, TechniqueType: e.target.value })}
                                                    style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px' }}>
                                                    {techniques.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>

                                            {/* ĐỒNG HỒ */}
                                            <div style={{ background: sessionRunning ? '#e8f8f5' : '#f8f9fa', border: `2px solid ${sessionRunning ? '#27ae60' : '#ddd'}`, borderRadius: '8px', padding: '14px', textAlign: 'center', marginBottom: '14px' }}>
                                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: sessionRunning ? '#27ae60' : '#2c3e50', fontFamily: 'monospace' }}>
                                                    {formatTime(elapsed)}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                                                    {sessionRunning ? `Bắt đầu lúc: ${startTime?.toLocaleTimeString('vi-VN')}` : 'Chưa bắt đầu'}
                                                </div>
                                                {!sessionRunning ? (
                                                    <button onClick={handleStartSession}
                                                        style={{ padding: '10px 24px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                        BẮT ĐẦU
                                                    </button>
                                                ) : (
                                                    <button onClick={handleEndSession}
                                                        style={{ padding: '10px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                        KẾT THÚC & LƯU
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Kết Quả Buổi Điều Trị <span style={{ color: 'red' }}>*</span></label>
                                                <input type="text" value={form.Result} onChange={e => setForm({ ...form, Result: e.target.value })}
                                                    placeholder="vd: Bệnh nhân đỡ đau, thư giãn tốt"
                                                    style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Ghi Chú</label>
                                                <textarea value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })}
                                                    placeholder="Phản ứng bất thường, lưu ý..." rows={2}
                                                    style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', fontSize: '13px', resize: 'none' }} />
                                            </div>
                                            {!sessionRunning && (
                                                <button onClick={handleSaveWithoutTimer}
                                                    style={{ width: '100%', padding: '11px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    LƯU NHANH (KHÔNG BẤM GIỜ)
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* LỊCH SỬ LIỆU TRÌNH */}
                                    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '18px', gridColumn: canDoTreatment ? 'auto' : '1 / -1' }}>
                                        <h3 style={{ color: '#2c3e50', marginTop: 0, fontSize: '15px' }}>
                                            Lịch Sử Liệu Trình ({sessions.length} buổi)
                                        </h3>
                                        {sessions.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: '#aaa', padding: '30px', fontSize: '14px' }}>Chưa có buổi điều trị nào.</div>
                                        ) : (
                                            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                                                {sessions.map((s, i) => (
                                                    <div key={s.SessionID} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0', display: 'flex', gap: '12px' }}>
                                                        <div style={{ background: '#27ae60', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                                                            {i + 1}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>{s.TechniqueType}</div>
                                                            <div style={{ color: '#27ae60', fontSize: '13px', marginTop: '2px' }}>{s.Result}</div>
                                                            <div style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '2px' }}>{s.Notes}</div>
                                                            <div style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>
                                                                {new Date(s.SessionDate).toLocaleString('vi-VN')} | {s.NurseName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* TAB XÁC NHẬN BHYT (Y tá) - Xuất phiếu thanh toán */}
            {activeTab === 'confirm' && role === 'Nurse' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Danh sách chờ xác nhận */}
                    <div style={{ width: '360px', background: '#fff', border: '1px solid #e67e22', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#e67e22', color: '#fff', padding: '12px 16px', fontWeight: 'bold', fontSize: '14px' }}>
                            CHỜ XÁC NHẬN BHYT ({nurseQueue.length})
                        </div>
                        {nurseQueue.length === 0 ? (
                            <p style={{ padding: '20px', color: '#7f8c8d', textAlign: 'center', fontSize: '13px' }}>Không có bệnh nhân cần xác nhận BHYT.</p>
                        ) : null}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '500px', overflowY: 'auto' }}>
                            {nurseQueue.map(r => (
                                <li key={r.RecordID}
                                    onClick={() => setSelectedNurseRecord(r)}
                                    style={{
                                        padding: '12px 15px', borderBottom: '1px solid #fce8d4', cursor: 'pointer',
                                        backgroundColor: selectedNurseRecord?.RecordID === r.RecordID ? '#fef3ec' : 'transparent',
                                        borderLeft: selectedNurseRecord?.RecordID === r.RecordID ? '4px solid #e67e22' : '4px solid transparent'
                                    }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{r.PatientName}</div>
                                    <div style={{ fontSize: '13px', color: '#555', marginTop: '3px' }}>{r.Diagnosis}</div>
                                    <div style={{ fontSize: '12px', color: '#e67e22', marginTop: '2px' }}>
                                        BHYT: {r.InsuranceType !== 'None' ? r.InsuranceType : 'Tự trả'} {r.TransferTicket ? '(Đúng tuyến)' : ''}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Chi tiết xác nhận */}
                    <div style={{ flex: 1, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
                        {!selectedNurseRecord ? (
                            <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px', fontSize: '14px' }}>
                                Chọn bệnh nhân để xác nhận BHYT và xuất phiếu chuyển Thu ngân.
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ marginTop: 0, color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
                                    XÁC NHẬN BHYT - ĐÓNG MỘC
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '14px' }}>
                                    <div><strong>Bệnh nhân:</strong> {selectedNurseRecord.PatientName}</div>
                                    <div><strong>Mã BA:</strong> #{selectedNurseRecord.RecordID}</div>
                                    <div><strong>Chẩn đoán:</strong> {selectedNurseRecord.Diagnosis}</div>
                                    <div><strong>ICD-10:</strong> {selectedNurseRecord.ICD10 || 'N/A'}</div>
                                    <div><strong>Khoa:</strong> {selectedNurseRecord.Department}</div>
                                    <div><strong>Ngày khám:</strong> {selectedNurseRecord.AppointmentDate ? new Date(selectedNurseRecord.AppointmentDate).toLocaleDateString('vi-VN') : 'Hôm nay'}</div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <strong>Loại BHYT:</strong>{' '}
                                        <span style={{ backgroundColor: selectedNurseRecord.InsuranceType !== 'None' ? '#d1ecf1' : '#f8d7da', color: selectedNurseRecord.InsuranceType !== 'None' ? '#0c5460' : '#721c24', padding: '3px 10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px' }}>
                                            {selectedNurseRecord.InsuranceType !== 'None' ? `${selectedNurseRecord.InsuranceType} ${selectedNurseRecord.TransferTicket ? '(Đúng tuyến - Miễn phí)' : '(Trái tuyến)'}` : 'Tự trả'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    {selectedNurseRecord.InsuranceType !== 'None' && (
                                        <button onClick={() => handleConfirmInsurance(selectedNurseRecord.RecordID, true)}
                                            style={{ padding: '12px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            Xác nhận BHYT (Đóng mộc)
                                        </button>
                                    )}
                                    <button onClick={() => handleConfirmInsurance(selectedNurseRecord.RecordID, false)}
                                        style={{ padding: '12px 20px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        Xác nhận Tự trả
                                    </button>
                                    <button onClick={() => handlePrintPaymentSlip(selectedNurseRecord)}
                                        style={{ padding: '12px 20px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        In Phiếu chuyển Thu ngân
                                    </button>
                                </div>
                                <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '12px', fontSize: '13px', color: '#856404' }}>
                                    Sau khi xác nhận, bệnh nhân mang phiếu đến quầy Thu ngân để thanh toán, rồi mang biên lai đến nhận thuốc tại Dược sĩ.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Treatment;