import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const icd10Dictionary = [
    { code: 'M54.5', name: 'Đau lưng vùng thấp (Low back pain)' },
    { code: 'M54.4', name: 'Đau thắt lưng kèm đau thần kinh tọa' },
    { code: 'M54.2', name: 'Đau cổ vai gáy (Cervicalgia)' },
    { code: 'M47.8', name: 'Thoái hóa cột sống cổ' },
    { code: 'M51.1', name: 'Thoát vị đĩa đệm cột sống thắt lưng' },
    { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
    { code: 'E11', name: 'Đái tháo đường không phụ thuộc insulin' },
    { code: 'M15', name: 'Thoái hóa đa khớp' },
    { code: 'G51.0', name: 'Liệt Bell (Liệt dây TK số VII ngoại biên)' },
    { code: 'M79.3', name: 'Viêm mô tế bào - Panniculitis' },
    { code: 'R51', name: 'Nhức đầu' },
    { code: 'K30', name: 'Khó tiêu (Dyspepsia)' },
];

const yhctServices = [
    'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống',
    'Điện châm', 'Cứu ngải', 'Chiếu đèn hồng ngoại', 'Cấy chỉ', 'Thủy châm'
];

const MedicalRecords = () => {
    const [pendingPatients, setPendingPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('emr'); // 'emr' | 'prescription'
    const [icdSearch, setIcdSearch] = useState('');
    const [savedRecordId, setSavedRecordId] = useState(null);

    const [recordData, setRecordData] = useState({
        Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: []
    });

    // Kê đơn thuốc
    const [medicines, setMedicines] = useState([]);
    const [prescriptionList, setPrescriptionList] = useState([]);
    const [medSearch, setMedSearch] = useState('');

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        fetchPendingPatients();
        fetchMedicines();
    }, []);

    const fetchPendingPatients = async () => {
        try {
            const res = await axios.get(`${API}/api/appointments/pending`, getAuthHeader());
            setPendingPatients(res.data);
        } catch (err) { alert("Lỗi tải danh sách: " + err.message); }
    };

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`${API}/api/medicines`, getAuthHeader());
            setMedicines(res.data);
        } catch (err) {}
    };

    const handleSelectICD = (icd) => {
        setRecordData({ ...recordData, ICD10: icd.code, Diagnosis: icd.name });
        setIcdSearch(icd.code + ' - ' + icd.name);
    };

    const handleToggleService = (service) => {
        const list = recordData.yhctServices;
        setRecordData({
            ...recordData,
            yhctServices: list.includes(service) ? list.filter(s => s !== service) : [...list, service]
        });
    };

    const handleSignAndSave = async (e) => {
        e.preventDefault();
        if (!recordData.ICD10) return alert("Bắt buộc phải có mã ICD-10 để thanh toán BHYT!");
        if (!window.confirm("Xác nhận ký số và khóa bệnh án? Bạn chịu trách nhiệm pháp lý với y lệnh này.")) return;

        try {
            const treatmentText = recordData.TreatmentPlan +
                (recordData.yhctServices.length > 0 ? `\n[Chỉ định YHCT: ${recordData.yhctServices.join(', ')}]` : '');

            const res = await axios.post(`${API}/api/medical-records`, {
                AppointmentID: selectedPatient.AppointmentID,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: treatmentText,
                Notes: recordData.Notes
            }, getAuthHeader());

            setSavedRecordId(res.data.recordId);
            alert(`Khóa hồ sơ thành công! Mã hồ sơ: #${res.data.recordId}\nChuyển sang kê đơn thuốc...`);
            setActiveTab('prescription');
            fetchPendingPatients();
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.message || err.message));
        }
    };

    const handleAddMedicine = (med) => {
        if (prescriptionList.find(p => p.medicineId === med.MedicineID)) {
            return alert("Thuốc này đã có trong đơn!");
        }
        setPrescriptionList([...prescriptionList, {
            medicineId: med.MedicineID,
            MedicineName: med.MedicineName,
            Unit: med.Unit,
            quantity: 1,
            dosage: '',
            Price: med.Price
        }]);
    };

    const handleUpdatePrescriptionItem = (idx, field, value) => {
        const updated = [...prescriptionList];
        updated[idx][field] = value;
        setPrescriptionList(updated);
    };

    const handleRemoveMedicine = (idx) => {
        setPrescriptionList(prescriptionList.filter((_, i) => i !== idx));
    };

    const handleSavePrescription = async () => {
        if (!savedRecordId) return alert("Vui lòng khóa bệnh án trước!");
        if (prescriptionList.length === 0) {
            if (!window.confirm("Không có đơn thuốc. Xác nhận hoàn tất khám không có thuốc?")) return;
            resetAll();
            return;
        }
        const invalid = prescriptionList.find(p => !p.dosage || p.quantity < 1);
        if (invalid) return alert("Vui lòng nhập đầy đủ liều dùng và số lượng cho tất cả thuốc!");

        try {
            await axios.post(`${API}/api/prescriptions`, {
                recordId: savedRecordId,
                prescriptionList
            }, getAuthHeader());
            alert("Kê đơn thành công! Hồ sơ đã gửi đến Thu ngân & Dược sĩ.");
            resetAll();
        } catch (err) {
            alert("Lỗi kê đơn: " + (err.response?.data?.message || err.message));
        }
    };

    const resetAll = () => {
        setSelectedPatient(null);
        setSavedRecordId(null);
        setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] });
        setIcdSearch('');
        setPrescriptionList([]);
        setMedSearch('');
        setActiveTab('emr');
    };

    const filteredICD = icd10Dictionary.filter(i =>
        i.name.toLowerCase().includes(icdSearch.toLowerCase()) || i.code.includes(icdSearch.toUpperCase())
    );

    const filteredMeds = medicines.filter(m =>
        m.MedicineName.toLowerCase().includes(medSearch.toLowerCase())
    );

    const labelStyle = { fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#2c3e50' };
    const inputStyle = { width: '100%', padding: '10px', border: '1px solid #bdc3c7', boxSizing: 'border-box' };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* CỘT 1: HÀNG ĐỢI */}
            <div style={{ width: '320px', background: '#fff', border: '1px solid #bdc3c7', padding: '15px', flexShrink: 0 }}>
                <h3 style={{ margin: '0 0 15px', color: '#2c3e50', borderBottom: '2px solid #2980b9', paddingBottom: '8px' }}>
                    HÀNG ĐỢI LÂM SÀNG
                </h3>
                {pendingPatients.length === 0 && <p style={{ color: '#7f8c8d', textAlign: 'center' }}>Không có bệnh nhân chờ.</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingPatients.map(p => (
                        <li key={p.AppointmentID}
                            onClick={() => { setSelectedPatient(p); setSavedRecordId(null); setActiveTab('emr'); setPrescriptionList([]); setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] }); setIcdSearch(''); }}
                            style={{
                                padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
                                background: selectedPatient?.AppointmentID === p.AppointmentID ? '#e8f4f8' : 'transparent',
                                borderLeft: `4px solid ${selectedPatient?.AppointmentID === p.AppointmentID ? '#2980b9' : 'transparent'}`
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{p.PatientName}</span>
                                {p.QueueNumber && <span style={{ background: '#e74c3c', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>#{p.QueueNumber}</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>{p.Department}</div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Lý do: {p.Reason}</div>
                            {p.InsuranceType && p.InsuranceType !== 'None' && (
                                <span style={{ fontSize: '11px', background: p.InsuranceType === 'K3' ? '#27ae60' : '#f39c12', color: '#fff', padding: '1px 6px', borderRadius: '3px', marginTop: '4px', display: 'inline-block' }}>
                                    BHYT {p.InsuranceType} {p.TransferTicket ? '- Đúng tuyến' : ''}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: EMR + KÊ ĐƠN */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #bdc3c7' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '2px solid #ecf0f1' }}>
                    <button onClick={() => setActiveTab('emr')}
                        style={{ padding: '12px 24px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'emr' ? '#2980b9' : 'transparent', color: activeTab === 'emr' ? '#fff' : '#7f8c8d' }}>
                        BỆNH ÁN ĐIỆN TỬ {savedRecordId && `(#${savedRecordId})`}
                    </button>
                    <button onClick={() => { if (!savedRecordId) return alert("Khóa bệnh án trước!"); setActiveTab('prescription'); }}
                        style={{ padding: '12px 24px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'prescription' ? '#8e44ad' : 'transparent', color: activeTab === 'prescription' ? '#fff' : '#7f8c8d' }}>
                        KÊ ĐƠN THUỐC {prescriptionList.length > 0 ? `(${prescriptionList.length})` : ''}
                    </button>
                </div>

                <div style={{ padding: '20px' }}>
                    {!selectedPatient ? (
                        <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '60px 0' }}>
                            Chọn bệnh nhân từ hàng đợi để bắt đầu khám.
                        </div>
                    ) : activeTab === 'emr' ? (
                        <form onSubmit={handleSignAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* Thông tin bệnh nhân */}
                            <div style={{ background: '#f4f6f7', padding: '12px', border: '1px dashed #7f8c8d' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold' }}>Bệnh nhân: </span>
                                        <span style={{ color: '#c0392b', fontSize: '16px', fontWeight: 'bold' }}>{selectedPatient.PatientName}</span>
                                    </div>
                                    {savedRecordId && (
                                        <span style={{ background: '#27ae60', color: '#fff', padding: '4px 12px', fontWeight: 'bold', fontSize: '13px' }}>
                                            DA KHOA HO SO #{savedRecordId}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>
                                    Khoa: {selectedPatient.Department} | Lý do: {selectedPatient.Reason}
                                    {selectedPatient.InsuranceType && selectedPatient.InsuranceType !== 'None' && (
                                        <span style={{ marginLeft: '10px', color: '#27ae60', fontWeight: 'bold' }}>
                                            BHYT {selectedPatient.InsuranceType} {selectedPatient.TransferTicket ? '(Đúng tuyến)' : '(Trái tuyến)'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ICD-10 */}
                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>Mã ICD-10 / Chẩn đoán: <span style={{ color: '#e74c3c' }}>*</span></label>
                                <input type="text"
                                    placeholder="Gõ tên bệnh hoặc mã ICD (vd: Đau cổ, M54...)"
                                    value={icdSearch}
                                    onChange={e => { setIcdSearch(e.target.value); if (!e.target.value) setRecordData({ ...recordData, ICD10: '', Diagnosis: '' }); }}
                                    style={inputStyle} />
                                {icdSearch && !recordData.ICD10 && filteredICD.length > 0 && (
                                    <ul style={{ position: 'absolute', width: '100%', background: '#fff', border: '1px solid #bdc3c7', maxHeight: '180px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, zIndex: 10 }}>
                                        {filteredICD.map(icd => (
                                            <li key={icd.code} onClick={() => handleSelectICD(icd)}
                                                style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                                                <strong style={{ color: '#2980b9' }}>{icd.code}</strong> - {icd.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {recordData.ICD10 && (
                                    <div style={{ marginTop: '5px', padding: '6px 10px', background: '#e8f8f5', border: '1px solid #1abc9c', fontSize: '13px' }}>
                                        Đã chọn: <strong>{recordData.ICD10}</strong> - {recordData.Diagnosis}
                                    </div>
                                )}
                            </div>

                            {/* Chỉ định YHCT */}
                            <div>
                                <label style={labelStyle}>Chỉ định kỹ thuật YHCT:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f4f6f7', padding: '12px', border: '1px solid #ecf0f1' }}>
                                    {yhctServices.map(srv => (
                                        <label key={srv} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input type="checkbox" checked={recordData.yhctServices.includes(srv)} onChange={() => handleToggleService(srv)} />
                                            {srv}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Kế hoạch điều trị */}
                            <div>
                                <label style={labelStyle}>Kế hoạch điều trị / Lời dặn: <span style={{ color: '#e74c3c' }}>*</span></label>
                                <textarea required value={recordData.TreatmentPlan}
                                    onChange={e => setRecordData({ ...recordData, TreatmentPlan: e.target.value })}
                                    placeholder="Nhập phác đồ điều trị, lời dặn bệnh nhân..."
                                    style={{ ...inputStyle, height: '80px' }} />
                            </div>

                            {/* Ghi chú */}
                            <div>
                                <label style={labelStyle}>Ghi chú thêm:</label>
                                <textarea value={recordData.Notes}
                                    onChange={e => setRecordData({ ...recordData, Notes: e.target.value })}
                                    placeholder="Dị ứng, tiền sử bệnh, ghi chú đặc biệt..."
                                    style={{ ...inputStyle, height: '60px' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                {!savedRecordId ? (
                                    <button type="submit" style={{ flex: 2, background: '#c0392b', color: '#fff', padding: '13px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                        KY SO & KHOA BENH AN
                                    </button>
                                ) : (
                                    <div style={{ flex: 2, background: '#27ae60', color: '#fff', padding: '13px', textAlign: 'center', fontWeight: 'bold' }}>
                                        DA KHOA - MA #{savedRecordId}
                                    </div>
                                )}
                                <button type="button"
                                    onClick={() => { if (!savedRecordId) return alert("Khóa bệnh án trước!"); setActiveTab('prescription'); }}
                                    style={{ flex: 1, background: '#8e44ad', color: '#fff', padding: '13px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                    KE DON THUOC
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* TAB KÊ ĐƠN THUỐC */
                        <div style={{ display: 'flex', gap: '20px' }}>
                            {/* Tìm thuốc */}
                            <div style={{ width: '280px', flexShrink: 0 }}>
                                <h4 style={{ margin: '0 0 10px', color: '#8e44ad' }}>DANH MUC THUOC</h4>
                                <input type="text" placeholder="Tìm thuốc..."
                                    value={medSearch} onChange={e => setMedSearch(e.target.value)}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #bdc3c7', boxSizing: 'border-box', marginBottom: '10px' }} />
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ecf0f1' }}>
                                    {filteredMeds.map(m => (
                                        <div key={m.MedicineID}
                                            onClick={() => handleAddMedicine(m)}
                                            style={{ padding: '8px 10px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{m.MedicineName}</div>
                                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                                Tồn: {m.StockQuantity} {m.Unit} | {m.Price?.toLocaleString()}đ
                                                {m.IsBHYT ? <span style={{ marginLeft: '5px', color: '#27ae60', fontWeight: 'bold' }}>BHYT</span> : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Đơn thuốc */}
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 10px', color: '#8e44ad' }}>DON THUOC - BENH NHAN: {selectedPatient.PatientName}</h4>
                                {prescriptionList.length === 0 ? (
                                    <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '30px' }}>Click vào thuốc bên trái để thêm vào đơn.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead style={{ background: '#f4f6f7' }}>
                                            <tr>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Tên thuốc</th>
                                                <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ecf0f1' }}>SL</th>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Liều dùng</th>
                                                <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ecf0f1' }}>Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prescriptionList.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                                    <td style={{ padding: '8px', border: '1px solid #ecf0f1', fontWeight: 'bold' }}>
                                                        {item.MedicineName} <span style={{ color: '#7f8c8d', fontWeight: 'normal' }}>({item.Unit})</span>
                                                    </td>
                                                    <td style={{ padding: '4px', border: '1px solid #ecf0f1', textAlign: 'center' }}>
                                                        <input type="number" min="1" value={item.quantity}
                                                            onChange={e => handleUpdatePrescriptionItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                            style={{ width: '60px', padding: '4px', textAlign: 'center' }} />
                                                    </td>
                                                    <td style={{ padding: '4px', border: '1px solid #ecf0f1' }}>
                                                        <input type="text" value={item.dosage} placeholder="vd: 1 viên x 2 lần/ngày sau ăn"
                                                            onChange={e => handleUpdatePrescriptionItem(idx, 'dosage', e.target.value)}
                                                            style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} />
                                                    </td>
                                                    <td style={{ padding: '4px', border: '1px solid #ecf0f1', textAlign: 'center' }}>
                                                        <button onClick={() => handleRemoveMedicine(idx)}
                                                            style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 10px', cursor: 'pointer', borderRadius: '3px' }}>X</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <button onClick={resetAll}
                                        style={{ flex: 1, background: '#95a5a6', color: '#fff', padding: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                        HOAN TAT KHONG CO THUOC
                                    </button>
                                    <button onClick={handleSavePrescription}
                                        style={{ flex: 2, background: '#27ae60', color: '#fff', padding: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                        XAC NHAN KE DON & GUI THU NGAN
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MedicalRecords;