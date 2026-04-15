import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const MedicineManagement = () => {
    const role = JSON.parse(localStorage.getItem('user'))?.role;
    const canEdit = role === 'Pharmacist'; // Chỉ Pharmacist được thao tác

    const [medicines, setMedicines] = useState([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ MedicineName: '', Unit: '', StockQuantity: '', Price: '', Description: '' });

    useEffect(() => { fetchMedicines(); }, []);

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`${API}/api/medicines/all`, auth());
            setMedicines(res.data);
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async () => {
        if (!canEdit) return;
        if (!form.MedicineName || !form.Unit || !form.StockQuantity) return alert('Vui lòng điền đủ thông tin!');
        try {
            if (editItem) {
                await axios.put(`${API}/api/medicines/${editItem.MedicineID}`, form, auth());
                alert('Cập nhật thành công!');
            } else {
                await axios.post(`${API}/api/medicines`, form, auth());
                alert('Nhập thuốc thành công!');
            }
            setShowForm(false);
            setEditItem(null);
            setForm({ MedicineName: '', Unit: '', StockQuantity: '', Price: '', Description: '' });
            fetchMedicines();
        } catch (err) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
    };

    const handleDelete = async (id) => {
        if (!canEdit) return;
        if (!window.confirm('Xác nhận xóa thuốc này?')) return;
        try {
            await axios.delete(`${API}/api/medicines/${id}`, auth());
            fetchMedicines();
        } catch (err) { alert('Lỗi xóa: ' + (err.response?.data?.message || err.message)); }
    };

    const handleEdit = (m) => {
        if (!canEdit) return;
        setEditItem(m);
        setForm({ MedicineName: m.MedicineName, Unit: m.Unit, StockQuantity: m.StockQuantity, Price: m.Price, Description: m.Description });
        setShowForm(true);
    };

    const filtered = medicines.filter(m => m.MedicineName?.toLowerCase().includes(search.toLowerCase()));
    const lowStock = medicines.filter(m => m.StockQuantity <= 50).length;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ color: '#8e44ad', margin: 0 }}>
                        {canEdit ? 'Quản Lý Kho Thuốc YHCT' : 'Kho Thuốc YHCT (Chỉ Xem)'}
                    </h2>
                    {!canEdit && <div style={{ color: '#e67e22', fontSize: '13px', marginTop: '4px' }}>Bạn chỉ có quyền xem danh sách thuốc. Liên hệ Dược sĩ để cập nhật kho.</div>}
                </div>
                {canEdit && (
                    <button onClick={() => { setShowForm(true); setEditItem(null); setForm({ MedicineName: '', Unit: '', StockQuantity: '', Price: '', Description: '' }); }}
                        style={{ background: '#8e44ad', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        + Nhập Thuốc Mới
                    </button>
                )}
            </div>

            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                {[
                    { label: 'Tổng Loại Thuốc', value: medicines.length, color: '#8e44ad' },
                    { label: 'Tổng Tồn Kho', value: medicines.reduce((a, m) => a + m.StockQuantity, 0), color: '#0984e3' },
                    { label: 'Sắp Hết (≤50)', value: lowStock, color: '#e74c3c' },
                    { label: 'Còn Hàng', value: medicines.filter(m => m.StockQuantity > 50).length, color: '#27ae60' },
                ].map(k => (
                    <div key={k.label} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>{k.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: k.color, margin: '6px 0' }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* CẢNH BÁO KHO */}
            {lowStock > 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #f39c12', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
                    <strong style={{ color: '#e67e22' }}>Cảnh báo:</strong> Có {lowStock} loại thuốc sắp hết tồn kho.
                    {canEdit && ' Vui lòng nhập thêm hàng.'}
                </div>
            )}

            {/* TÌM KIẾM */}
            <div style={{ marginBottom: '14px' }}>
                <input type="text" placeholder="Tìm kiếm tên thuốc..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ padding: '10px 14px', border: '1px solid #bdc3c7', borderRadius: '6px', width: '320px', fontSize: '14px' }} />
            </div>

            {/* BẢNG THUỐC */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#8e44ad', color: '#fff' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã</th>
                            <th style={{ padding: '12px' }}>Tên Thuốc / Vị Thuốc</th>
                            <th style={{ padding: '12px' }}>Đơn Vị</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Tồn Kho</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Đơn Giá</th>
                            <th style={{ padding: '12px' }}>Mô Tả / Tác Dụng</th>
                            <th style={{ padding: '12px' }}>Trạng Thái</th>
                            {canEdit && <th style={{ padding: '12px', textAlign: 'center' }}>Thao Tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((m, i) => (
                            <tr key={m.MedicineID} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '11px 16px', color: '#888', fontWeight: 'bold' }}>#{m.MedicineID}</td>
                                <td style={{ padding: '11px', fontWeight: 'bold', color: '#2c3e50' }}>{m.MedicineName}</td>
                                <td style={{ padding: '11px', textAlign: 'center', color: '#888' }}>{m.Unit}</td>
                                <td style={{ padding: '11px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 'bold', color: m.StockQuantity <= 10 ? '#e74c3c' : m.StockQuantity <= 50 ? '#e67e22' : '#27ae60' }}>
                                        {m.StockQuantity}
                                    </span>
                                </td>
                                <td style={{ padding: '11px', textAlign: 'right', color: '#555' }}>
                                    {parseFloat(m.Price || 0).toLocaleString('vi-VN')} đ
                                </td>
                                <td style={{ padding: '11px', color: '#7f8c8d', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.Description || '—'}
                                </td>
                                <td style={{ padding: '11px' }}>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                        background: m.StockQuantity <= 10 ? '#fee' : m.StockQuantity <= 50 ? '#fff3cd' : '#e8f8f5',
                                        color: m.StockQuantity <= 10 ? '#e74c3c' : m.StockQuantity <= 50 ? '#e67e22' : '#27ae60'
                                    }}>
                                        {m.StockQuantity <= 10 ? 'Nguy hiểm' : m.StockQuantity <= 50 ? 'Sắp hết' : 'Đủ kho'}
                                    </span>
                                </td>
                                {canEdit && (
                                    <td style={{ padding: '11px', textAlign: 'center' }}>
                                        <button onClick={() => handleEdit(m)} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px', fontSize: '12px' }}>Sửa</button>
                                        <button onClick={() => handleDelete(m.MedicineID)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Xóa</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={canEdit ? 8 : 7} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>Không tìm thấy thuốc phù hợp.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* FORM NHẬP/SỬA */}
            {showForm && canEdit && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '28px', borderRadius: '10px', width: '440px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#8e44ad' }}>{editItem ? 'Cập Nhật Thuốc' : 'Nhập Thuốc Mới Vào Kho'}</h3>
                        {[
                            { label: 'Tên thuốc / Vị thuốc *', key: 'MedicineName', type: 'text' },
                            { label: 'Đơn vị tính *', key: 'Unit', type: 'text', placeholder: 'Gam, Viên, Thang, Chai...' },
                            { label: 'Số lượng tồn *', key: 'StockQuantity', type: 'number' },
                            { label: 'Đơn giá (VNĐ)', key: 'Price', type: 'number' },
                            { label: 'Tác dụng / Mô tả', key: 'Description', type: 'text' },
                        ].map(f => (
                            <div key={f.key} style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>{f.label}</label>
                                <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    placeholder={f.placeholder || ''}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                            <button onClick={() => { setShowForm(false); setEditItem(null); }}
                                style={{ flex: 1, padding: '11px', border: 'none', background: '#e2e8f0', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy</button>
                            <button onClick={handleSubmit}
                                style={{ flex: 2, padding: '11px', border: 'none', background: '#8e44ad', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                {editItem ? 'Cập Nhật' : 'Nhập Kho'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicineManagement;