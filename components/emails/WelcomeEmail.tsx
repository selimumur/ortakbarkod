import * as React from 'react';

interface WelcomeEmailProps {
    firstName: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
    firstName,
}) => (
    <div style={{ fontFamily: 'sans-serif', lineHeight: '1.5' }}>
        <h1>Hoşgeldin, {firstName}!</h1>
        <p>OrtakBarkod ailesine katıldığın için çok mutluyuz.</p>
        <p>
            Hesabın başarıyla oluşturuldu. Artık e-ticaret operasyonlarını tek bir yerden yönetmeye başlayabilirsin.
        </p>
        <a href="https://ortakbarkod.com/dashboard" style={{
            display: 'inline-block',
            backgroundColor: '#2563EB',
            color: 'white',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
            marginTop: '20px'
        }}>
            Panele Git
        </a>
        <hr style={{ marginTop: '40px', border: 'none', borderTop: '1px solid #eaeaea' }} />
        <p style={{ fontSize: '12px', color: '#666' }}>
            Bu e-postayı OrtakBarkod üyesi olduğunuz için alıyorsunuz.
        </p>
    </div>
);
