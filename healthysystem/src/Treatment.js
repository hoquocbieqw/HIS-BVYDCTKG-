import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Treatment = () => {
    const [records, setRecords] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [formData, setFormData] = useState({ TechniqueType: 'Châm cứu', Result: '', Notes: '' });
    const [sessionHistory, setSessionHistory] = useState([]);

    // Lấy quyền hiện tại để khóa chức năng đối với Admin
    const role = localStorage.getItem('role');

    const fetchRecords = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/api/medical-records', { headers: { Authorization: `Bearer ${token}` } });
            setRecords(res.data);
        } catch (error) { alert("Lỗi tải dữ liệu bệnh án"); }
    }, []);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const handleSaveSession = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3001/api/treatments', { recordId: selectedRecord.RecordID, ...formData }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Đã ghi nhận buổi trị liệu thành công!");
            setShowModal(false);
            setFormData({ TechniqueType: 'Châm cứu', Result: '', Notes: '' });
        } catch (err) { alert("Lỗi ghi nhận liệu trình."); }
    };

    const handleViewHistory = async (record) => {
        setSelectedRecord(record);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:3001/api/treatments/${record.RecordID}`, { headers: { Authorization: `Bearer ${token}` } });
            setSessionHistory(res.data);
            setShowHistoryModal(true);
        } catch (err) { alert("Lỗi tải lịch sử liệu trình."); }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '20px' }}>QUẢN LÝ LIỆU TRÌNH YHCT</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '12px' }}>Mã BA</th>
                            <th>Bệnh nhân</th>
                            <th>Chẩn đoán (ICD-10)</th>
                            <th>Liệu trình chỉ định</th>
                            <th style={{ textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map(r => (
                            <tr key={r.RecordID} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>#{r.RecordID}</td>
                                <td style={{ fontWeight: 'bold', color: '#0984e3' }}>{r.PatientName}</td>
                                <td>{r.Diagnosis} {r.ICD10 ? `(${r.ICD10})` : ''}</td>
                                <td>{r.TreatmentPlan}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleViewHistory(r)} style={{ background: '#f39c12', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '5px' }}>
                                        Xem lịch sử
                                    </button>
                                    
                                    {/* KHÓA NÚT GHI NHẬN VỚI ADMIN */}
                                    {role !== 'Admin' ? (
                                        <button onClick={() => { setSelectedRecord(r); setShowModal(true); }} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Ghi nhận
                                        </button>
                                    ) : <span style={{ color: '#ccc', fontStyle: 'italic', fontSize: '13px' }}>Chỉ xem</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL GHI NHẬN BUỔI TẬP */}
            {showModal && selectedRecord && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '450px' }}>
                        <h3 style={{ color: '#0984e3', textAlign: 'center', marginTop: 0 }}>GHI NHẬN LIỆU TRÌNH</h3>
                        <p><strong>Bệnh nhân:</strong> <span style={{ color: '#0984e3' }}>{selectedRecord.PatientName}</span></p>
                        <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <select value={formData.TechniqueType} onChange={e => setFormData({ ...formData, TechniqueType: e.target.value })} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}>
                                <option value="Châm cứu">Châm cứu</option>
                                <option value="Xoa bóp bấm huyệt">Xoa bóp bấm huyệt</option>
                                <option value="Kéo giãn cột sống">Kéo giãn cột sống</option>
                                <option value="Cấy chỉ">Cấy chỉ</option>
                            </select>
                            <input placeholder="Đánh giá kết quả sau buổi tập..." value={formData.Result} onChange={e => setFormData({ ...formData, Result: e.target.value })} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                            <textarea placeholder="Ghi chú điều dưỡng..." value={formData.Notes} onChange={e => setFormData({ ...formData, Notes: e.target.value })} rows="3" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold' }}>Hủy</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Lưu Buổi Tập</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL XEM LỊCH SỬ CÁC BUỔI TẬP */}
            {showHistoryModal && selectedRecord && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ color: '#0984e3', textAlign: 'center', marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>LỊCH SỬ ĐIỀU TRỊ YHCT</h3>
                        <p><strong>Bệnh nhân:</strong> <span style={{ color: '#0984e3' }}>{selectedRecord.PatientName}</span> (Mã BA: #{selectedRecord.RecordID})</p>
                        
                        {sessionHistory.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                                <thead style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                    <tr>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Ngày tập</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Kỹ thuật</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Kết quả</th>
                                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Y/Bác sĩ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessionHistory.map(session => (
                                        <tr key={session.SessionID} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px' }}>{new Date(session.SessionDate).toLocaleString('vi-VN')}</td>
                                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#27ae60' }}>{session.TechniqueType}</td>
                                            <td style={{ padding: '10px' }}>{session.Result}</td>
                                            <td style={{ padding: '10px', color: '#475569' }}>{session.NurseName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '20px 0' }}>Bệnh nhân chưa có lịch sử trị liệu nào.</p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setShowHistoryModal(false)} style={{ padding: '10px 30px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Treatment;