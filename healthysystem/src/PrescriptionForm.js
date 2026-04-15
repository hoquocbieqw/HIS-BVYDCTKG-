import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PrescriptionForm = ({ recordId, onFinish }) => {
    const [medicines, setMedicines] = useState([]);
    const [cart, setCart] = useState([]);
    const [selected, setSelected] = useState({ medicineId: '', quantity: 1, dosage: '' });

    // Tải danh sách thuốc từ Backend khi Component được render
    useEffect(() => {
        const fetchMeds = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:3001/api/medicines', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMedicines(res.data);
            } catch (err) {
                console.error("Lỗi lấy danh mục thuốc:", err);
            }
        };
        fetchMeds();
    }, []);

    // Xử lý khi bấm nút "Thêm thuốc" vào giỏ (đơn thuốc tạm)
    const addToCart = () => {
        if (!selected.medicineId) return alert("Vui lòng chọn thuốc!");
        if (selected.quantity <= 0) return alert("Số lượng phải lớn hơn 0!");

        const med = medicines.find(m => m.MedicineID == selected.medicineId);
        
        // Kiểm tra xem số lượng kê có vượt quá tồn kho không
        if (selected.quantity > med.StockQuantity) {
             return alert(`Số lượng trong kho không đủ! Chỉ còn ${med.StockQuantity} ${med.Unit}.`);
        }

        // Thêm vào giỏ
        setCart([...cart, { ...selected, name: med.MedicineName, unit: med.Unit }]);
        
        // Reset lại form chọn
        setSelected({ medicineId: '', quantity: 1, dosage: '' });
    };

    // Xử lý loại bỏ thuốc khỏi giỏ (nếu nhập sai)
    const removeFromCart = (indexToRemove) => {
        setCart(cart.filter((_, index) => index !== indexToRemove));
    };

    // Gửi toàn bộ đơn thuốc lên Server để lưu và trừ kho
    const submitPrescription = async () => {
        if (cart.length === 0) return alert("Vui lòng kê ít nhất 1 loại thuốc!");

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3001/api/prescriptions', 
                { recordId, prescriptionList: cart },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            alert("Đã hoàn tất kê đơn và trừ kho thành công!");
            onFinish(); // Đóng form và làm mới dữ liệu
        } catch (err) { 
            alert("Lỗi kê đơn: " + (err.response?.data?.message || "Lỗi Server")); 
        }
    };

    return (
        <div style={{ marginTop: '20px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
            <h4 style={{ color: '#0984e3', marginBottom: '15px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                💊 KÊ ĐƠN THUỐC
            </h4>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <select 
                    value={selected.medicineId} 
                    onChange={e => setSelected({...selected, medicineId: e.target.value})} 
                    style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '150px' }}
                >
                    <option value="">-- Chọn thuốc --</option>
                    {medicines.map(m => (
                        <option key={m.MedicineID} value={m.MedicineID}>
                            {m.MedicineName} (Còn: {m.StockQuantity} {m.Unit})
                        </option>
                    ))}
                </select>

                <input 
                    type="number" 
                    placeholder="Số lượng" 
                    min="1"
                    value={selected.quantity} 
                    onChange={e => setSelected({...selected, quantity: parseInt(e.target.value) || 1})} 
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '80px' }}
                />

                <input 
                    type="text" 
                    placeholder="Liều dùng (VD: Sáng 1 viên sau ăn)" 
                    value={selected.dosage} 
                    onChange={e => setSelected({...selected, dosage: e.target.value})} 
                    style={{ flex: 3, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '200px' }}
                />

                <button 
                    type="button" 
                    onClick={addToCart} 
                    style={{ padding: '10px 15px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                    + Thêm
                </button>
            </div>

            {/* Hiển thị danh sách thuốc đã chọn */}
            {cart.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <strong style={{ display: 'block', marginBottom: '10px', color: '#475569' }}>Danh sách thuốc đã kê:</strong>
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#1e293b' }}>
                        {cart.map((item, i) => (
                            <li key={i} style={{ marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', color: '#0984e3' }}>{item.name}</span> x {item.quantity} 
                                <span style={{ fontStyle: 'italic', color: '#64748b', marginLeft: '5px' }}>({item.dosage})</span>
                                <button 
                                    onClick={() => removeFromCart(i)}
                                    style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                                >
                                    [Xóa]
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Nút xác nhận cuối cùng */}
            {cart.length > 0 && (
                <button 
                    type="button" 
                    onClick={submitPrescription} 
                    style={{ width: '100%', padding: '15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}
                >
                    XÁC NHẬN KÊ ĐƠN & KẾT THÚC KHÁM
                </button>
            )}
        </div>
    );
};

export default PrescriptionForm;