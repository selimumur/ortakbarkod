import React from 'react';
import Barcode from 'react-barcode';

interface TrendyolExpressLabelProps {
    orderNumber: string;
    customerName: string;
    customerAddress: string;
    customerPhone?: string;
    trackingNumber: string;
    cargoProvider?: string;
    desi?: number;
    date?: string;
}

const TrendyolExpressLabel: React.FC<TrendyolExpressLabelProps> = ({
    orderNumber,
    customerName,
    customerAddress,
    customerPhone,
    trackingNumber,
    cargoProvider = "Trendyol Express",
    desi = 1,
    date = new Date().toLocaleDateString('tr-TR')
}) => {
    return (
        <div
            style={{
                width: '10cm',
                height: '10cm',
                backgroundColor: 'white',
                padding: '5mm',
                boxSizing: 'border-box',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #ccc', // Preview border, removed in print
                pageBreakAfter: 'always'
            }}
            className="print:border-0"
        >
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>TY EXPRESS</div>
                <div style={{ fontSize: '12px' }}>{date}</div>
            </div>

            {/* BODY */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* TRACKING BARCODE */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80px' }}>
                    <Barcode value={trackingNumber} width={2} height={50} fontSize={14} />
                </div>

                {/* SENDER / RECEIVER INFO */}
                <div style={{ display: 'flex', borderTop: '1px solid black', borderBottom: '1px solid black', flex: 1 }}>

                    {/* Receiver */}
                    <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>ALICI</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{customerName}</span>
                        <span style={{ fontSize: '11px', lineHeight: '1.4', flex: 1, overflow: 'hidden' }}>{customerAddress}</span>
                        {customerPhone && <span style={{ fontSize: '11px', marginTop: '4px' }}>Tel: {customerPhone}</span>}
                    </div>

                    {/* Sender & Meta */}
                    <div style={{ width: '35%', borderLeft: '1px solid black', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>DESİ</span>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{desi}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>SİPARİŞ NO</span>
                            <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>{orderNumber}</div>
                        </div>
                    </div>
                </div>

                {/* FOOTER / ZPL ZONE */}
                <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', padding: '10px' }}>
                    {customerName.split(' ')[0].substring(0, 3).toUpperCase()}-{trackingNumber.slice(-4)}
                </div>
            </div>
        </div>
    );
};

export default TrendyolExpressLabel;
