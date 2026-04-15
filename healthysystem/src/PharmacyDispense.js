import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const PharmacyDispense = () => {
    const [readyList, setReadyList] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [prescriptionDetails, setPrescriptionDetails] = useState([]);
    const [dispensing, setDispensing] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchReadyList(); }, []);

    const fetchReadyList = async () => {
        try {
            const res = await axios.get(`${API}/api/pharmacy/ready-to-dispense`, getAuthHeader());
            setReadyList(res.data);
        } catch (err) { alert("Loi tai danh sach: " + err.message); }
    };

    const handleSelectRecord = async (record) => {
        setSelectedRecord(record);
        setDispensing(false);
        try {
            const res = await axios.get(`${API}/api/prescriptions/details/${record.RecordID}`, getAuthHeader());
            // Dữ liệu đã được backend sắp xếp theo FEFO (ExpiryDate ASC)
            setPrescriptionDetails(res.data);
        } catch (err) { alert("Loi tai chi tiet don thuoc: " + err.message); }
    };

    // Quét mã vạch từ biên lai
    const handleBarcodeSearch = (e) => {
        e.preventDefault();
        // Format mã: BR-{RecordID}
        const match = barcodeInput.match(/BR-(\d+)/i);
        if (!match) return alert("Ma vach khong hop le. Dinh dang: BR-{SoHoSo}");
        const recordId = parseInt(match[1]);
        const found = readyList.find(r => r.RecordID === recordId);
        if (!found) return alert(`Khong tim thay don thuoc #${recordId} hoac chua duoc thanh toan.`);
        handleSelectRecord(found);
        setBarcodeInput('');
    };

    const handleConfirmDispense = async () => {
        if (!selectedRecord) return;
        if (!window.confirm("XAC NHAN XUAT KHO:\nHe thong se tru ton kho theo nguyen tac FEFO (Hang het han truoc, xuat truoc). Tiep tuc?")) return;

        try {
            setDispensing(true);
            await axios.post(`${API}/api/prescriptions/dispense/${selectedRecord.RecordID}`, {}, getAuthHeader());
            alert("Xuat kho va cap phat thuoc thanh cong!");
            fetchReadyList();
            setSelectedRecord(null);
            setPrescriptionDetails([]);
        } catch (err) {
            alert("Loi cap phat: " + (err.response?.data?.message || err.message));
        } finally {
            setDispensing(false);
        }
    };

    const handlePrintLabel = () => {
        if (!selectedRecord || prescriptionDetails.length === 0) return;
        const win = window.open('', '_blank', 'width=420,height=700');
        win.document.write(`
            <html><head><title>Nhan Thuoc</title>
            <style>body{font-family:Arial;padding:15px;max-width:400px;}
            .header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:15px;}
            .patient{font-size:16px;font-weight:bold;margin:10px 0;}
            .drug{border:1px solid #ccc;padding:10px;margin:8px 0;border-radius:4px;}
            .drug-name{font-weight:bold;font-size:14px;}
            .dosage{font-size:13px;color:#333;margin-top:5px;}
            .batch{font-size:11px;color:#666;margin-top:3px;}
            .footer{border-top:1px dashed #999;margin-top:15px;padding-top:10px;font-size:12px;}
            </style></head><body>
            <div class="header">
                <div style="font-weight:bold;font-size:15px">BV YDCT KIEN GIANG</div>
                <div style="font-size:13px">PHIEU CAP PHAT THUOC</div>
            </div>
            <div class="patient">Benh nhan: ${selectedRecord.PatientName}</div>
            <div style="font-size:13px;margin-bottom:12px">
                MA BA: #${selectedRecord.RecordID} | BHYT: ${selectedRecord.InsuranceType || 'Khong'}
                ${selectedRecord.TotalAmount === 0 ? '<br><strong style="color:green">THUOC MIEN PHI (BHYT 100%)</strong>' : ''}
            </div>
            ${prescriptionDetails.map(item => `
                <div class="drug">
                    <div class="drug-name">${item.MedicineName}</div>
                    <div class="dosage">So luong: ${item.Quantity} ${item.Unit}</div>
                    <div class="dosage">Lieu dung: ${item.Dosage}</div>
                    <div class="batch">Lo: ${item.BatchNumber || 'N/A'} | Han dung: ${item.ExpiryDate ? new Date(item.ExpiryDate).toLocaleDateString('vi-VN') : 'N/A'}</div>
                </div>
            `).join('')}
            <div class="footer">
                Ngay xuat: ${new Date().toLocaleString('vi-VN')}<br>
                Duoc si: _______________<br>
                Ky nhan: _______________
            </div>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* CỘT 1: HÀNG ĐỢI */}
            <div style={{ width: '360px', background: '#fff', border: '1px solid #bdc3c7', padding: '15px', flexShrink: 0 }}>
                <h3 style={{ margin: '0 0 12px', color: '#2c3e50', borderBottom: '2px solid #8e44ad', paddingBottom: '8px' }}>
                    HANG DOI CAP PHAT THUOC
                </h3>

                {/* Quét mã vạch */}
                <form onSubmit={handleBarcodeSearch} style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
                    <input type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                        placeholder="Quet ma vach bien lai (BR-...)..."
                        style={{ flex: 1, padding: '8px', border: '1px solid #bdc3c7', fontSize: '13px' }} />
                    <button type="submit" style={{ background: '#8e44ad', color: '#fff', border: 'none', padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Tim</button>
                </form>

                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#7f8c8d' }}>
                    Chi hien thi don thuoc da duoc Thu ngan xac nhan thanh toan.
                </div>

                {readyList.length === 0 ? (
                    <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>Chua co don thuoc nao cho cap phat.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {readyList.map(record => (
                            <li key={record.RecordID}
                                onClick={() => handleSelectRecord(record)}
                                style={{
                                    padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
                                    background: selectedRecord?.RecordID === record.RecordID ? '#f5eef8' : 'transparent',
                                    borderLeft: `4px solid ${selectedRecord?.RecordID === record.RecordID ? '#8e44ad' : 'transparent'}`
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>{record.PatientName}</span>
                                    <span style={{ fontSize: '12px', color: '#7f8c8d' }}>#{record.RecordID}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>
                                    {new Date(record.AppointmentDate).toLocaleDateString('vi-VN')}
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                    {record.InsuranceType && record.InsuranceType !== 'None' && (
                                        <span style={{ fontSize: '11px', background: record.TotalAmount === 0 ? '#dcfce7' : '#fef3c7', color: record.TotalAmount === 0 ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                                            BHYT {record.InsuranceType} {record.TotalAmount === 0 ? '- MIEN PHI' : ''}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
                                        DA TT
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* CỘT 2: CHI TIẾT & XUẤT KHO */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #bdc3c7', padding: '20px' }}>
                <h3 style={{ margin: '0 0 15px', color: '#2c3e50', borderBottom: '2px solid #8e44ad', paddingBottom: '8px' }}>
                    CHI TIET DON THUOC & AP DUNG FEFO
                </h3>

                {!selectedRecord ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '60px 0' }}>
                        Chon don thuoc tu danh sach hoac quet ma vach tren bien lai thu tien.
                    </div>
                ) : (
                    <div>
                        {/* Header thông tin */}
                        <div style={{ background: '#f9f9f9', padding: '15px', border: '1px dashed #7f8c8d', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ marginBottom: '6px' }}>
                                        <strong>Benh nhan: </strong>
                                        <span style={{ color: '#c0392b', fontSize: '16px', fontWeight: 'bold' }}>{selectedRecord.PatientName}</span>
                                    </div>
                                    <div style={{ marginBottom: '6px' }}><strong>Chan doan:</strong> {selectedRecord.Diagnosis}</div>
                                    <div><strong>BHYT:</strong> {selectedRecord.InsuranceType || 'Khong'} {selectedRecord.TransferTicket ? '- Dung tuyen' : ''}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ background: '#ecf0f1', padding: '6px 12px', fontWeight: 'bold', border: '1px solid #bdc3c7', fontSize: '13px' }}>
                                        MA QUET: BR-{selectedRecord.RecordID}
                                    </div>
                                    {selectedRecord.TotalAmount === 0 && (
                                        <div style={{ marginTop: '8px', background: '#dcfce7', color: '#16a34a', padding: '4px 10px', fontWeight: 'bold', fontSize: '13px', border: '1px solid #16a34a' }}>
                                            THUOC MIEN PHI
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '10px', fontSize: '13px', color: '#c0392b', fontWeight: 'bold' }}>
                            He thong da tu dong phan bo lo thuoc co han su dung gan nhat (FEFO - First Expired, First Out).
                        </div>

                        {prescriptionDetails.length === 0 ? (
                            <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>Dang tai du lieu...</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ background: '#f4f6f7', borderBottom: '2px solid #bdc3c7' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Ten thuoc / Vi thuoc</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>DVT</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>SL</th>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Ma Lo (Batch)</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>Han SD</th>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Lieu dung</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescriptionDetails.map((item, idx) => {
                                        const isNearExpiry = item.ExpiryDate && (new Date(item.ExpiryDate) - new Date()) < 30 * 24 * 60 * 60 * 1000;
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                                <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #ecf0f1' }}>
                                                    {item.MedicineName}
                                                    {item.IsBHYT ? <span style={{ marginLeft: '5px', fontSize: '11px', color: '#27ae60', fontWeight: 'bold' }}>BHYT</span> : ''}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>{item.Unit}</td>
                                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#2980b9', border: '1px solid #ecf0f1' }}>{item.Quantity}</td>
                                                <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #ecf0f1' }}>
                                                    {item.BatchNumber || 'Chua co lo'}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: isNearExpiry ? '#e74c3c' : '#555', fontWeight: isNearExpiry ? 'bold' : 'normal', border: '1px solid #ecf0f1' }}>
                                                    {item.ExpiryDate ? new Date(item.ExpiryDate).toLocaleDateString('vi-VN') : 'N/A'}
                                                    {isNearExpiry && <div style={{ fontSize: '10px', color: '#e74c3c' }}>SAP HET HAN</div>}
                                                </td>
                                                <td style={{ padding: '10px', fontSize: '13px', border: '1px solid #ecf0f1' }}>{item.Dosage}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setSelectedRecord(null); setPrescriptionDetails([]); }}
                                style={{ background: '#95a5a6', color: '#fff', padding: '12px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                                Huy Bo
                            </button>
                            <button onClick={handlePrintLabel} disabled={prescriptionDetails.length === 0}
                                style={{ background: '#2980b9', color: '#fff', padding: '12px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', opacity: prescriptionDetails.length === 0 ? 0.5 : 1 }}>
                                In Nhan Thuoc
                            </button>
                            <button onClick={handleConfirmDispense}
                                disabled={prescriptionDetails.length === 0 || dispensing}
                                style={{ background: '#8e44ad', color: '#fff', padding: '12px 30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', opacity: (prescriptionDetails.length === 0 || dispensing) ? 0.5 : 1 }}>
                                {dispensing ? 'Dang Xuat Kho...' : 'XUAT KHO & CAP PHAT THUOC'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PharmacyDispense;