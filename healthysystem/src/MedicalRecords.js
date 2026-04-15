import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PrescriptionForm from './PrescriptionForm';

const formatDateTime = (dateString) => new Date(dateString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

const MedicalRecords = () => {
    const [pendingList, setPendingList] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [formData, setFormData] = useState({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [savedRecordID, setSavedRecordID] = useState(null);

    const refreshData = useCallback(() => {
        const token = localStorage.getItem('token');
        axios.get('http://localhost:3001/api/appointments/pending', { headers: { Authorization: `Bearer ${token}` } }).then(res => setPendingList(res.data)).catch(() => {});
        axios.get('http://localhost:3001/api/medical-records', { headers: { Authorization: `Bearer ${token}` } }).then(res => setHistoryList(res.data)).catch(() => {});
    }, []);

    useEffect(() => { refreshData(); }, [refreshData]);

    const handleStartExam = (app) => {
        setSelectedApp(app); setIsEditing(false); setSavedRecordID(null);
        setFormData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '' });
    };

    const handleEditRequest = (record) => {
        setSelectedApp(record); setIsEditing(true); setSavedRecordID(null);
        setFormData({ Diagnosis: record.Diagnosis, ICD10: record.ICD10 || '', TreatmentPlan: record.TreatmentPlan, Notes: record.Notes || '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (isEditing) {
                await axios.put(`http://localhost:3001/api/medical-records/${selectedApp.RecordID}`, formData, config);
                alert("Cập nhật bệnh án thành công!");
                setSelectedApp(null); refreshData();
            } else {
                const data = { ...formData, PatientID: selectedApp.PatientID, AppointmentID: selectedApp.AppointmentID };
                const res = await axios.post('http://localhost:3001/api/medical-records', data, config);
                setSavedRecordID(res.data.recordId);
                alert("Lưu chẩn đoán thành công! Mời bác sĩ kê đơn.");
            }
        } catch (err) { 
            // In ra chính xác lỗi từ Backend để sửa dễ hơn
            alert("Lỗi xử lý bệnh án: " + (err.response?.data?.message || "Vui lòng kiểm tra lại kết nối server")); 
            console.error(err);
        }
    };

    const handleDelete = async (recordID) => {
        if (window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn bệnh án này?")) {
            try {
                await axios.delete(`http://localhost:3001/api/medical-records/${recordID}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                refreshData();
            } catch (err) { alert("Không thể xóa bệnh án này!"); }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px', fontFamily: 'Arial' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '10px', fontWeight: '800' }}>Phòng Khám Chuyên Môn</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxHeight: '600px', overflowY: 'auto' }}>
                    <h3 style={{ color: '#e67e22', borderBottom: '2px solid #fde0c5', paddingBottom: '10px', marginTop: 0 }}>DANH SÁCH CHỜ KHÁM</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {pendingList.length > 0 ? pendingList.map(app => (
                                <tr key={app.AppointmentID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px 5px', color: '#1e293b' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#0984e3', marginBottom: '8px' }}>{app.PatientName || 'Chưa cập nhật'}</div>
                                        <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '600', marginBottom: '6px' }}>{formatDateTime(app.AppointmentDate)}</div>
                                        <div style={{ fontSize: '14px', color: '#475569' }}>Lý do: {app.Reason}</div>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingLeft: '10px' }}><button onClick={() => handleStartExam(app)} style={{ backgroundColor: '#0984e3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Khám</button></td>
                                </tr>
                            )) : <tr><td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Không có bệnh nhân chờ.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div style={{ flex: '2 1 500px', backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#0984e3', borderBottom: '2px solid #dbeafe', paddingBottom: '10px', marginTop: 0 }}>{isEditing ? "CHỈNH SỬA BỆNH ÁN" : "FORM KHÁM BỆNH"}</h3>
                    {selectedApp ? (
                        <>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0984e3' }}><span style={{ color: '#64748b' }}>Đang khám: </span><strong style={{ fontSize: '18px', color: '#1e293b' }}>{selectedApp.PatientName}</strong></div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 2 }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Chẩn đoán bệnh:</label><textarea value={formData.Diagnosis} onChange={e => setFormData({...formData, Diagnosis: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} disabled={savedRecordID !== null} /></div>
                                    <div style={{ flex: 1 }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Mã ICD-10:</label><input type="text" value={formData.ICD10} onChange={e => setFormData({...formData, ICD10: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} disabled={savedRecordID !== null} /></div>
                                </div>
                                <div><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Chỉ định liệu trình YHCT:</label><textarea value={formData.TreatmentPlan} onChange={e => setFormData({...formData, TreatmentPlan: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} disabled={savedRecordID !== null} /></div>
                                <div><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Ghi chú thêm:</label><input type="text" value={formData.Notes} onChange={e => setFormData({...formData, Notes: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} disabled={savedRecordID !== null} /></div>
                                {!savedRecordID && (
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button type="button" onClick={() => setSelectedApp(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>HỦY BỎ</button>
                                        <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{isEditing ? "CẬP NHẬT HỒ SƠ" : "LƯU CHẨN ĐOÁN & KÊ ĐƠN"}</button>
                                    </div>
                                )}
                            </form>
                            {savedRecordID && <PrescriptionForm recordId={savedRecordID} onFinish={() => { setSelectedApp(null); setSavedRecordID(null); refreshData(); }} />}
                        </>
                    ) : <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>Vui lòng chọn bệnh nhân từ danh sách chờ.</div>}
                </div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                <h3 style={{ color: '#0984e3', margin: '0 0 20px 0' }}>LỊCH SỬ BỆNH ÁN</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}><tr><th style={{ padding: '15px' }}>Ngày khám</th><th>Bệnh nhân</th><th>Chẩn đoán (ICD-10)</th><th>Liệu trình</th><th style={{ textAlign: 'center' }}>Thao tác</th></tr></thead>
                    <tbody>
                        {historyList.map(r => (
                            <tr key={r.RecordID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px', color: '#b91c1c', fontWeight: 'bold' }}>{formatDateTime(r.AppointmentDate)}</td>
                                <td style={{ fontWeight: 'bold', color: '#0984e3' }}>{r.PatientName}</td>
                                <td>{r.Diagnosis} {r.ICD10 && `(${r.ICD10})`}</td>
                                <td>{r.TreatmentPlan}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleEditRequest(r)} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '5px' }}>Sửa</button>
                                    <button onClick={() => handleDelete(r.RecordID)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default MedicalRecords;