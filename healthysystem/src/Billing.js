import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const BHYT_COVERAGE = { 'K3_transfer': 100, 'K3': 95, 'K2': 80, 'K1': 70, 'Không có': 0 };
const BHYT_LABELS = { 'K1': 'K1 - 70%', 'K2': 'K2 - 80%', 'K3': 'K3 - 95%', 'Không có': 'Tự chi trả' };

function calcBilling(examFee, medicineFee, insuranceType, transferTicket) {
  const total = (parseFloat(examFee) || 0) + (parseFloat(medicineFee) || 0);
  let coveragePct = 0;
  if (insuranceType === 'K3' && transferTicket) coveragePct = 100;
  else if (insuranceType === 'K3') coveragePct = 95;
  else if (insuranceType === 'K2') coveragePct = 80;
  else if (insuranceType === 'K1') coveragePct = 70;
  const bhytPay = total * coveragePct / 100;
  const patientPay = total - bhytPay;
  return { total, bhytPay, patientPay, isFree: patientPay === 0, coveragePct };
}

export default function Billing() {
  const [tab, setTab] = useState('pending');
  const [records, setRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [form, setForm] = useState({ exam_fee: 150000, medicine_total: 0, insurance_type: 'Không có', transfer_ticket: false, payment_method: 'Tiền mặt' });
  const [msg, setMsg] = useState('');
  const [showReceipt, setShowReceipt] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    axios.get(`${API}/medical-records`, getAuth()).then(r => setRecords(r.data.filter(r2 => !r2.bhyt_stamp || r2.status_flow !== 'paid'))).catch(() => {});
    axios.get(`${API}/invoices`, getAuth()).then(r => setInvoices(r.data)).catch(() => {});
  };

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const openBilling = async (record) => {
    setSelected(record);
    setForm({
      exam_fee: record.exam_fee || 150000,
      medicine_total: 0,
      insurance_type: record.insurance_type || 'Không có',
      transfer_ticket: record.transfer_ticket || false,
      payment_method: 'Tiền mặt'
    });
    // Lấy đơn thuốc để tính tiền thuốc
    try {
      const r = await axios.get(`${API}/prescriptions/${record.RecordID}`, getAuth());
      setPrescriptions(r.data);
      const medTotal = r.data.reduce((sum, p) => sum + (p.Price || 0) * p.Quantity, 0);
      setForm(f => ({ ...f, medicine_total: medTotal }));
    } catch { setPrescriptions([]); }
    setTab('checkout');
  };

  const handleStamp = async (bhytStamp) => {
    if (!selected) return;
    try {
      await axios.put(`${API}/medical-records/${selected.RecordID}/stamp`, { bhyt_stamp: bhytStamp }, getAuth());
      setSelected(s => ({ ...s, bhyt_stamp: bhytStamp }));
      notify(`Đã đóng mộc: ${bhytStamp}`);
    } catch (e) { notify('Lỗi đóng mộc'); }
  };

  const handleCheckout = async () => {
    if (!selected) return;
    try {
      const res = await axios.post(`${API}/invoices`, {
        record_id: selected.RecordID,
        patient_id: selected.PatientID,
        ...form
      }, getAuth());
      setShowReceipt({ ...selected, ...form, ...res.data });
      notify('Thanh toán thành công!');
      loadAll();
      setTab('history');
    } catch (e) { notify(e.response?.data?.error || 'Lỗi thanh toán'); }
  };

  const billing = selected ? calcBilling(form.exam_fee, form.medicine_total, form.insurance_type, form.transfer_ticket) : null;

  // Phân loại bệnh án: chờ đóng mộc (chưa có stamp) và chờ thu tiền (đã stamp)
  const pendingStamp = records.filter(r => !r.bhyt_stamp);
  const pendingPayment = records.filter(r => r.bhyt_stamp);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#c0392b', marginBottom: 4 }}>Quầy Thu Viện Phí & Thanh Toán BHYT</h2>
      {msg && <div style={{ background: '#d4edda', color: '#155724', padding: '8px 16px', borderRadius: 6, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['pending', `Chờ xử lý (${records.length})`], ['checkout', 'Thanh toán'], ['history', `Lịch sử (${invoices.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === key ? '#c0392b' : '#eee', color: tab === key ? '#fff' : '#333', fontWeight: tab === key ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Chờ đóng mộc */}
          <div>
            <div style={{ fontWeight: 700, color: '#e67e22', marginBottom: 8 }}>Chờ đóng mộc BHYT ({pendingStamp.length})</div>
            {!pendingStamp.length && <div style={{ color: '#999', fontSize: 13 }}>Không có phiếu chờ đóng mộc</div>}
            {pendingStamp.map(r => (
              <RecordCard key={r.RecordID} record={r} onOpen={openBilling} status="stamp" />
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#27ae60', marginBottom: 8 }}>Đã đóng mộc - chờ thu tiền ({pendingPayment.length})</div>
            {!pendingPayment.length && <div style={{ color: '#999', fontSize: 13 }}>Không có phiếu chờ thu tiền</div>}
            {pendingPayment.map(r => (
              <RecordCard key={r.RecordID} record={r} onOpen={openBilling} status="pay" />
            ))}
          </div>
        </div>
      )}

      {tab === 'checkout' && (
        <div>
          {!selected ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chọn bệnh nhân từ tab <strong>Chờ xử lý</strong></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Thông tin */}
              <div>
                <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 12 }}>Thông tin bệnh nhân</div>
                  {[['Bệnh nhân', selected.patient_name], ['Chẩn đoán', selected.Diagnosis], ['ICD-10', selected.ICD10 || '-'], ['Phiếu khám', selected.exam_ticket || '-'], ['Mộc BHYT', selected.bhyt_stamp || 'Chưa đóng mộc']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: '#666', width: 100 }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Đóng mộc BHYT */}
                {!selected.bhyt_stamp && (
                  <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Đóng mộc BHYT</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['BHYT-100%', 'BHYT-95%', 'BHYT-80%', 'BHYT-70%', 'Tự chi trả'].map(stamp => (
                        <button key={stamp} onClick={() => handleStamp(stamp)}
                          style={{ padding: '6px 14px', background: stamp === 'BHYT-100%' ? '#27ae60' : '#2980b9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                          {stamp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Đơn thuốc */}
                {prescriptions.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 10 }}>Đơn thuốc ({prescriptions.length} loại)</div>
                    {prescriptions.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span>{p.medicine_name} × {p.Quantity} {p.Unit}</span>
                        <span style={{ fontWeight: 600 }}>{((p.Price || 0) * p.Quantity).toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Thanh toán */}
              <div>
                <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#c0392b', marginBottom: 16 }}>Tính viện phí</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>Phí khám (VNĐ)</label>
                      <input type="number" value={form.exam_fee} onChange={e => setForm(f => ({ ...f, exam_fee: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>Tiền thuốc (VNĐ)</label>
                      <input type="number" value={form.medicine_total} onChange={e => setForm(f => ({ ...f, medicine_total: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>Loại BHYT</label>
                      <select value={form.insurance_type} onChange={e => setForm(f => ({ ...f, insurance_type: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                        {Object.entries(BHYT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: 13 }}>Hình thức thanh toán</label>
                      <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                        {['Tiền mặt', 'Chuyển khoản', 'QR Code'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.transfer_ticket} onChange={e => setForm(f => ({ ...f, transfer_ticket: e.target.checked }))} />
                      Có giấy chuyển tuyến hợp lệ
                    </label>
                  </div>

                  {/* Bảng tính tiền */}
                  {billing && (
                    <div style={{ background: billing.isFree ? '#d4edda' : '#f8f9fa', border: `2px solid ${billing.isFree ? '#28a745' : '#dee2e6'}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                      <table style={{ width: '100%', fontSize: 14 }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 0', color: '#666' }}>Tổng chi phí:</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{billing.total.toLocaleString('vi-VN')} đ</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', color: '#666' }}>BHYT thanh toán ({billing.coveragePct}%):</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#27ae60' }}>{billing.bhytPay.toLocaleString('vi-VN')} đ</td>
                          </tr>
                          <tr style={{ borderTop: '2px solid #dee2e6' }}>
                            <td style={{ padding: '8px 0 4px', fontWeight: 700, fontSize: 15 }}>Bệnh nhân trả:</td>
                            <td style={{ textAlign: 'right', fontWeight: 900, fontSize: 18, color: billing.isFree ? '#27ae60' : '#c0392b' }}>
                              {billing.patientPay.toLocaleString('vi-VN')} đ
                              {billing.isFree && ' (MIỄN PHÍ)'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {billing.isFree && (
                        <div style={{ marginTop: 10, textAlign: 'center', fontWeight: 700, color: '#155724', fontSize: 14 }}>
                          BHYT K3 + Chuyển tuyến → Miễn phí 100%
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={handleCheckout}
                    style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15,
                      background: billing?.isFree ? '#27ae60' : '#c0392b', color: '#fff' }}>
                    {billing?.isFree ? 'XÁC NHẬN BHYT 100% & IN PHIẾU LĨNH THUỐC' : 'CHỐT HÓA ĐƠN & THANH TOÁN'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#c0392b', color: '#fff' }}>
                {['#', 'Bệnh nhân', 'BHYT', 'Chuyển tuyến', 'Tổng phí', 'BN trả', 'Miễn phí', 'Phiếu thuốc', 'Ngày'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #eee', background: inv.is_free ? '#f0fff4' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '8px' }}>{inv.InvoiceID}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{inv.patient_name}</td>
                  <td style={{ padding: '8px' }}>{inv.insurance_type}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{inv.transfer_ticket ? '✓' : '-'}</td>
                  <td style={{ padding: '8px' }}>{((inv.ExamFee || 0) + (inv.MedicineTotal || 0)).toLocaleString('vi-VN')}đ</td>
                  <td style={{ padding: '8px', fontWeight: 700, color: inv.is_free ? '#27ae60' : '#c0392b' }}>{(inv.TotalAmount || 0).toLocaleString('vi-VN')}đ</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{inv.is_free ? <span style={{ color: '#27ae60', fontWeight: 700 }}>100%</span> : '-'}</td>
                  <td style={{ padding: '8px', fontSize: 11 }}>{inv.drug_voucher || '-'}</td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{inv.CreatedAt ? new Date(inv.CreatedAt).toLocaleDateString('vi-VN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices.length && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chưa có lịch sử thanh toán</div>}
        </div>
      )}

      {/* Phiếu thanh toán / Phiếu lĩnh thuốc */}
      {showReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 400, maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #c0392b', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, color: '#c0392b', marginBottom: 16 }}>
              {showReceipt.isFree ? 'PHIẾU LĨNH THUỐC MIỄN PHÍ' : 'PHIẾU THU VIỆN PHÍ'}
            </div>
            <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
              <tbody>
                {[['Bệnh nhân', showReceipt.patient_name], ['Mã phiếu thuốc', showReceipt.drugVoucher || '-'], ['BHYT', showReceipt.insurance_type], ['Chuyển tuyến', showReceipt.transfer_ticket ? 'Có' : 'Không'], ['Tổng phí', `${((parseFloat(showReceipt.exam_fee) || 0) + (parseFloat(showReceipt.medicine_total) || 0)).toLocaleString('vi-VN')} đ`], ['BHYT trả', `${showReceipt.bhytCoverage?.toLocaleString('vi-VN') || 0} đ`], ['Bệnh nhân trả', `${showReceipt.totalAmount?.toLocaleString('vi-VN') || 0} đ`]].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: '#666', width: 120 }}>{k}:</td>
                    <td style={{ padding: '4px 0', fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showReceipt.isFree && (
              <div style={{ background: '#d4edda', border: '2px solid #28a745', borderRadius: 6, padding: '10px', textAlign: 'center', color: '#155724', fontWeight: 700, marginBottom: 16 }}>
                BHYT K3 - MIỄN PHÍ 100%<br />
                <span style={{ fontSize: 12, fontWeight: 400 }}>Mang phiếu này ra quầy thuốc để nhận thuốc miễn phí</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>In phiếu</button>
              <button onClick={() => setShowReceipt(null)} style={{ padding: '8px 20px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordCard({ record, onOpen, status }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div>
        <div style={{ fontWeight: 700 }}>{record.patient_name}</div>
        <div style={{ fontSize: 13, color: '#666' }}>Chẩn đoán: {record.Diagnosis}</div>
        <div style={{ fontSize: 13, color: '#666' }}>BHYT: {record.insurance_type} {record.transfer_ticket ? '| Chuyển tuyến ✓' : ''}</div>
        {record.bhyt_stamp && <span style={{ fontSize: 11, background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{record.bhyt_stamp}</span>}
      </div>
      <button onClick={() => onOpen(record)}
        style={{ padding: '8px 18px', background: status === 'stamp' ? '#e67e22' : '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {status === 'stamp' ? 'Đóng mộc & Thu tiền' : 'Thu tiền'}
      </button>
    </div>
  );
}