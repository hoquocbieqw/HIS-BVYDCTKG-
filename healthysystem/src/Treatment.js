import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const Treatment = () => {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const role = userObj?.role;

    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [searchRecord, setSearchRecord] = useState('');
    const [sessionRunning, setSessionRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

    const [form, setForm] = useState({
        TechniqueType: 'Châm cứu', BloodPressure: '', HeartRate: '', Result: '', Notes: ''
    });

    const techniques = [
        'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống cổ',
        'Kéo giãn cột sống thắt lưng', 'Điện châm', 'Cứu ngải',
        'Chiếu đèn hồng ngoại', 'Cấy chỉ', 'Dưỡng sinh', 'Vật lý trị liệu'
    ];

    useEffect(() => { fetchRecords(); }, []);
    useEffect(() => { if (selectedRecord) fetchSessions(selectedRecord.RecordID); }, [selectedRecord]);

    useEffect(() => {
        if (sessionRunning) {
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [sessionRunning]);

    const fetchRecords = async () => {
        try {
            const res = await axios.get(`${API}/api/medical-records`, auth());
            setRecords(res.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchSessions = async (recordId) => {
        try {
            const res = await axios.get(`${API}/api/treatments/${recordId}`, auth());
            setSessions(res.data || []);
        } catch (e) { console.error(e); }
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartSession = () => {
        if (role === 'Nurse' && (!form.BloodPressure || !form.HeartRate)) {
            return alert('Y tá cần ghi nhận sinh hiệu (Huyết áp, Nhịp tim) trước khi bắt đầu!');
        }
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
            const vitalNote = (form.BloodPressure || form.HeartRate)
                ? `[Sinh hiệu: HA ${form.BloodPressure || 'N/A'} mmHg, Nhịp tim ${form.HeartRate || 'N/A'} lần/phút] `
                : '';
            await axios.post(`${API}/api/treatments`, {
                recordId: selectedRecord.RecordID,
                TechniqueType: form.TechniqueType,
                Result: form.Result,
                Notes: `${vitalNote}[Thời gian thực hiện: ${durationMin} phút] ${form.Notes}`
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
            const vitalNote = (form.BloodPressure || form.HeartRate)
                ? `[Sinh hiệu: HA ${form.BloodPressure || 'N/A'}, Nhịp ${form.HeartRate || 'N/A'}] `
                : '';
            await axios.post(`${API}/api/treatments`, {
                recordId: selectedRecord.RecordID,
                TechniqueType: form.TechniqueType,
                Result: form.Result,
                Notes: `${vitalNote}${form.Notes}`
            }, auth());
            alert('Ghi nhận liệu trình thành công!');
            setForm({ TechniqueType: 'Châm cứu', BloodPressure: '', HeartRate: '', Result: '', Notes: '' });
            fetchSessions(selectedRecord.RecordID);
        } catch (err) { alert('Lỗi: ' + err.message); }
    };

    // Bác sĩ VÀ Y tá đều có thể thao tác
    const canOperate = ['Doctor', 'Nurse', 'Admin'].includes(role);

    const filteredRecords = records.filter(r =>
        !searchRecord || (r.PatientName && r.PatientName.toLowerCase().includes(searchRecord.toLowerCase()))
    );

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', fontFamily: 'Arial, sans-serif', minHeight: 'calc(100vh - 100px)' }}>
            {/* CỘT TRÁI: DANH SÁCH HỒ SƠ */}
            <div style={{ width: '320px', background: '#fff', border: '1px solid #bdc3c7', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#27ae60', color: '#fff', padding: '12px 15px', fontWeight: 'bold', fontSize: '14px' }}>
                    HỒ SƠ BỆNH ÁN ({filteredRecords.length})
                </div>
                <div style={{ padding: '10px' }}>
                    <input placeholder="Tìm bệnh nhân..." value={searchRecord}
                        onChange={e => setSearchRecord(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                    {filteredRecords.map(r => (
                        <li key={r.RecordID} onClick={() => setSelectedRecord(r)}
                            style={{
                                padding: '12px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                                background: selectedRecord?.RecordID === r.RecordID ? '#e8f8f5' : '#fff',
                                borderLeft: selectedRecord?.RecordID === r.RecordID ? '4px solid #27ae60' : '4px solid transparent'
                            }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{r.PatientName}</div>
                            <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '2px' }}>{r.Diagnosis}</div>
                            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                                ICD: {r.ICD10} | {new Date(r.AppointmentDate || r.CreatedAt).toLocaleDateString('vi-VN')}
                            </div>
                        </li>
                    ))}
                    {filteredRecords.length === 0 && (
                        <li style={{ padding: '20px', textAlign: 'center', color: '#95a5a6', fontStyle: 'italic', fontSize: '13px' }}>
                            Không có hồ sơ bệnh án nào. Bác sĩ cần tạo bệnh án trước.
                        </li>
                    )}
                </ul>
            </div>

            {/* CỘT PHẢI */}
            <div style={{ flex: 1 }}>
                {!selectedRecord ? (
                    <div style={{ background: '#fff', padding: '60px', textAlign: 'center', color: '#7f8c8d', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px' }}>
                        Chọn hồ sơ bệnh án từ danh sách bên trái để xem và thực hiện liệu trình.
                    </div>
                ) : (
                    <>
                        {/* THÔNG TIN HỒ SƠ */}
                        <div style={{ background: '#fff', border: '1px solid #27ae60', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#2c3e50' }}>{selectedRecord.PatientName}</div>
                                    <div style={{ color: '#27ae60', fontSize: '14px', marginTop: '4px' }}>{selectedRecord.Diagnosis}</div>
                                    <div style={{ color: '#7f8c8d', fontSize: '13px', marginTop: '4px' }}>
                                        Kế hoạch: {selectedRecord.TreatmentPlan}
                                    </div>
                                    {selectedRecord.InsuranceType && (
                                        <div style={{ marginTop: '5px', fontSize: '12px', color: selectedRecord.InsuranceType !== 'None' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                            BHYT: {selectedRecord.InsuranceType === 'BHYT_K3' ? 'K3 (100%)' : selectedRecord.InsuranceType === 'BHYT' ? 'BHYT' : 'Tự túc'}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>
                                    <div>Mã hồ sơ: <strong>#{selectedRecord.RecordID}</strong></div>
                                    <div style={{ marginTop: '4px' }}>Số buổi đã thực hiện: <strong style={{ color: '#27ae60', fontSize: '16px' }}>{sessions.length}</strong></div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: canOperate ? '1fr 1fr' : '1fr', gap: '16px' }}>
                            {/* FORM THỰC HIỆN LIỆU TRÌNH - Bác sĩ VÀ Y tá */}
                            {canOperate && (
                                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '18px' }}>
                                    <h3 style={{ color: '#27ae60', marginTop: 0, fontSize: '15px' }}>
                                        Thực Hiện Kỹ Thuật YHCT
                                        <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 'normal', marginLeft: '8px' }}>
                                            ({role === 'Nurse' ? 'Y tá' : 'Bác sĩ'})
                                        </span>
                                    </h3>

                                    {/* SINH HIỆU */}
                                    <div style={{ background: '#f0fff4', border: '1px solid #27ae60', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#27ae60', marginBottom: '8px', fontSize: '13px' }}>
                                            Ghi Nhận Sinh Hiệu Trước Điều Trị {role === 'Nurse' ? '(bắt buộc)' : '(tùy chọn)'}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Huyết Áp (mmHg)</label>
                                                <input type="text" placeholder="vd: 120/80" value={form.BloodPressure}
                                                    onChange={e => setForm({ ...form, BloodPressure: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nhịp Tim (lần/phút)</label>
                                                <input type="number" placeholder="vd: 72" value={form.HeartRate}
                                                    onChange={e => setForm({ ...form, HeartRate: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* CHỌN KỸ THUẬT */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Kỹ Thuật Thực Hiện</label>
                                        <select value={form.TechniqueType} onChange={e => setForm({ ...form, TechniqueType: e.target.value })}
                                            style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '5px', fontSize: '13px' }}>
                                            {techniques.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* ĐỒNG HỒ BẤM GIỜ */}
                                    <div style={{
                                        background: sessionRunning ? '#e8f8f5' : '#f8f9fa',
                                        border: `2px solid ${sessionRunning ? '#27ae60' : '#ddd'}`,
                                        borderRadius: '8px', padding: '14px', textAlign: 'center', marginBottom: '14px'
                                    }}>
                                        <div style={{ fontSize: '38px', fontWeight: 'bold', color: sessionRunning ? '#27ae60' : '#2c3e50', fontFamily: 'monospace' }}>
                                            {formatTime(elapsed)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                                            {sessionRunning ? `Bắt đầu lúc: ${startTime?.toLocaleTimeString('vi-VN')}` : 'Chưa bắt đầu'}
                                        </div>
                                        {!sessionRunning ? (
                                            <button onClick={handleStartSession}
                                                style={{ padding: '10px 24px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                                                BẮT ĐẦU
                                            </button>
                                        ) : (
                                            <button onClick={handleEndSession}
                                                style={{ padding: '10px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                                                KẾT THÚC & LƯU
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Kết Quả Buổi Điều Trị <span style={{ color: 'red' }}>*</span></label>
                                        <input type="text" value={form.Result} onChange={e => setForm({ ...form, Result: e.target.value })}
                                            placeholder="vd: Bệnh nhân cảm thấy đỡ đau, thư giãn tốt"
                                            style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '5px', boxSizing: 'border-box', fontSize: '13px' }} />
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Ghi Chú Thêm</label>
                                        <textarea value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })}
                                            placeholder="Phản ứng bất thường, lưu ý..." rows={2}
                                            style={{ width: '100%', padding: '9px', border: '1px solid #bdc3c7', borderRadius: '4px', marginTop: '5px', boxSizing: 'border-box', fontSize: '13px', resize: 'none' }} />
                                    </div>

                                    {!sessionRunning && (
                                        <button onClick={handleSaveWithoutTimer}
                                            style={{ width: '100%', padding: '11px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                            LƯU NHANH (KHÔNG BẤM GIỜ)
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* LỊCH SỬ LIỆU TRÌNH */}
                            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '18px' }}>
                                <h3 style={{ color: '#2c3e50', marginTop: 0, fontSize: '15px' }}>
                                    Lịch Sử Liệu Trình ({sessions.length} buổi)
                                </h3>
                                {sessions.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#aaa', padding: '30px', fontStyle: 'italic', fontSize: '13px' }}>
                                        Chưa có buổi điều trị nào được ghi nhận.
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                        {sessions.map((s, i) => (
                                            <div key={s.SessionID} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                <div style={{ background: '#27ae60', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                                                    {i + 1}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>{s.TechniqueType}</div>
                                                    <div style={{ color: '#27ae60', fontSize: '13px', marginTop: '2px' }}>{s.Result}</div>
                                                    <div style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '2px' }}>{s.Notes}</div>
                                                    <div style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>
                                                        {new Date(s.SessionDate).toLocaleString('vi-VN')} | Bởi: {s.NurseName}
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
    );
};

export default Treatment;