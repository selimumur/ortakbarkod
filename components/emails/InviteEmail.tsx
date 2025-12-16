import * as React from 'react';

interface InviteEmailProps {
    inviterName: string;
    role: string;
    inviteLink: string;
}

export const InviteEmail: React.FC<InviteEmailProps> = ({
    inviterName,
    role,
    inviteLink
}) => (
    <div style={{ fontFamily: 'sans-serif', lineHeight: '1.5' }}>
        <h2>Ekibe Davet Edildin!</h2>
        <p>Merhaba,</p>
        <p>
            <strong>{inviterName}</strong> seni OrtakBarkod üzerindeki organizasyonuna <strong>{role}</strong> olarak katılman için davet etti.
        </p>
        <p>
            Aşağıdaki linke tıklayarak hesabını oluşturabilir ve ekibe katılabilirsin:
        </p>
        <a href={inviteLink} style={{
            display: 'inline-block',
            backgroundColor: '#10B981',
            color: 'white',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
            marginTop: '20px'
        }}>
            Daveti Kabul Et
        </a>
        <p style={{ marginTop: '20px' }}>
            Link çalışmıyorsa: <br />
            <a href={inviteLink}>{inviteLink}</a>
        </p>
    </div>
);
