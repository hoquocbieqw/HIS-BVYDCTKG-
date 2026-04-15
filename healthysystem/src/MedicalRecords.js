import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const icd10Dictionary = [
    { code: 'M54.2', name: 'Đau cổ (Cervicalgia)' },
    { code: 'M54.5', name: 'Đau lưng vùng thấp (Low back pain)' },
    { code: 'M54.4', name: 'Đau thắt lưng với đau thần kinh tọa' },
    { code: 'M47.8', name: 'Thoái hóa cột sống cổ' },
    { code: 'M51.1', name: 'Thoát vị đĩa đệm cột sống thắt lưng' },
    { code: 'M75.1', name: 'Hội chứng vai gáy (Rotator cuff syndrome)' },
    { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
    { code: 'E11', name: 'Đái tháo đường không phụ thuộc insulin' },
    { code: 'M15', name: 'Thoái hóa đa khớp' },
    { code: 'G51.0', name: 'Liệt Bell (Liệt dây thần kinh số VII ngoại biên)' },
    { code: 'F41.1', name: 'Rối loạn lo âu lan tỏa' },
    { code: 'R51', name: 'Đau đầu' },
];

const availableServices = [
    'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống cổ', 'Kéo giãn cột sống thắt lưng',
    'Điện châm', 'Cứu ngải', 'Chiếu đèn hồng ngoại', 'Cấy chỉ', 'Dưỡng sinh', 'Vật lý trị liệu'
];

const MedicalRecords = () => {
    const [pendingPatients, setPendingPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [icdSearch, setIcdSearch] = useState('');
    const [activeTab, setActiveTab] = useState('emr'); // emr | prescription | history
    const [medicines, setMedicines] = useState([]);
    const [prescriptionList, setPrescriptionList] = useState([]);
    const [savedRecordId, setSavedRecordId] = useState(null);
    const [pastRecords, setPastRecords] = useState([]);
    const [prescribedRecord, setPrescribedRecord] = useState(null);
    const printRef = useRef();

    const [recordData, setRecordData] = useState({
        Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: []
    });

    const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchPending(); fetchMedicines(); fetchHistory(); }, []);

    const fetchPending = async () => {
        try {
            const res = await axios.get(`${API}/api/appointments/pending`, auth());
            setPendingPatients(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`${API}/api/medicines`, auth());
            setMedicines(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API}/api/medical-records`, auth());
            setPastRecords(res.data);
        } catch (e) { console.error(e); }
    };

    const handleSelectICD = (icd) => {
        setRecordData({ ...recordData, ICD10: icd.code, Diagnosis: icd.name });
        setIcdSearch(`${icd.code} - ${icd.name}`);
    };

    const handleToggleService = (srv) => {
        const list = recordData.yhctServices;
        setRecordData({
            ...recordData,
            yhctServices: list.includes(srv) ? list.filter(s => s !== srv) : [...list, srv]
        });
    };

    const handleSaveEMR = async (e) => {
        e.preventDefault();
        if (!recordData.ICD10) return alert('Bắt buộc phải có mã ICD-10 để thanh toán BHYT!');
        if (!window.confirm('Xác nhận ký số & khóa bệnh án? Bạn chịu trách nhiệm pháp lý với Y lệnh này.')) return;

        try {
            const planText = recordData.TreatmentPlan +
                (recordData.yhctServices.length > 0 ? `\n[Chỉ định YHCT: ${recordData.yhctServices.join(', ')}]` : '');

            const res = await axios.post(`${API}/api/medical-records`, {
                AppointmentID: selectedPatient.AppointmentID,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: planText,
                Notes: recordData.Notes
            }, auth());

            setSavedRecordId(res.data.recordId);
            alert(`Lưu bệnh án thành công! Mã hồ sơ: ${res.data.recordId}\nBây giờ bạn có thể kê đơn thuốc.`);
            setActiveTab('prescription');
            fetchPending();
            fetchHistory();
        } catch (err) {
            alert('Lỗi lưu hồ sơ: ' + (err.response?.data?.message || err.message));
        }
    };

    const addPrescriptionItem = () => {
        setPrescriptionList([...prescriptionList, { medicineId: '', medicineName: '', quantity: 1, dosage: '' }]);
    };

    const updatePrescriptionItem = (idx, field, value) => {
        const updated = [...prescriptionList];
        if (field === 'medicineId') {
            const med = medicines.find(m => m.MedicineID === parseInt(value));
            updated[idx] = { ...updated[idx], medicineId: value, medicineName: med?.MedicineName || '' };
        } else {
            updated[idx] = { ...updated[idx], [field]: value };
        }
        setPrescriptionList(updated);
    };

    const removePrescriptionItem = (idx) => {
        setPrescriptionList(prescriptionList.filter((_, i) => i !== idx));
    };

    const handleSavePrescription = async () => {
        if (!savedRecordId) return alert('Hãy lưu bệnh án trước khi kê đơn!');
        if (prescriptionList.length === 0) return alert('Đơn thuốc không được rỗng!');
        if (prescriptionList.some(p => !p.medicineId || !p.dosage)) return alert('Vui lòng điền đầy đủ thông tin thuốc!');

        try {
            await axios.post(`${API}/api/prescriptions`, {
                recordId: savedRecordId,
                prescriptionList: prescriptionList.map(p => ({
                    medicineId: parseInt(p.medicineId),
                    quantity: parseInt(p.quantity),
                    dosage: p.dosage
                }))
            }, auth());

            setPrescribedRecord({ patient: selectedPatient, recordId: savedRecordId, prescriptions: prescriptionList, recordData });
            alert('Kê đơn thành công! Bệnh nhân đến quầy Thu ngân để thanh toán.');
            resetAll();
        } catch (err) {
            alert('Lỗi kê đơn: ' + (err.response?.data?.message || err.message));
        }
    };

    const resetAll = () => {
        setSelectedPatient(null);
        setSavedRecordId(null);
        setPrescriptionList([]);
        setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] });
        setIcdSearch('');
        setActiveTab('emr');
    };

    const handlePrint = () => {
        if (!prescribedRecord) return;
        const content = printRef.current.innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Phiếu Khám Bệnh</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; }
            h2, h3 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td, th { border: 1px solid #333; padding: 6px 10px; }
            th { background: #f0f0f0; }
            .no-print { display: none; }
        </style>
        </head><body>${content}</body></html>`);
        win.document.close();
        win.print();
    };

    const tabStyle = (t) => ({
        padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
        borderBottom: activeTab === t ? '3px solid #2980b9' : '3px solid transparent',
        background: 'transparent', color: activeTab === t ? '#2980b9' : '#7f8c8d'
    });

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
            {/* CỘT TRÁI: WORKLIST */}
            <div style={{ width: '300px', background: '#fff', border: '1px solid #bdc3c7', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#2980b9', color: '#fff', padding: '12px 15px', fontWeight: 'bold', fontSize: '14px' }}>
                    HÀNG ĐỢI LÂM SÀNG ({pendingPatients.length})
                </div>
                {pendingPatients.length === 0 && <p style={{ padding: '15px', color: '#7f8c8d', fontSize: '13px' }}>Không có bệnh nhân chờ khám.</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingPatients.map(p => (
                        <li key={p.AppointmentID}
                            onClick={() => { setSelectedPatient(p); setSavedRecordId(null); setPrescriptionList([]); setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] }); setIcdSearch(''); setActiveTab('emr'); }}
                            style={{
                                padding: '12px 15px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
                                background: selectedPatient?.AppointmentID === p.AppointmentID ? '#e8f4f8' : '#fff',
                                borderLeft: selectedPatient?.AppointmentID === p.AppointmentID ? '4px solid #2980b9' : '4px solid transparent'
                            }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.PatientName}</div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>Lý do: {p.Reason}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{new Date(p.AppointmentDate).toLocaleDateString('vi-VN')}</div>
                        </li>
                    ))}
                </ul>

                {/* Lịch sử bệnh án gần đây */}
                <div style={{ background: '#2c3e50', color: '#fff', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', marginTop: '10px' }}>
                    BỆNH ÁN GẦN ĐÂY
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    {pastRecords.slice(0, 8).map(r => (
                        <li key={r.RecordID} style={{ padding: '10px 15px', borderBottom: '1px solid #ecf0f1', fontSize: '12px' }}>
                            <div style={{ fontWeight: 'bold' }}>{r.PatientName}</div>
                            <div style={{ color: '#7f8c8d' }}>{r.Diagnosis}</div>
                            <div style={{ color: '#aaa' }}>{r.ICD10} | {new Date(r.CreatedAt).toLocaleDateString('vi-VN')}</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT PHẢI: EMR + KÊ ĐƠN */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #bdc3c7', borderRadius: '6px', overflow: 'hidden' }}>
                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#f9f9f9' }}>
                    <button style={tabStyle('emr')} onClick={() => setActiveTab('emr')}>Bệnh Án (EMR)</button>
                    <button style={tabStyle('prescription')} onClick={() => setActiveTab('prescription')}>
                        Kê Đơn Thuốc {savedRecordId ? `(Hồ sơ #${savedRecordId})` : ''}
                    </button>
                    <button style={tabStyle('history')} onClick={() => setActiveTab('history')}>Lịch Sử Bệnh Án</button>
                    {prescribedRecord && (
                        <button onClick={handlePrint} style={{ marginLeft: 'auto', padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                            In Phiếu Khám
                        </button>
                    )}
                </div>

                <div style={{ padding: '20px' }}>
                    {/* TAB: BỆNH ÁN */}
                    {activeTab === 'emr' && (
                        !selectedPatient ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#7f8c8d' }}>
                                Chọn bệnh nhân từ hàng đợi lâm sàng để bắt đầu khám.
                            </div>
                        ) : (
                            <form onSubmit={handleSaveEMR}>
                                <div style={{ background: '#fef9e7', border: '1px solid #f39c12', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#e67e22' }}>Đang khám: </span>
                                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#c0392b', textTransform: 'uppercase' }}>{selectedPatient.PatientName}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                                        Lịch hẹn #{selectedPatient.AppointmentID} | {new Date(selectedPatient.AppointmentDate).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>

                                {/* MÃ ICD-10 */}
                                <div style={{ marginBottom: '16px', position: 'relative' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Mã ICD-10 / Chẩn đoán <span style={{ color: 'red' }}>*</span></label>
                                    <input type="text"
                                        placeholder="Tìm bệnh hoặc gõ mã ICD (vd: M54, đau lưng...)"
                                        value={icdSearch}
                                        onChange={e => { setIcdSearch(e.target.value); if (!e.target.value) setRecordData({ ...recordData, ICD10: '', Diagnosis: '' }); }}
                                        style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                    {icdSearch && !recordData.ICD10 && (
                                        <ul style={{ position: 'absolute', width: '100%', background: '#fff', border: '1px solid #bdc3c7', maxHeight: '180px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', borderRadius: '0 0 4px 4px' }}>
                                            {icd10Dictionary.filter(i => i.name.toLowerCase().includes(icdSearch.toLowerCase()) || i.code.toUpperCase().includes(icdSearch.toUpperCase())).map(icd => (
                                                <li key={icd.code} onClick={() => handleSelectICD(icd)}
                                                    style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px' }}
                                                    onMouseOver={e => e.currentTarget.style.background = '#e8f4f8'}
                                                    onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                                                    <strong style={{ color: '#2980b9' }}>{icd.code}</strong> — {icd.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {recordData.ICD10 && (
                                        <div style={{ marginTop: '6px', background: '#e8f8f5', border: '1px solid #27ae60', borderRadius: '4px', padding: '8px 12px', fontSize: '13px', color: '#27ae60', fontWeight: 'bold' }}>
                                            Đã chọn: {recordData.ICD10} — {recordData.Diagnosis}
                                        </div>
                                    )}
                                </div>

                                {/* YHCT SERVICES */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Chỉ Định Kỹ Thuật YHCT</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8f9fa', padding: '12px', borderRadius: '4px', border: '1px solid #ecf0f1' }}>
                                        {availableServices.map(srv => (
                                            <label key={srv} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                                <input type="checkbox" checked={recordData.yhctServices.includes(srv)} onChange={() => handleToggleService(srv)} />
                                                {srv}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* KẾ HOẠCH ĐIỀU TRỊ */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Kế Hoạch Điều Trị / Lời Dặn <span style={{ color: 'red' }}>*</span></label>
                                    <textarea required value={recordData.TreatmentPlan} onChange={e => setRecordData({ ...recordData, TreatmentPlan: e.target.value })}
                                        placeholder="Ghi kế hoạch điều trị, lời dặn bệnh nhân..."
                                        style={{ width: '100%', height: '90px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>

                                {/* GHI CHÚ */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Ghi Chú Lâm Sàng</label>
                                    <textarea value={recordData.Notes} onChange={e => setRecordData({ ...recordData, Notes: e.target.value })}
                                        placeholder="Triệu chứng, bệnh sử, ghi chú thêm..."
                                        style={{ width: '100%', height: '70px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ flex: 2, background: '#c0392b', color: '#fff', padding: '13px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                        KÝ SỐ & LƯU BỆNH ÁN
                                    </button>
                                    <button type="button" onClick={() => setActiveTab('prescription')} style={{ flex: 1, background: '#2980b9', color: '#fff', padding: '13px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                        CHUYỂN KÊ ĐƠN
                                    </button>
                                </div>
                            </form>
                        )
                    )}

                    {/* TAB: KÊ ĐƠN THUỐC */}
                    {activeTab === 'prescription' && (
                        <div>
                            {!savedRecordId ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#e67e22' }}>
                                    Hãy lưu bệnh án (tab EMR) trước khi kê đơn thuốc!
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: '#e8f8f5', border: '1px solid #27ae60', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
                                        <strong style={{ color: '#27ae60' }}>Kê đơn cho hồ sơ #{savedRecordId}</strong> — {selectedPatient?.PatientName}
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', width: '35%' }}>Tên Thuốc</th>
                                                <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '12%' }}>Số Lượng</th>
                                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Liều Dùng / Cách Dùng</th>
                                                <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', width: '8%' }}>Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prescriptionList.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                        <select value={item.medicineId} onChange={e => updatePrescriptionItem(idx, 'medicineId', e.target.value)}
                                                            style={{ width: '100%', padding: '6px', border: '1px solid #bdc3c7', borderRadius: '3px', fontSize: '13px' }}>
                                                            <option value="">-- Chọn thuốc --</option>
                                                            {medicines.map(m => (
                                                                <option key={m.MedicineID} value={m.MedicineID}>
                                                                    {m.MedicineName} (còn {m.StockQuantity} {m.Unit})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                        <input type="number" min="1" value={item.quantity} onChange={e => updatePrescriptionItem(idx, 'quantity', e.target.value)}
                                                            style={{ width: '100%', padding: '6px', border: '1px solid #bdc3c7', borderRadius: '3px', textAlign: 'center', fontSize: '13px' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                        <input type="text" value={item.dosage} onChange={e => updatePrescriptionItem(idx, 'dosage', e.target.value)}
                                                            placeholder="vd: Ngày 2 lần, sáng tối sau ăn"
                                                            style={{ width: '100%', padding: '6px', border: '1px solid #bdc3c7', borderRadius: '3px', fontSize: '13px', boxSizing: 'border-box' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                                        <button onClick={() => removePrescriptionItem(idx)}
                                                            style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={addPrescriptionItem}
                                            style={{ padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            + Thêm Thuốc
                                        </button>
                                        <button onClick={handleSavePrescription}
                                            style={{ padding: '10px 24px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                                            XÁC NHẬN KÊ ĐƠN
                                        </button>
                                        <button onClick={() => setPrescriptionList([])}
                                            style={{ padding: '10px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                            Làm Lại
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB: LỊCH SỬ */}
                    {activeTab === 'history' && (
                        <div>
                            <h3 style={{ color: '#2c3e50', marginTop: 0 }}>Lịch Sử Bệnh Án</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#2980b9', color: '#fff' }}>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Bệnh Nhân</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Chẩn Đoán</th>
                                        <th style={{ padding: '10px' }}>ICD-10</th>
                                        <th style={{ padding: '10px' }}>Ngày Khám</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pastRecords.map((r, i) => (
                                        <tr key={r.RecordID} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{r.PatientName}</td>
                                            <td style={{ padding: '10px' }}>{r.Diagnosis}</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <span style={{ background: '#e8f4f8', color: '#2980b9', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{r.ICD10}</span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center', color: '#7f8c8d' }}>
                                                {new Date(r.AppointmentDate || r.CreatedAt).toLocaleDateString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* PHIẾU IN ẨN */}
            <div ref={printRef} style={{ display: 'none' }}>
                {prescribedRecord && (
                    <div>
                        <h2>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</h2>
                        <h3>PHIẾU KHÁM BỆNH & ĐƠN THUỐC</h3>
                        <hr />
                        <p><strong>Bệnh nhân:</strong> {prescribedRecord.patient?.PatientName}</p>
                        <p><strong>Ngày khám:</strong> {new Date().toLocaleDateString('vi-VN')}</p>
                        <p><strong>Chẩn đoán:</strong> {prescribedRecord.recordData?.Diagnosis}</p>
                        <p><strong>Mã ICD-10:</strong> {prescribedRecord.recordData?.ICD10}</p>
                        <p><strong>Chỉ định YHCT:</strong> {prescribedRecord.recordData?.yhctServices?.join(', ') || 'Không có'}</p>
                        <p><strong>Kế hoạch điều trị:</strong> {prescribedRecord.recordData?.TreatmentPlan}</p>
                        <hr />
                        <h4>ĐƠN THUỐC ĐÔNG Y</h4>
                        <table>
                            <thead>
                                <tr><th>STT</th><th>Tên Thuốc</th><th>Số Lượng</th><th>Liều Dùng</th></tr>
                            </thead>
                            <tbody>
                                {prescribedRecord.prescriptions?.map((p, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{p.medicineName}</td>
                                        <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                                        <td>{p.dosage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <br />
                        <p><em>Bệnh nhân mang phiếu này đến quầy Thu ngân để thanh toán và nhận thuốc tại quầy Dược.</em></p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p><strong>Bác sĩ điều trị</strong></p>
                                <p style={{ marginTop: '50px' }}>(Ký và ghi rõ họ tên)</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicalRecords;