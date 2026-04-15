import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MedicalRecords = () => {
    const [pendingPatients, setPendingPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [icdSearch, setIcdSearch] = useState('');
    
    // Form EMR chuẩn
    const [recordData, setRecordData] = useState({
        Diagnosis: '',
        ICD10: '',
        TreatmentPlan: '',
        Notes: '',
        yhctServices: [] // Danh sách chỉ định gửi cho điều dưỡng
    });

    // TỪ ĐIỂN ICD-10 MẪU (CDSS - Hỗ trợ ra quyết định lâm sàng)
    const icd10Dictionary = [
        { code: 'M54.5', name: 'Đau lưng vùng thấp (Low back pain)' },
        { code: 'M54.4', name: 'Đau thắt lưng cùng với đau thần kinh tọa' },
        { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
        { code: 'E11', name: 'Bệnh đái tháo đường không phụ thuộc insulin' },
        { code: 'M15', name: 'Thoái hóa đa khớp' },
        { code: 'G51.0', name: 'Liệt Bell (Liệt dây thần kinh số VII ngoại biên)' }
    ];

    // DANH MỤC KỸ THUẬT YHCT
    const availableServices = [
        'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống', 'Điện châm', 'Cứu ngải', 'Chiếu đèn hồng ngoại'
    ];

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchPendingPatients();
    }, []);

    const fetchPendingPatients = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/appointments/pending', getAuthHeader());
            setPendingPatients(res.data);
        } catch (err) {
            alert("Lỗi tải danh sách bệnh nhân: " + err.message);
        }
    };

    const handleSelectICD = (icd) => {
        setRecordData({ ...recordData, ICD10: icd.code, Diagnosis: icd.name });
        setIcdSearch(icd.code + ' - ' + icd.name);
    };

    const handleToggleService = (service) => {
        const currentServices = recordData.yhctServices;
        if (currentServices.includes(service)) {
            setRecordData({ ...recordData, yhctServices: currentServices.filter(s => s !== service) });
        } else {
            setRecordData({ ...recordData, yhctServices: [...currentServices, service] });
        }
    };

    const handleSignAndSave = async (e) => {
        e.preventDefault();
        if (!recordData.ICD10) return alert("Hệ thống yêu cầu bắt buộc phải có mã ICD-10 để thanh toán BHYT!");
        
        const confirmSign = window.confirm("XÁC NHẬN CHỮ KÝ SỐ:\nBạn chịu trách nhiệm pháp lý với Y lệnh này. Xác nhận khóa hồ sơ?");
        if (!confirmSign) return;

        try {
            // 1. Lưu bệnh án chính
            const res = await axios.post('http://localhost:3001/api/medical-records', {
                AppointmentID: selectedPatient.AppointmentID,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: recordData.TreatmentPlan + (recordData.yhctServices.length > 0 ? `\n[Chỉ định YHCT: ${recordData.yhctServices.join(', ')}]` : ''),
                Notes: recordData.Notes
            }, getAuthHeader());

            alert(`Khóa hồ sơ thành công! Mã hồ sơ: ${res.data.recordId}`);
            
            // Reset UI
            setSelectedPatient(null);
            setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] });
            setIcdSearch('');
            fetchPendingPatients();
        } catch (err) {
            alert("Lỗi lưu hồ sơ: " + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* CỘT 1: DANH SÁCH WORKLIST */}
            <div style={{ width: '350px', backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '15px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #2980b9', paddingBottom: '10px' }}>HÀNG ĐỢI LÂM SÀNG</h3>
                {pendingPatients.length === 0 ? <p style={{ color: '#7f8c8d' }}>Không có bệnh nhân chờ.</p> : null}
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingPatients.map(p => (
                        <li key={p.AppointmentID} 
                            style={{ 
                                padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer', 
                                backgroundColor: selectedPatient?.AppointmentID === p.AppointmentID ? '#e8f4f8' : 'transparent',
                                borderLeft: selectedPatient?.AppointmentID === p.AppointmentID ? '4px solid #2980b9' : '4px solid transparent'
                            }}
                            onClick={() => setSelectedPatient(p)}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{p.PatientName}</div>
                            <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>Lý do: {p.Reason}</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: KHU VỰC BỆNH ÁN ĐIỆN TỬ (EMR) */}
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #2980b9', paddingBottom: '10px' }}>HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EMR)</h3>
                
                {!selectedPatient ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px 0' }}>Vui lòng chọn bệnh nhân từ hàng đợi lâm sàng để tiến hành khám.</div>
                ) : (
                    <form onSubmit={handleSignAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px dashed #7f8c8d' }}>
                            <strong>Đang khám:</strong> <span style={{ color: '#c0392b', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedPatient.PatientName}</span>
                        </div>

                        {/* MÃ ICD-10 */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ fontWeight: 'bold' }}>Mã bệnh quốc tế (ICD-10) / Chẩn đoán:</label>
                            <input 
                                type="text" 
                                placeholder="Gõ tên bệnh hoặc mã ICD (Ví dụ: Đau lưng, M54...)" 
                                value={icdSearch}
                                onChange={(e) => {
                                    setIcdSearch(e.target.value);
                                    if(e.target.value === '') setRecordData({...recordData, ICD10: '', Diagnosis: ''});
                                }}
                                style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #bdc3c7' }}
                            />
                            {icdSearch && !recordData.ICD10 && (
                                <ul style={{ position: 'absolute', width: '100%', backgroundColor: '#fff', border: '1px solid #bdc3c7', maxHeight: '150px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, zIndex: 10 }}>
                                    {icd10Dictionary.filter(i => i.name.toLowerCase().includes(icdSearch.toLowerCase()) || i.code.includes(icdSearch.toUpperCase())).map(icd => (
                                        <li key={icd.code} onClick={() => handleSelectICD(icd)} style={{ padding: '8px 10px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: '#fafafa' }}>
                                            <strong>{icd.code}</strong> - {icd.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* CHỈ ĐỊNH DỊCH VỤ YHCT */}
                        <div>
                            <label style={{ fontWeight: 'bold' }}>Chỉ định Kỹ thuật / Liệu trình YHCT:</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', backgroundColor: '#f4f6f7', padding: '15px', border: '1px solid #ecf0f1' }}>
                                {availableServices.map(srv => (
                                    <label key={srv} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={recordData.yhctServices.includes(srv)}
                                            onChange={() => handleToggleService(srv)}
                                        />
                                        {srv}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* KẾ HOẠCH ĐIỀU TRỊ CHUNG */}
                        <div>
                            <label style={{ fontWeight: 'bold' }}>Kế hoạch điều trị / Lời dặn Bác sĩ:</label>
                            <textarea 
                                required
                                value={recordData.TreatmentPlan} 
                                onChange={e => setRecordData({...recordData, TreatmentPlan: e.target.value})}
                                style={{ width: '100%', height: '80px', padding: '10px', marginTop: '5px', border: '1px solid #bdc3c7' }}
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                            <button type="submit" style={{ flex: 1, backgroundColor: '#c0392b', color: 'white', padding: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                KÝ SỐ & KHÓA BỆNH ÁN
                            </button>
                            <button type="button" onClick={() => alert("Chức năng chuyển sang Tab kê đơn (Lab 8) đang được mở...")} style={{ flex: 1, backgroundColor: '#2980b9', color: 'white', padding: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                CHUYỂN SANG KÊ ĐƠN THUỐC
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default MedicalRecords;