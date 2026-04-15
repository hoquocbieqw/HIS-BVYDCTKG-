import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Treatment = () => {
    const [pendingTreatments, setPendingTreatments] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [treatmentData, setTreatmentData] = useState({
        TechniqueType: 'Châm cứu',
        Result: 'Tốt',
        Notes: ''
    });

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchPendingTreatments();
    }, []);

    // Fetch bệnh án từ Bác sĩ chuyển sang
    const fetchPendingTreatments = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/medical-records', getAuthHeader());
            // Lọc ra các bệnh án có chữ "Chỉ định YHCT" trong kế hoạch điều trị
            const yhctRecords = res.data.filter(record => record.TreatmentPlan && record.TreatmentPlan.includes('[Chỉ định YHCT:'));
            setPendingTreatments(yhctRecords);
        } catch (err) {
            alert("Lỗi tải danh sách chỉ định YHCT: " + err.message);
        }
    };

    const handleSelectRecord = (record) => {
        setSelectedRecord(record);
        
        // Bóc tách tự động các kỹ thuật bác sĩ đã yêu cầu từ text TreatmentPlan
        const match = record.TreatmentPlan.match(/\[Chỉ định YHCT: (.*?)\]/);
        if (match && match[1]) {
            const requestedServices = match[1].split(', ');
            if (requestedServices.length > 0) {
                setTreatmentData({ ...treatmentData, TechniqueType: requestedServices[0] });
            }
        }
    };

    const handleSaveTreatment = async (e) => {
        e.preventDefault();
        const confirmSave = window.confirm("XÁC NHẬN KÝ LƯU:\nBạn xác nhận đã thực hiện xong kỹ thuật này cho bệnh nhân?");
        if (!confirmSave) return;

        try {
            await axios.post('http://localhost:3001/api/treatments', {
                recordId: selectedRecord.RecordID,
                TechniqueType: treatmentData.TechniqueType,
                Result: treatmentData.Result,
                Notes: treatmentData.Notes
            }, getAuthHeader());

            alert("Ghi nhận thực hiện thủ thuật YHCT thành công!");
            setSelectedRecord(null);
            setTreatmentData({ TechniqueType: 'Châm cứu', Result: 'Tốt', Notes: '' });
            fetchPendingTreatments(); // Refresh list
        } catch (err) {
            alert("Lỗi lưu liệu trình: " + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* CỘT 1: DANH SÁCH CHỜ THỰC HIỆN KỸ THUẬT */}
            <div style={{ width: '380px', backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '15px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #27ae60', paddingBottom: '10px' }}>Y LỆNH YHCT CHỜ THỰC HIỆN</h3>
                {pendingTreatments.length === 0 ? <p style={{ color: '#7f8c8d' }}>Không có y lệnh YHCT nào chờ xử lý.</p> : null}
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingTreatments.map(record => (
                        <li key={record.RecordID} 
                            style={{ 
                                padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer', 
                                backgroundColor: selectedRecord?.RecordID === record.RecordID ? '#eafaf1' : 'transparent',
                                borderLeft: selectedRecord?.RecordID === record.RecordID ? '4px solid #27ae60' : '4px solid transparent'
                            }}
                            onClick={() => handleSelectRecord(record)}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>{record.PatientName}</div>
                            <div style={{ fontSize: '13px', color: '#c0392b', marginTop: '4px', fontWeight: 'bold' }}>ICD-10: {record.ICD10}</div>
                            <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>BS Chỉ định: {record.DoctorName}</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: KHU VỰC THỰC HIỆN FLOWSHEET */}
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #27ae60', paddingBottom: '10px' }}>GHI NHẬN THỰC HIỆN THỦ THUẬT (FLOWSHEET)</h3>
                
                {!selectedRecord ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px 0' }}>Vui lòng chọn Y lệnh bên trái để ghi nhận kết quả thực hiện.</div>
                ) : (
                    <form onSubmit={handleSaveTreatment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px dashed #7f8c8d' }}>
                            <div style={{ marginBottom: '8px' }}><strong>Bệnh nhân:</strong> <span style={{ color: '#c0392b', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRecord.PatientName}</span></div>
                            <div style={{ marginBottom: '8px' }}><strong>Chẩn đoán:</strong> {selectedRecord.Diagnosis}</div>
                            <div style={{ color: '#2980b9', fontWeight: 'bold' }}>Y LỆNH BÁC SĨ:</div>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', marginTop: '5px', backgroundColor: '#e8f4f8', padding: '10px', borderLeft: '3px solid #2980b9' }}>
                                {selectedRecord.TreatmentPlan}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontWeight: 'bold' }}>Loại kỹ thuật vừa thực hiện:</label>
                            <select 
                                value={treatmentData.TechniqueType} 
                                onChange={e => setTreatmentData({...treatmentData, TechniqueType: e.target.value})}
                                style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #bdc3c7' }}
                            >
                                <option value="Châm cứu">Châm cứu</option>
                                <option value="Xoa bóp bấm huyệt">Xoa bóp bấm huyệt</option>
                                <option value="Kéo giãn cột sống">Kéo giãn cột sống</option>
                                <option value="Điện châm">Điện châm</option>
                                <option value="Cứu ngải">Cứu ngải</option>
                                <option value="Chiếu đèn hồng ngoại">Chiếu đèn hồng ngoại</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>Tình trạng đáp ứng (Kết quả):</label>
                                <select 
                                    value={treatmentData.Result} 
                                    onChange={e => setTreatmentData({...treatmentData, Result: e.target.value})}
                                    style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #bdc3c7' }}
                                >
                                    <option value="Tốt">Bệnh nhân đáp ứng Tốt</option>
                                    <option value="Khá">Bệnh nhân đáp ứng Khá</option>
                                    <option value="Trung bình">Bệnh nhân đáp ứng Trung bình</option>
                                    <option value="Có dấu hiệu mệt mỏi/Sốc">Có dấu hiệu mệt mỏi/Vựng châm</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontWeight: 'bold' }}>Ghi chú điều dưỡng (Chỉ số sinh tồn, phản ứng phụ):</label>
                            <textarea 
                                value={treatmentData.Notes} 
                                onChange={e => setTreatmentData({...treatmentData, Notes: e.target.value})}
                                placeholder="Nhập ghi chú chi tiết sau khi thực hiện kỹ thuật..."
                                style={{ width: '100%', height: '80px', padding: '10px', marginTop: '5px', border: '1px solid #bdc3c7' }}
                            ></textarea>
                        </div>

                        <button type="submit" style={{ backgroundColor: '#27ae60', color: 'white', padding: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                            KÝ NHẬN HOÀN THÀNH KỸ THUẬT
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Treatment;