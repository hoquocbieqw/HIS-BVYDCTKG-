import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TECHNIQUE_OPTIONS = ['Châm cứu', 'Điện châm', 'Xoa bóp bấm huyệt', 'Kéo cột sống cổ', 'Kéo cột sống thắt lưng', 'Cấy chỉ', 'Xông hơi thuốc', 'Dưỡng sinh'];
const ICD10_COMMON = [
  { code: 'M54.2', name: 'Đau cổ' }, { code: 'M54.5', name: 'Đau thắt lưng' },
  { code: 'M47.8', name: 'Thoái hóa cột sống' }, { code: 'M51.1', name: 'Thoát vị đĩa đệm' },
  { code: 'M79.3', name: 'Đau khớp vai' }, { code: 'M16', name: 'Thoái hóa khớp háng' },
  { code: 'G54.2', name: 'Đau dây thần kinh' }, { code: 'M25.5', name: 'Đau khớp' },
];

export default function MedicalRecords() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [records, setRecords] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ diagnosis: '', icd10: '', treatment_plan: '', notes: '', exam_fee: 150000 });
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrint, setShowPrint] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    axios.get(`${API}/appointments/queue`, getAuth()).then(r => setQueue(r.data)).catch(() => {});
    axios.get(`${API}/medical-records`, getAuth()).then(r => setRecords(r.data)).catch(() => {});
    axios.get(`${API}/medicines`, getAuth()).then(r => setMedicines(r.data)).catch(() => {});
  };

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const openExam = (appt) => {
    setSelected(appt);
    setForm({ diagnosis: '', icd10: '', treatment_plan: '', notes: '', exam_fee: 150000 });
    setPrescriptions([]);
    setTab('exam');
  };

  const handleSave = async () => {
    if (!form.diagnosis) { notify('Vui lòng nhập chẩn đoán'); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/medical-records`, {
        appointment_id: selected.AppointmentID,
        patient_id: selected.PatientID,
        ...form
      }, getAuth());

      if (prescriptions.length > 0) {
        await axios.post(`${API}/prescriptions`, { record_id: res.data.recordId, items: prescriptions }, getAuth());
      }

      notify('Lưu bệnh án thành công');
      setShowPrint({ ...selected, ...form, recordId: res.data.recordId, prescriptions });
      loadAll();
    } catch (e) {
      notify(e.response?.data?.error || 'Lỗi lưu bệnh án');
    }
    setSaving(false);
  };

  const addPrescriptionItem = () => {
    setPrescriptions(p => [...p, { medicine_id: '', quantity: 1, dosage: '', instructions: '' }]);
  };

  const updatePrescription = (idx, key, val) => {
    setPrescriptions(p => p.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };

  const removePrescription = (idx) => {
    setPrescriptions(p => p.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#c0392b', marginBottom: 4 }}>Phòng Khám Bệnh - Bệnh Án Điện Tử</h2>
      {msg && <div style={{ background: '#d4edda', color: '#155724', padding: '8px 16px', borderRadius: 6, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['queue', `Hàng đợi (${queue.length})`], ['exam', 'Phòng khám'], ['records', 'Lịch sử bệnh án']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === key ? '#c0392b' : '#eee', color: tab === key ? '#fff' : '#333', fontWeight: tab === key ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div>
          <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>Danh sách bệnh nhân đã được lễ tân duyệt - chờ khám hôm nay</div>
          {!queue.length && <div style={{ textAlign: 'center', padding: 60, color: '#999', border: '2px dashed #ddd', borderRadius: 8 }}>Chưa có bệnh nhân trong hàng đợi</div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {queue.map(a => (
              <div key={a.AppointmentID} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 16, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#c0392b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, flexShrink: 0 }}>
                  {a.queue_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.patient_name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Phiếu: {a.exam_ticket} | Khoa: {a.Department}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>BHYT: {a.insurance_type} {a.transfer_ticket ? '| Chuyển tuyến ✓' : ''}</div>
                  {a.status_flow === 'called' && <span style={{ fontSize: 12, background: '#f39c12', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>Đang gọi</span>}
                </div>
                <button onClick={() => openExam(a)} style={{ padding: '10px 22px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Khám bệnh
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'exam' && (
        <div>
          {!selected ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              Chọn bệnh nhân từ tab <strong>Hàng đợi</strong> để bắt đầu khám
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
              {/* Thông tin bệnh nhân */}
              <div>
                <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#c0392b', marginBottom: 12 }}>Thông tin bệnh nhân</div>
                  {[['Họ tên', selected.patient_name], ['Phiếu khám', selected.exam_ticket], ['STT', selected.queue_number], ['Khoa', selected.Department], ['BHYT', selected.insurance_type], ['Chuyển tuyến', selected.transfer_ticket ? 'Có' : 'Không'], ['Điện thoại', selected.Phone]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: '#666', width: 90 }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v || '-'}</span>
                    </div>
                  ))}
                  {selected.insurance_type === 'K3' && selected.transfer_ticket && (
                    <div style={{ marginTop: 10, background: '#d4edda', padding: '6px 12px', borderRadius: 6, color: '#155724', fontWeight: 700, fontSize: 13 }}>
                      BHYT K3 + Chuyển tuyến → Miễn phí 100%
                    </div>
                  )}
                </div>

                {/* Đơn thuốc */}
                <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, color: '#c0392b' }}>Đơn thuốc đông y</div>
                    <button onClick={addPrescriptionItem} style={{ padding: '4px 12px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>+ Thêm thuốc</button>
                  </div>
                  {prescriptions.map((item, idx) => (
                    <div key={idx} style={{ border: '1px solid #eee', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 8, marginBottom: 6 }}>
                        <select value={item.medicine_id} onChange={e => updatePrescription(idx, 'medicine_id', e.target.value)}
                          style={{ padding: '6px', border: '1px solid #ddd', borderRadius: 4, width: '100%' }}>
                          <option value="">-- Chọn thuốc --</option>
                          {medicines.map(m => <option key={m.MedicineID} value={m.MedicineID}>{m.Name} ({m.Unit}) - Tồn: {m.StockQuantity}</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updatePrescription(idx, 'quantity', e.target.value)}
                          style={{ padding: '6px', border: '1px solid #ddd', borderRadius: 4 }} placeholder="SL" />
                      </div>
                      <input value={item.dosage} onChange={e => updatePrescription(idx, 'dosage', e.target.value)}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 4, marginBottom: 6, boxSizing: 'border-box' }} placeholder="Liều dùng (vd: 2 lần/ngày)" />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={item.instructions} onChange={e => updatePrescription(idx, 'instructions', e.target.value)}
                          style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: 4 }} placeholder="Cách dùng (vd: Uống sau ăn)" />
                        <button onClick={() => removePrescription(idx)} style={{ padding: '4px 8px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>×</button>
                      </div>
                    </div>
                  ))}
                  {!prescriptions.length && <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Chưa có thuốc trong đơn</div>}
                </div>
              </div>

              {/* Form khám */}
              <div>
                <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#c0392b', marginBottom: 16 }}>Bệnh Án Điện Tử (EMR)</div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Chẩn đoán bệnh *</label>
                    <textarea value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} rows={2}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
                      placeholder="Nhập chẩn đoán lâm sàng..." />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Mã ICD-10</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={form.icd10} onChange={e => setForm(f => ({ ...f, icd10: e.target.value }))}
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }} placeholder="Nhập hoặc chọn mã ICD-10" />
                      <select onChange={e => { if (e.target.value) setForm(f => ({ ...f, icd10: e.target.value })); }}
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: 6 }}>
                        <option value="">Chọn nhanh</option>
                        {ICD10_COMMON.map(i => <option key={i.code} value={i.code}>{i.code} - {i.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Chỉ định liệu trình YHCT</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {TECHNIQUE_OPTIONS.map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, treatment_plan: f.treatment_plan ? f.treatment_plan + ', ' + t : t }))}
                          style={{ padding: '4px 10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 16, cursor: 'pointer', fontSize: 12 }}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <textarea value={form.treatment_plan} onChange={e => setForm(f => ({ ...f, treatment_plan: e.target.value }))} rows={3}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
                      placeholder="Chỉ định liệu trình điều trị..." />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Ghi chú lâm sàng</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
                      placeholder="Bệnh sử, triệu chứng, kết quả thăm khám..." />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Phí khám (VNĐ)</label>
                    <input type="number" value={form.exam_fee} onChange={e => setForm(f => ({ ...f, exam_fee: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setSelected(null)} style={{ flex: 1, padding: '10px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                      Trở lại
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>
                      {saving ? 'Đang lưu...' : 'Lưu bệnh án & Xuất phiếu'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#c0392b', color: '#fff' }}>
                {['#', 'Bệnh nhân', 'Chẩn đoán', 'ICD-10', 'Liệu trình', 'Mộc BHYT', 'Ngày khám'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.RecordID} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '8px' }}>{r.RecordID}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{r.patient_name}</td>
                  <td style={{ padding: '8px' }}>{r.Diagnosis}</td>
                  <td style={{ padding: '8px' }}>{r.ICD10 || '-'}</td>
                  <td style={{ padding: '8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.TreatmentPlan || '-'}</td>
                  <td style={{ padding: '8px' }}>
                    {r.bhyt_stamp ? <span style={{ background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{r.bhyt_stamp}</span> : '-'}
                  </td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString('vi-VN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chưa có bệnh án nào</div>}
        </div>
      )}

      {/* In phiếu khám */}
      {showPrint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 420, maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #c0392b', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</div>
              <div style={{ color: '#666', fontSize: 12 }}>Số 64 Đống Đa, Phường Rạch Giá, An Giang</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#c0392b' }}>PHIẾU KHÁM BỆNH</div>
              <div style={{ fontSize: 13, color: '#888' }}>Ngày: {new Date().toLocaleDateString('vi-VN')}</div>
            </div>
            <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
              <tbody>
                {[['Bệnh nhân', showPrint.patient_name], ['Phiếu khám', showPrint.exam_ticket], ['STT', showPrint.queue_number], ['Khoa', showPrint.Department], ['BHYT', showPrint.insurance_type], ['Chuyển tuyến', showPrint.transfer_ticket ? 'Có' : 'Không'], ['Chẩn đoán', showPrint.diagnosis], ['ICD-10', showPrint.icd10 || '-'], ['Liệu trình', showPrint.treatment_plan || '-']].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: '#666', width: 110, verticalAlign: 'top' }}>{k}:</td>
                    <td style={{ padding: '4px 0', fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showPrint.prescriptions?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#c0392b' }}>Đơn thuốc đông y:</div>
                {showPrint.prescriptions.map((p, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4, paddingLeft: 12 }}>• Thuốc #{p.medicine_id} × {p.quantity} - {p.dosage}</div>
                ))}
              </div>
            )}
            {showPrint.insurance_type === 'K3' && showPrint.transfer_ticket && (
              <div style={{ margin: '16px 0', background: '#d4edda', padding: '8px 12px', borderRadius: 6, color: '#155724', fontWeight: 700, textAlign: 'center', border: '2px solid #28a745' }}>
                BHYT K3 - MIỄN PHÍ 100%
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888', margin: '12px 0' }}>
              Bệnh nhân mang phiếu này đến Y tá để đóng mộc BHYT, sau đó đến Thu ngân thanh toán
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>In phiếu</button>
              <button onClick={() => setShowPrint(null)} style={{ padding: '8px 20px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}