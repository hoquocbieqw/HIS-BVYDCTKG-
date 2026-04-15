import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const HOSPITAL_MAP = [
  { id: 'main', name: 'Sảnh tiếp nhận / Lễ tân', x: 50, y: 60, w: 120, h: 50, color: '#3498db', desc: 'Lấy số, đăng ký khám' },
  { id: 'acup', name: 'Khoa Châm cứu', x: 220, y: 60, w: 110, h: 50, color: '#e74c3c', desc: 'Châm cứu, điện châm' },
  { id: 'rehab', name: 'Khoa PHCN', x: 380, y: 60, w: 110, h: 50, color: '#9b59b6', desc: 'Vật lý trị liệu, kéo cột sống' },
  { id: 'exam', name: 'Phòng khám', x: 50, y: 160, w: 120, h: 50, color: '#27ae60', desc: 'Khám bệnh, lập bệnh án' },
  { id: 'xray', name: 'X-Quang', x: 220, y: 160, w: 110, h: 50, color: '#f39c12', desc: 'Chẩn đoán hình ảnh' },
  { id: 'inpatient', name: 'Nội tổng hợp', x: 380, y: 160, w: 110, h: 50, color: '#1abc9c', desc: 'Điều trị nội trú' },
  { id: 'cashier', name: 'Quầy thu viện phí', x: 50, y: 260, w: 120, h: 50, color: '#e67e22', desc: 'Thanh toán, BHYT' },
  { id: 'pharmacy', name: 'Quầy Dược', x: 220, y: 260, w: 110, h: 50, color: '#2980b9', desc: 'Nhận thuốc đông y' },
  { id: 'lab', name: 'Xét nghiệm', x: 380, y: 260, w: 110, h: 50, color: '#8e44ad', desc: 'Sinh hóa, huyết học' },
];

export default function PatientHistory() {
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('ticket');
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const r = await axios.get(`${API}/appointments`, getAuth());
      // Lọc lịch hẹn của bệnh nhân hiện tại (dựa trên PatientID hoặc username)
      setAppointments(r.data.slice(0, 20)); // Demo: show recent
    } catch {}

    try {
      // Nếu có PatientID, lấy hồ sơ đầy đủ
      if (userId) {
        const r2 = await axios.get(`${API}/patients`, getAuth());
        if (r2.data.length > 0) {
          const myPatient = r2.data[0]; // Demo: lấy bệnh nhân đầu tiên
          const r3 = await axios.get(`${API}/patients/${myPatient.PatientID}/health-profile`, getAuth());
          setProfile(r3.data);
        }
      }
    } catch {}
  };

  const myAppointments = appointments.filter(a => a.PatientID);

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ color: '#c0392b', marginBottom: 4 }}>Hồ Sơ Sức Khỏe Cá Nhân</h2>
      <div style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Theo dõi lịch khám, phiếu khám và tiến trình điều trị của bạn</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['ticket', 'Phiếu khám & Lịch hẹn'], ['history', 'Lịch sử bệnh án'], ['map', 'Sơ đồ bệnh viện']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === key ? '#c0392b' : '#eee', color: tab === key ? '#fff' : '#333', fontWeight: tab === key ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'ticket' && (
        <div>
          {/* Phiếu khám hiện tại */}
          {myAppointments.filter(a => a.status_flow !== 'paid' && a.status_flow !== 'cancelled').length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#c0392b', marginBottom: 12 }}>Phiếu khám hôm nay</div>
              {myAppointments.filter(a => a.status_flow !== 'paid' && a.status_flow !== 'cancelled').map(a => (
                <ExamTicketCard key={a.AppointmentID} appt={a} />
              ))}
            </div>
          )}

          {/* Lịch hẹn sắp tới */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#2980b9', marginBottom: 12 }}>Lịch sử đặt khám</div>
            {!myAppointments.length && (
              <div style={{ textAlign: 'center', padding: 40, color: '#999', border: '2px dashed #ddd', borderRadius: 8 }}>
                Bạn chưa có lịch khám nào
              </div>
            )}
            {myAppointments.map(a => (
              <div key={a.AppointmentID} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 14, marginBottom: 10, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Phiếu: {a.exam_ticket || '-'} | STT: {a.queue_number || '-'}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Khoa: {a.Department} | BHYT: {a.insurance_type}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{a.DateTime ? new Date(a.DateTime).toLocaleString('vi-VN') : '-'}</div>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: a.status_flow === 'paid' ? '#d4edda' : a.status_flow === 'called' ? '#fff3cd' : a.is_approved ? '#cce5ff' : '#f8d7da',
                  color: a.status_flow === 'paid' ? '#155724' : a.status_flow === 'called' ? '#856404' : a.is_approved ? '#004085' : '#721c24' }}>
                  {a.status_flow === 'paid' ? 'Hoàn thành' : a.status_flow === 'called' ? 'Đang gọi' : a.is_approved ? 'Đã duyệt' : 'Chờ duyệt'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {!profile?.medicalHistory?.length && (
            <div style={{ textAlign: 'center', padding: 60, color: '#999', border: '2px dashed #ddd', borderRadius: 8 }}>
              Chưa có hồ sơ bệnh án nào
            </div>
          )}
          {profile?.medicalHistory?.map(record => (
            <div key={record.RecordID} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 14, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#c0392b' }}>Ngày khám: {record.visit_date ? new Date(record.visit_date).toLocaleDateString('vi-VN') : '-'}</div>
                {record.IsPaid >= 1 && <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>Đã thanh toán</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                {[['Chẩn đoán', record.Diagnosis], ['ICD-10', record.ICD10 || '-'], ['Bác sĩ', record.doctor_name], ['Liệu trình', record.TreatmentPlan || '-'], ['Khoa', record.Department], ['BHYT', record.insurance_type]].map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: '#888' }}>{k}: </span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              {record.bhyt_stamp && (
                <div style={{ marginTop: 10, display: 'inline-block', background: '#d4edda', padding: '3px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#155724' }}>
                  {record.bhyt_stamp}
                </div>
              )}
              {record.is_free && (
                <div style={{ marginTop: 6, display: 'inline-block', marginLeft: 8, background: '#cce5ff', padding: '3px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#004085' }}>
                  Miễn phí 100%
                </div>
              )}
              {record.Notes && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, fontSize: 13, color: '#555' }}>
                  {record.Notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'map' && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#c0392b' }}>Sơ đồ Bệnh viện Y Dược Cổ Truyền Kiên Giang</div>
          <div style={{ position: 'relative', background: '#f8f9fa', border: '2px solid #dee2e6', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <svg width="100%" viewBox="0 0 550 350" style={{ display: 'block' }}>
              {/* Nền tòa nhà */}
              <rect x="30" y="40" width="490" height="300" rx="10" fill="#fff" stroke="#bbb" strokeWidth="2" />
              <text x="275" y="30" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#c0392b">BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</text>

              {/* Các phòng */}
              {HOSPITAL_MAP.map(room => (
                <g key={room.id} onMouseEnter={() => setHoveredRoom(room)} onMouseLeave={() => setHoveredRoom(null)} style={{ cursor: 'pointer' }}>
                  <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="6" fill={room.color} fillOpacity={hoveredRoom?.id === room.id ? 0.95 : 0.8} stroke={room.color} strokeWidth="1.5" />
                  <foreignObject x={room.x + 4} y={room.y + 4} width={room.w - 8} height={room.h - 8}>
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 10, color: '#fff', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                      {room.name}
                    </div>
                  </foreignObject>
                </g>
              ))}

              {/* Hành lang */}
              <rect x="30" y="120" width="490" height="30" fill="#ecf0f1" opacity="0.7" />
              <text x="275" y="140" textAnchor="middle" fontSize="11" fill="#7f8c8d">Hành lang</text>
              <rect x="30" y="220" width="490" height="30" fill="#ecf0f1" opacity="0.7" />
              <text x="275" y="240" textAnchor="middle" fontSize="11" fill="#7f8c8d">Hành lang</text>

              {/* Cổng vào */}
              <rect x="230" y="318" width="90" height="20" rx="4" fill="#2c3e50" />
              <text x="275" y="332" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">Cổng vào chính</text>
            </svg>
          </div>

          {hoveredRoom && (
            <div style={{ background: hoveredRoom.color, color: '#fff', padding: '10px 16px', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>{hoveredRoom.name}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{hoveredRoom.desc}</div>
            </div>
          )}

          {/* Hướng dẫn quy trình */}
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 12 }}>Quy trình khám bệnh</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {['Sảnh tiếp nhận', 'Phòng khám', 'X-Quang (nếu cần)', 'Châm cứu / PHCN', 'Quầy thu viện phí', 'Quầy Dược'].map((step, i) => (
                <React.Fragment key={step}>
                  <div style={{ background: '#c0392b', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{i + 1}. {step}</div>
                  {i < 5 && <span style={{ color: '#c0392b', fontSize: 18, fontWeight: 700 }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamTicketCard({ appt }) {
  return (
    <div style={{ border: '3px solid #c0392b', borderRadius: 12, padding: 20, marginBottom: 14, background: 'linear-gradient(135deg, #fff5f5, #fff)', boxShadow: '0 4px 12px rgba(192,57,43,0.15)' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#888' }}>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#c0392b', marginTop: 4 }}>PHIẾU KHÁM BỆNH</div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#666' }}>Số thứ tự</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: '#c0392b', lineHeight: 1 }}>{appt.queue_number}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Mã phiếu: {appt.exam_ticket}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
        {[['Khoa', appt.Department], ['BHYT', appt.insurance_type], ['Chuyển tuyến', appt.transfer_ticket ? 'Có' : 'Không'], ['Giờ khám', appt.DateTime ? new Date(appt.DateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-']].map(([k, v]) => (
          <div key={k} style={{ background: '#f8f9fa', padding: '6px 10px', borderRadius: 6 }}>
            <div style={{ color: '#888', fontSize: 11 }}>{k}</div>
            <div style={{ fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
      {appt.insurance_type === 'K3' && appt.transfer_ticket && (
        <div style={{ marginTop: 12, textAlign: 'center', background: '#d4edda', padding: '8px', borderRadius: 6, color: '#155724', fontWeight: 700 }}>
          BHYT K3 - MIỄN PHÍ 100%
        </div>
      )}
      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: '#aaa' }}>
        Vui lòng giữ phiếu và chờ gọi số tại khoa khám
      </div>
    </div>
  );
}