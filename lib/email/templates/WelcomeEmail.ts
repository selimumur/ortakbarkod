export const WelcomeEmailTemplate = (name: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>OrtakBarkod'a Hoş Geldiniz</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563EB; margin: 0;">OrtakBarkod</h1>
        <p style="color: #666; font-size: 14px;">E-Ticaret Operasyon Merkezi</p>
    </div>

    <div style="background-color: #f9fafb; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827; margin-top: 0;">Hoş Geldiniz, ${name}!</h2>
        <p>Aramıza katıldığınız için çok mutluyuz. OrtakBarkod ile e-ticaret operasyonlarınızı tek bir merkezden yönetmeye başlamak için hazırsınız.</p>
        
        <p>Sizler için yapabileceklerimiz:</p>
        <ul style="color: #4B5563;">
            <li>Pazaryeri entegrasyonlarını yapın (Trendyol, Hepsiburada).</li>
            <li>Ürünlerinizi eşleştirin ve stok takibini otomatikleştirin.</li>
            <li>Kâr ve maliyet analizlerinizi raporlayın.</li>
        </ul>

        <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
            <a href="${dashboardUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Panale Git</a>
        </div>

        <p style="font-size: 14px; color: #6B7280;">Herhangi bir sorunuz olursa, bu e-postayı yanıtlayarak bize ulaşabilirsiniz.</p>
    </div>

    <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="font-size: 12px; color: #9CA3AF;">© ${new Date().getFullYear()} OrtakBarkod Teknoloji A.Ş. Tüm hakları saklıdır.</p>
    </div>

</body>
</html>
`;
