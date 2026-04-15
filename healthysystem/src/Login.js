import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from './logo.png'; 

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        try {
            const res = await axios.post('http://localhost:3001/api/login', { username, password });
            localStorage.setItem('token', res.data.token);
            if (onLogin) {
                onLogin(res.data.user);
            }
            navigate('/dashboard');
        } catch (err) {
            alert('Lỗi đăng nhập: ' + (err.response?.data?.message || 'Tài khoản hoặc mật khẩu không đúng!'));
        }
    };

    const styles = {
        wrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', backgroundColor: 'transparent', fontFamily: 'Arial, sans-serif' },
        card: { background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(255, 51, 102, 0.1)', width: '100%', maxWidth: '400px', textAlign: 'center', margin: '40px auto' },
        logoContainer: { marginBottom: '15px' },
        logo: { width: '220px', height: 'auto', objectFit: 'contain' },
        title: { color: '#ff4081', fontSize: '24px', fontWeight: '800', marginBottom: '30px', textTransform: 'uppercase', borderBottom: '2px solid #FFCCCC', paddingBottom: '15px' },
        formGroup: { textAlign: 'left', marginBottom: '20px' },
        label: { display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '8px', fontSize: '15px' },
        input: { width: '100%', padding: '15px', border: '2px solid #FFCCCC', borderRadius: '8px', backgroundColor: '#fff5f7', fontSize: '16px', boxSizing: 'border-box', outline: 'none', color: '#333' },
        button: { width: '100%', padding: '18px', backgroundColor: '#ff4081', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', marginTop: '10px', transition: '0.3s' },
        footer: { marginTop: '25px', color: '#666', fontSize: '15px' },
        link: { color: '#ff4081', textDecoration: 'none', fontWeight: 'bold' }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <div style={styles.logoContainer}>
                    <img src={logoImg} alt="Pinocchio Logo" style={styles.logo} />
                </div>
                <h1 style={styles.title}>ĐĂNG NHẬP HỆ THỐNG</h1>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tên đăng nhập:</label>
                        <input type="text" style={styles.input} placeholder="Nhập tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mật khẩu:</label>
                        <input type="password" style={styles.input} placeholder="Nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" style={styles.button}>Đăng nhập</button>
                </form>
                <div style={styles.footer}>
                    <span>Bạn chưa có tài khoản? </span>
                    <Link to="/register" style={styles.link}>Đăng ký ngay</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;