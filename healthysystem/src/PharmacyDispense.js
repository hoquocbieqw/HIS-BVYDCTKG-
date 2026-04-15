import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function PharmacyDispense() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedInv, setSelectedInv] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [msg, setMsg] = useState('');
  const [dispensing, setDispensing] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', category: 'Đông y', unit: 'Gói', stock_quantity: 0, min_stock: 10, price: 0, batch_number: '', expiry_date: '', is_bhyt: false });

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    axios.get(`${API}/pharmacy/dispense-queue`, getAuth()).then(r => setQueue(r.data)).catch(() => {});
    axios.get(`${API}/medicines`, getAuth()).then(r => setMedicines(r.data)).catch(() => {});
  };

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const openDispense = async (inv) => {
    setSelectedInv(inv);
    try {
      const r = await axios.get(`${API}/prescriptions/${inv.RecordID}`, getAuth());
      setPrescriptions(r.data);
    } catch { setPrescriptions([]); }
  };

  const handleDispense = async () => {
    if (!selectedInv) return;
    setDispensing(true);
    try {
      await axios.post(`${API}/pharmacy/dispense/${selectedInv.InvoiceID}`, {}, getAuth());
      notify(`Cấp phát thuốc thành công cho ${selectedInv.patient_name}`);
      setSelectedInv(null);
      setPrescriptions([]);
      loadAll();
    } catch (e) { notify(e.response?.data?.error || 'Lỗi cấp phát'); }
    setDispensing(false);
  };

  const handleAddMed = async () => {
    if (!newMed.name) { notify('Vui lòng nhập tên thuốc'); return; }
    try {
      await axios.post(`${API}/medicines`, newMed, getAuth());
      notify('Thêm thuốc thành công');
      setShowAddMed(false);
      setNewMed({ name: '', category: 'Đông y', unit: 'Gói', stock_quantity: 0, min_stock: 10, price: 0, batch_number: '', expiry_date: '', is_bhyt: false });
      loadAll();
    } catch (e) { notify(e.response?.data?.error || 'Lỗi thêm thuốc'); }
  };

  const lowStock = medicines.filter(m => m.StockQuantity <= (m.MinStock || 10));
  const dispensed = queue.filter(q => q.IsPaid === 2);
  const pending = queue.filter(q => q.IsPaid === 1);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#c0392b', marginBottom: 4 }}>Quầy Cấp Phát Thuốc - Dược sĩ</h2>
      {msg && <div style={{ background: '#d4edda', color: '#155724', padding: '8px 16px', borderRadius: 6, marginBottom: 12 }}>{msg}</div>}

      {/* Cảnh báo tồn kho thấp */}
      {lowStock.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
          <strong>Cảnh báo tồn kho thấp:</strong> {lowStock.map(m => `${m.Name} (còn ${m.StockQuantity} ${m.Unit})`).join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['queue', `Chờ cấp phát (${pending.length})`], ['inventory', `Kho thuốc (${medicines.length})`], ['history', `Đã cấp phát (${dispensed.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === key ? '#c0392b' : '#eee', color: tab === key ? '#fff' : '#333', fontWeight: tab === key ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Danh sách chờ */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 12, color: '#c0392b' }}>Đơn thuốc chờ cấp phát</div>
            {!pending.length && <div style={{ textAlign: 'center', padding: 40, color: '#999', border: '2px dashed #ddd', borderRadius: 8 }}>Chưa có đơn thuốc nào chờ cấp phát</div>}
            {pending.map(inv => (
              <div key={inv.InvoiceID} onClick={() => openDispense(inv)}
                style={{ border: selectedInv?.InvoiceID === inv.InvoiceID ? '2px solid #c0392b' : '1px solid #e0e0e0', borderRadius: 8, padding: 14, marginBottom: 10, cursor: 'pointer',
                  background: selectedInv?.InvoiceID === inv.InvoiceID ? '#fff5f5' : '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 700 }}>{inv.patient_name}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Phiếu thuốc: {inv.drug_voucher || `INV-${inv.InvoiceID}`}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Chẩn đoán: {inv.Diagnosis}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {inv.is_free && <span style={{ fontSize: 11, background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>MIỄN PHÍ 100%</span>}
                  <span style={{ fontSize: 11, background: '#cce5ff', color: '#004085', padding: '2px 8px', borderRadius: 10 }}>{inv.insurance_type}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chi tiết đơn và cấp phát */}
          <div>
            {!selectedInv ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#999', border: '2px dashed #ddd', borderRadius: 8 }}>
                Chọn đơn thuốc bên trái để xem chi tiết
              </div>
            ) : (
              <div style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 20, background: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#c0392b', marginBottom: 16 }}>Chi tiết đơn thuốc</div>
                <div style={{ marginBottom: 16 }}>
                  {[['Bệnh nhân', selectedInv.patient_name], ['Phiếu thuốc', selectedInv.drug_voucher || '-'], ['Chẩn đoán', selectedInv.Diagnosis], ['Khoa', selectedInv.Department], ['BHYT', selectedInv.insurance_type]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#666', width: 100 }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Danh sách thuốc cần cấp phát:</div>
                  {!prescriptions.length && <div style={{ color: '#999', fontSize: 13 }}>Không có đơn thuốc (dịch vụ kỹ thuật)</div>}
                  {prescriptions.map((p, i) => {
                    const med = medicines.find(m => m.MedicineID === p.MedicineID);
                    const hasStock = med && med.StockQuantity >= p.Quantity;
                    return (
                      <div key={i} style={{ border: `1px solid ${hasStock ? '#dee2e6' : '#f5c6cb'}`, borderRadius: 6, padding: 12, marginBottom: 8, background: hasStock ? '#fff' : '#fff5f5' }}>
                        <div style={{ fontWeight: 600 }}>{p.medicine_name}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>Số lượng: {p.Quantity} {p.Unit} | Liều: {p.Dosage}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>Cách dùng: {p.Instructions}</div>
                        {med && (
                          <div style={{ fontSize: 12, marginTop: 4, color: hasStock ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                            Tồn kho: {med.StockQuantity} {med.Unit} {!hasStock ? '(THIẾU KHO)' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedInv.is_free && (
                  <div style={{ background: '#d4edda', border: '2px solid #28a745', borderRadius: 6, padding: '10px', textAlign: 'center', color: '#155724', fontWeight: 700, marginBottom: 16 }}>
                    BHYT K3 - CẤP THUỐC MIỄN PHÍ 100%
                  </div>
                )}

                <button onClick={handleDispense} disabled={dispensing}
                  style={{ width: '100%', padding: '12px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                  {dispensing ? 'Đang cấp phát...' : 'XÁC NHẬN CẤP PHÁT THUỐC'}
                </button>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 8 }}>
                  Hệ thống sẽ tự động trừ tồn kho theo nguyên tắc FEFO
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddMed(true)} style={{ padding: '8px 18px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              + Nhập thuốc mới
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#c0392b', color: '#fff' }}>
                  {['#', 'Tên thuốc', 'Danh mục', 'Đơn vị', 'Tồn kho', 'Tồn tối thiểu', 'Đơn giá', 'Số lô', 'HSD', 'BHYT'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medicines.map((m, i) => {
                  const isLow = m.StockQuantity <= (m.MinStock || 10);
                  const isExpiring = m.expiry_date && new Date(m.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={m.MedicineID} style={{ borderBottom: '1px solid #eee', background: isLow ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '8px' }}>{m.MedicineID}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{m.Name}</td>
                      <td style={{ padding: '8px' }}>{m.Category}</td>
                      <td style={{ padding: '8px' }}>{m.Unit}</td>
                      <td style={{ padding: '8px', fontWeight: 700, color: isLow ? '#e74c3c' : '#27ae60' }}>{m.StockQuantity}</td>
                      <td style={{ padding: '8px' }}>{m.MinStock || 10}</td>
                      <td style={{ padding: '8px' }}>{(m.Price || 0).toLocaleString('vi-VN')}đ</td>
                      <td style={{ padding: '8px', fontSize: 11 }}>{m.batch_number || '-'}</td>
                      <td style={{ padding: '8px', fontSize: 11, color: isExpiring ? '#e74c3c' : '#333' }}>{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('vi-VN') : '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{m.is_bhyt ? '✓' : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!medicines.length && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Kho thuốc trống</div>}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12, color: '#27ae60' }}>Lịch sử cấp phát thuốc ({dispensed.length})</div>
          {!dispensed.length && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chưa có lịch sử cấp phát</div>}
          {dispensed.map(inv => (
            <div key={inv.InvoiceID} style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 14, marginBottom: 10, background: '#f0fff4' }}>
              <div style={{ fontWeight: 700 }}>{inv.patient_name}</div>
              <div style={{ fontSize: 13, color: '#666' }}>Phiếu thuốc: {inv.drug_voucher || '-'} | {inv.is_free ? 'MIỄN PHÍ 100%' : 'Đã thanh toán'}</div>
              <span style={{ fontSize: 11, background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Đã cấp phát</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal thêm thuốc */}
      {showAddMed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#c0392b' }}>Nhập thuốc vào kho</h3>
              <button onClick={() => setShowAddMed(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['name', 'Tên thuốc *', 'text'], ['batch_number', 'Số lô', 'text'], ['expiry_date', 'Hạn sử dụng', 'date'], ['stock_quantity', 'Số lượng nhập', 'number'], ['min_stock', 'Tồn tối thiểu', 'number'], ['price', 'Đơn giá (VNĐ)', 'number']].map(([key, label, type]) => (
                <div key={key}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>{label}</label>
                  <input type={type} value={newMed[key]} onChange={e => setNewMed(m => ({ ...m, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>Danh mục</label>
                <select value={newMed.category} onChange={e => setNewMed(m => ({ ...m, category: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                  {['Đông y', 'Tây y', 'Dược liệu', 'Viên hoàn', 'Cao thuốc'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>Đơn vị</label>
                <select value={newMed.unit} onChange={e => setNewMed(m => ({ ...m, unit: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                  {['Gói', 'Viên', 'Lọ', 'Kg', 'Gram', 'Chai'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={newMed.is_bhyt} onChange={e => setNewMed(m => ({ ...m, is_bhyt: e.target.checked }))} />
                Thuốc trong danh mục BHYT
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAddMed(false)} style={{ padding: '8px 18px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
              <button onClick={handleAddMed} style={{ padding: '8px 18px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Nhập kho</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}