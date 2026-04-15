import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PharmacyDispense = () => {
    const [prescriptions, setPrescriptions] = useState([]);

    const fetchPrescriptions = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            // Gọi API lấy hóa đơn đã thanh toán ('Paid') để phát thuốc
            const res = await axios.get('http://localhost:3001/api/invoices/paid', { headers: { Authorization: `Bearer ${token}` } });
            setPrescriptions(res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

    const handleDispense = (patientName) => {
        alert(`Đã xuất kho và giao thuốc thành công cho bệnh nhân: ${patientName}.`);
        // Trong thực tế sẽ gọi API đổi Status đơn thuốc thành 'Đã giao', ở đây ta minh họa UI
        fetchPrescriptions();
    };

    return (
        <div style={{ padding: '20px', background: '#f8fafc', minHeight: '80vh' }}>
            <h2 style={{ color: '#15803d', borderBottom: '3px solid #15803d', paddingBottom: '10px' }}>💊 QUẦY DƯỢC - CẤP PHÁT THUỐC BHYT</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <p style={{ color: '#b91c1c', fontStyle: 'italic', marginBottom: '15px' }}>* Chú ý: Chỉ phát thuốc khi bệnh nhân xuất trình Biên lai đã thu tiền.</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#dcfce7', color: '#166534', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Mã Hóa Đơn</th>
                            <th style={{ padding: '12px' }}>Tên Bệnh Nhân</th>
                            <th style={{ padding: '12px' }}>Ngày thanh toán</th>
                            <th style={{ padding: '12px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prescriptions.length > 0 ? prescriptions.map(pres => (
                            <tr key={pres.InvoiceID} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>HD-{pres.InvoiceID}</td>
                                <td style={{ padding: '12px' }}>{pres.PatientName}</td>
                                <td style={{ padding: '12px' }}>{new Date(pres.CreatedAt).toLocaleString('vi-VN')}</td>
                                <td style={{ padding: '12px' }}>
                                    <button onClick={() => handleDispense(pres.PatientName)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        ✔ Hoàn Tất Giao Thuốc
                                    </button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Không có đơn thuốc nào cần phát.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default PharmacyDispense;