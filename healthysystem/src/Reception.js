import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:3001/api';
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const INSURANCE_LABELS = { 'K1': 'BHYT K1 (70%)', 'K2': 'BHYT K2 (80%)', 'K3': 'BHYT K3 (95-100%)', 'Không có': 'Tự chi trả' };

export default function Reception() {
  const [tab, setTab] = useState('pending');
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [showTicket, setShowTicket] = useState(null);
  const [calledQueue, setCalledQueue] = useState([]);
  const [msg, setMsg] = useState('');
  const [newPatient, setNewPatient] = useState({ full_name: '', cccd: '', date_of_birth: '', phone: '', address: '', health_insurance_id: '' });
  const [newAppt, setNewAppt] = useState({ patient_id: '', patient_name: '', department: 'Châm cứu', insurance_type: 'Không có', transfer_ticket: false, appointment_date: '', reason: '' });
  const printRef = useRef();

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    axios.get(`${API}/appointments`, getAuth()).then(r => setAppointments(r.data)).catch(() => {});
    axios.get(`${API}/patients`, getAuth()).then(r => setPatients(r.data)).catch(() => {});
  };

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const pending = appointments.filter(a => !a.is_approved && a.Status !== 'Đã hủy');
  const approved = appointments.filter(a => a.is_approved && a.status_flow !== 'paid');
  const called = appointments.filter(a => a.status_flow === 'called');

  const handleApprove = async (id) => {
    await axios.put(`${API}/appointments/${id}/approve`, {}, getAuth());
    notify('Đã duyệt lịch hẹn');
    loadData();
  };

  const handleCall = async (appt) => {
    await axios.put(`${API}/appointments/${appt.AppointmentID}/call`, {}, getAuth());
    setCalledQueue(prev => [...prev.filter(c => c.AppointmentID !== appt.AppointmentID), appt]);
    notify(`Đang gọi số ${appt.queue_number} - ${appt.patient_name}`);
    loadData();
  };

  const handleCancel = async (id) => {
    await axios.put(`${API}/appointments/${id}/status`, { status: 'Đã hủy', status_flow: 'cancelled' }, getAuth());
    notify('Đã hủy lịch hẹn');
    loadData();
  };

  const handleAddPatient = async () => {
    if (!newPatient.full_name) { notify('Vui lòng nhập họ tên'); return; }
    try {
      await axios.post(`${API}/patients`, newPatient, getAuth());
      notify('Đã thêm bệnh nhân mới');
      setShowAddPatient(false);
      setNewPatient({ full_name: '', cccd: '', date_of_birth: '', phone: '', address: '', health_insurance_id: '' });
      loadData();
    } catch (e) { notify(e.response?.data?.error || 'Lỗi thêm bệnh nhân'); }
  };

  const handleAddAppt = async () => {
    if (!newAppt.appointment_date) { notify('Vui lòng chọn ngày giờ khám'); return; }
    try {
      const res = await axios.post(`${API}/appointments`, newAppt, getAuth());
      notify(`Đặt lịch thành công - Phiếu: ${res.data.examTicket}`);
      setShowAddAppt(false);
      setNewAppt({ patient_id: '', patient_name: '', department: 'Châm cứu', insurance_type: 'Không có', transfer_ticket: false, appointment_date: '', reason: '' });
      loadData();
    } catch (e) { notify(e.response?.data?.error || 'Lỗi đặt lịch'); }
  };

  const handlePrintTicket = (appt) => { setShowTicket(appt); setTimeout(() => window.print(), 300); };

  const bhytColor = (type, transfer) => {
    if (type === 'K3' && transfer) return '#d4edda';
    if (type === 'K3') return '#cce5ff';
    if (type === 'K2') return '#fff3cd';
    if (type === 'K1') return '#fce8e8';
    return '#f8f9fa';
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#c0392b', marginBottom: 4 }}>Quầy Tiếp Nhận & Lễ Tân</h2>
      {msg && <div style={{ background: '#d4edda', color: '#155724', padding: '8px 16px', borderRadius: 6, marginBottom: 12 }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['pending', `Chờ duyệt (${pending.length})`], ['approved', `Đã duyệt (${approved.length})`], ['called', `Đang gọi (${called.length})`], ['all', 'Tất cả']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === key ? '#c0392b' : '#eee', color: tab === key ? '#fff' : '#333', fontWeight: tab === key ? 700 : 400 }}>
            {label}
          </button>
        ))}
        <button onClick={() => setShowAddPatient(true)}
          style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#27ae60', color: '#fff', marginLeft: 'auto' }}>
          + Thêm bệnh nhân
        </button>
        <button onClick={() => setShowAddAppt(true)}
          style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#2980b9', color: '#fff' }}>
          + Lập phiếu khám
        </button>
      </div>

      {/* Hiển thị số đang gọi */}
      {called.length > 0 && (
        <div style={{ background: '#fff3cd', border: '2px solid #f39c12', borderRadius: 8, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#e67e22' }}>Đang gọi:</span>
          {called.slice(-3).map(c => (
            <span key={c.AppointmentID} style={{ background: '#e67e22', color: '#fff', padding: '4px 16px', borderRadius: 20, fontWeight: 700, fontSize: 16 }}>
              STT {c.queue_number} - {c.patient_name}
            </span>
          ))}
        </div>
      )}

      {/* Danh sách */}
      <AppointmentTable
        data={tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'called' ? called : appointments}
        onApprove={handleApprove}
        onCall={handleCall}
        onCancel={handleCancel}
        onPrintTicket={handlePrintTicket}
        bhytColor={bhytColor}
      />

      {/* Modal thêm bệnh nhân */}
      {showAddPatient && (
        <Modal title="Thêm bệnh nhân mới" onClose={() => setShowAddPatient(false)}>
          {[['full_name', 'Họ và tên *', 'text'], ['cccd', 'Số CCCD', 'text'], ['date_of_birth', 'Ngày sinh', 'date'],
            ['phone', 'Số điện thoại', 'text'], ['address', 'Địa chỉ', 'text'], ['health_insurance_id', 'Số thẻ BHYT', 'text']].map(([key, label, type]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>{label}</label>
              <input type={type} value={newPatient[key]} onChange={e => setNewPatient(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddPatient(false)} style={btnStyle('#95a5a6')}>Hủy</button>
            <button onClick={handleAddPatient} style={btnStyle('#27ae60')}>Lưu bệnh nhân</button>
          </div>
        </Modal>
      )}

      {/* Modal lập phiếu khám */}
      {showAddAppt && (
        <Modal title="Lập phiếu khám mới" onClose={() => setShowAddAppt(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Chọn bệnh nhân có sẵn</label>
            <select value={newAppt.patient_id} onChange={e => setNewAppt(p => ({ ...p, patient_id: e.target.value, patient_name: '' }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
              <option value="">-- Bệnh nhân mới (nhập tên bên dưới) --</option>
              {patients.map(p => <option key={p.PatientID} value={p.PatientID}>{p.FullName} - {p.Phone}</option>)}
            </select>
          </div>
          {!newAppt.patient_id && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Họ tên bệnh nhân mới *</label>
              <input value={newAppt.patient_name} onChange={e => setNewAppt(p => ({ ...p, patient_name: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Khoa khám</label>
              <select value={newAppt.department} onChange={e => setNewAppt(p => ({ ...p, department: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                {['Châm cứu', 'Xoa bóp - Bấm huyệt', 'Phục hồi chức năng', 'Nội Tổng hợp', 'Khám chung'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Loại BHYT</label>
              <select value={newAppt.insurance_type} onChange={e => setNewAppt(p => ({ ...p, insurance_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                {Object.entries(INSURANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Ngày giờ khám *</label>
            <input type="datetime-local" value={newAppt.appointment_date} onChange={e => setNewAppt(p => ({ ...p, appointment_date: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={newAppt.transfer_ticket} onChange={e => setNewAppt(p => ({ ...p, transfer_ticket: e.target.checked }))} />
              Có giấy chuyển tuyến hợp lệ
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Lý do khám / Triệu chứng</label>
            <textarea value={newAppt.reason} onChange={e => setNewAppt(p => ({ ...p, reason: e.target.value }))} rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
          {newAppt.insurance_type === 'K3' && newAppt.transfer_ticket && (
            <div style={{ background: '#d4edda', padding: '8px 12px', borderRadius: 6, marginBottom: 12, color: '#155724', fontWeight: 600 }}>
              BHYT K3 + Chuyển tuyến → Miễn phí 100%
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddAppt(false)} style={btnStyle('#95a5a6')}>Hủy</button>
            <button onClick={handleAddAppt} style={btnStyle('#c0392b')}>Tạo phiếu khám</button>
          </div>
        </Modal>
      )}

      {/* Print ticket overlay */}
      {showTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={printRef} style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #c0392b', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</div>
              <div style={{ color: '#666', fontSize: 12 }}>Số 64 Đống Đa, Phường Rạch Giá, An Giang</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#c0392b' }}>PHIẾU KHÁM BỆNH</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#c0392b', textAlign: 'center', border: '3px solid #c0392b', borderRadius: 8, padding: '8px 0', marginBottom: 16 }}>
              STT: {showTicket.queue_number}
            </div>
            <table style={{ width: '100%', fontSize: 13 }}>
              <tbody>
                {[['Mã phiếu', showTicket.exam_ticket], ['Bệnh nhân', showTicket.patient_name], ['Khoa khám', showTicket.Department], ['Loại BHYT', INSURANCE_LABELS[showTicket.insurance_type] || showTicket.insurance_type], ['Chuyển tuyến', showTicket.transfer_ticket ? 'Có' : 'Không'], ['Thời gian', new Date(showTicket.DateTime).toLocaleString('vi-VN')]].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: '#666', width: 110 }}>{k}:</td>
                    <td style={{ padding: '4px 0', fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showTicket.insurance_type === 'K3' && showTicket.transfer_ticket && (
              <div style={{ marginTop: 12, background: '#d4edda', padding: '6px 12px', borderRadius: 6, color: '#155724', fontWeight: 700, textAlign: 'center' }}>
                BHYT K3 - MIỄN PHÍ 100%
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#888' }}>
              Vui lòng giữ phiếu này để theo dõi số thứ tự
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => window.print()} style={btnStyle('#c0392b')}>In phiếu</button>
              <button onClick={() => setShowTicket(null)} style={btnStyle('#95a5a6')}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentTable({ data, onApprove, onCall, onCancel, onPrintTicket, bhytColor }) {
  if (!data.length) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Không có lịch hẹn nào</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#c0392b', color: '#fff' }}>
            {['STT', 'Phiếu', 'Bệnh nhân', 'Khoa', 'BHYT', 'Chuyển tuyến', 'Giờ khám', 'Trạng thái', 'Thao tác'].map(h => (
              <th key={h} style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(a => (
            <tr key={a.AppointmentID} style={{ background: bhytColor(a.insurance_type, a.transfer_ticket), borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px', fontWeight: 700, fontSize: 18, color: '#c0392b' }}>{a.queue_number || '-'}</td>
              <td style={{ padding: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.exam_ticket || '-'}</td>
              <td style={{ padding: '8px' }}>{a.patient_name || '-'}</td>
              <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{a.Department}</td>
              <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{a.insurance_type}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{a.transfer_ticket ? '✓' : '-'}</td>
              <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{a.DateTime ? new Date(a.DateTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}</td>
              <td style={{ padding: '8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: a.status_flow === 'called' ? '#f39c12' : a.is_approved ? '#27ae60' : '#e74c3c',
                  color: '#fff' }}>
                  {a.status_flow === 'called' ? 'Đang gọi' : a.is_approved ? 'Đã duyệt' : 'Chờ duyệt'}
                </span>
              </td>
              <td style={{ padding: '8px' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {!a.is_approved && <button onClick={() => onApprove(a.AppointmentID)} style={btnSmall('#27ae60')}>Duyệt</button>}
                  {a.is_approved && a.status_flow !== 'called' && <button onClick={() => onCall(a)} style={btnSmall('#e67e22')}>Gọi số</button>}
                  <button onClick={() => onPrintTicket(a)} style={btnSmall('#2980b9')}>In phiếu</button>
                  {a.status_flow !== 'paid' && <button onClick={() => onCancel(a.AppointmentID)} style={btnSmall('#e74c3c')}>Hủy</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 460, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#c0392b' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const btnStyle = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 });
const btnSmall = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 });