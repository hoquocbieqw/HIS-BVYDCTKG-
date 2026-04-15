import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from './logo.png'; 

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Patient'); 
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/register', {
                username,
                password,
                role
            });
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login'); 
        } catch (err) {
            alert('Lỗi đăng ký: ' + (err.response?.data?.message || 'Tên đăng nhập đã tồn tại hoặc có lỗi xảy ra!'));
        }
    };

    const styles = {
        wrapper: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh', 
            backgroundColor: 'transparent',
            fontFamily: 'Arial, sans-serif'
        },
        card: {
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(255, 51, 102, 0.1)',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            margin: '40px auto'
        },
        logoContainer: {
            marginBottom: '15px'
        },
        logo: {
            width: '220px', /* Đã tăng kích thước lên 220px */
            height: 'auto',
            objectFit: 'contain'
        },
        title: {
            color: '#ff4081',
            fontSize: '24px',
            fontWeight: '800',
            marginBottom: '30px',
            textTransform: 'uppercase',
            borderBottom: '2px solid #FFCCCC',
            paddingBottom: '15px'
        },
        formGroup: {
            textAlign: 'left',
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            fontWeight: 'bold',
            color: '#333', 
            marginBottom: '8px',
            fontSize: '15px'
        },
        input: {
            width: '100%',
            padding: '15px',
            border: '2px solid #FFCCCC',
            borderRadius: '8px',
            backgroundColor: '#fff5f7', 
            fontSize: '16px',
            boxSizing: 'border-box',
            outline: 'none',
            color: '#333'
        },
        button: {
            width: '100%',
            padding: '18px',
            backgroundColor: '#ff4081',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            marginTop: '10px',
            transition: '0.3s'
        },
        footer: {
            marginTop: '25px',
            color: '#666',
            fontSize: '15px'
        },
        link: {
            color: '#ff4081',
            textDecoration: 'none',
            fontWeight: 'bold'
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                
                <div style={styles.logoContainer}>
                    <img src={logoImg} alt="Pinocchio Logo" style={styles.logo} />
                </div>

                <h2 style={styles.title}>ĐĂNG KÝ TÀI KHOẢN</h2>

                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tên đăng nhập:</label>
                        <input 
                            type="text" 
                            style={styles.input}
                            placeholder="Nhập tên đăng nhập" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mật khẩu:</label>
                        <input 
                            type="password" 
                            style={styles.input}
                            placeholder="Nhập mật khẩu" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Vai trò (Role):</label>
                        <select 
                            style={styles.input}
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="Patient">Bệnh nhân</option>
                            <option value="Doctor">Bác sĩ</option>
                            <option value="Nurse">Y tá</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    <button type="submit" style={styles.button}>
                        Đăng ký
                    </button>
                </form>

                <div style={styles.footer}>
                    <span>Bạn đã có tài khoản? </span>
                    <Link to="/login" style={styles.link}>
                        Đăng nhập ngay
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;