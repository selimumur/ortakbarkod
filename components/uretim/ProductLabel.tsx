import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ProductLabelProps {
    productName: string;
    productCode: string;
    packageCount: number;
    totalPackages: number;
    dimensions?: {
        width?: number;
        length?: number;
        height?: number;
        desi?: number;
        weight?: number;
    };
    qrData: string;
    date: string;
}

export const ProductLabel: React.FC<ProductLabelProps> = ({
    productName,
    productCode,
    packageCount,
    totalPackages,
    dimensions,
    qrData,
    date
}) => {
    return (
        <div style={{
            width: '100mm',
            height: '100mm',
            border: '2px solid black',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'white'
        }}>
            {/* Header: Product Code */}
            <div style={{
                height: '15%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '2px solid black',
                fontSize: '24px',
                fontWeight: 'bold'
            }}>
                {productCode}
            </div>

            {/* Spacer */}
            <div style={{ height: '10%', borderBottom: '2px solid black' }}></div>

            {/* Table Header */}
            <div style={{
                display: 'flex',
                height: '10%',
                borderBottom: '1px solid black',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center'
            }}>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>PAKET</div>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>EN</div>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>BOY</div>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>YÜKSEKLİK</div>
                <div style={{ flex: 1 }}>DESİ</div>
            </div>

            {/* Table Row */}
            <div style={{
                display: 'flex',
                height: '15%',
                borderBottom: '2px solid black',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                textAlign: 'center'
            }}>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>{packageCount} / {totalPackages}</div>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>{dimensions?.width || '-'}</div>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>{dimensions?.length || '-'}</div>
                <div style={{ flex: 1, borderRight: '1px solid black' }}>{dimensions?.height || '-'}</div>
                <div style={{ flex: 1 }}>{dimensions?.desi || '-'}</div>
            </div>

            {/* Footer Area with QR */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row'
            }}>
                {/* Left Side Info */}
                <div style={{
                    flex: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '2px solid black'
                }}>
                    <div style={{
                        flex: 1,
                        borderBottom: '1px solid black',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '2px'
                    }}>
                        DETAYLAR İÇİN QR KODU OKUTUNUZ
                    </div>
                    <div style={{
                        flex: 2,
                        borderBottom: '1px solid black',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                    }}>
                        <div style={{ fontWeight: 'bold' }}>{productName}</div>
                        <div>{date}</div>
                    </div>
                    <div style={{
                        flex: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}>
                        <div>www.mobilyafirsat.com</div>
                        <div>0 543 650 00 17</div>
                    </div>
                </div>

                {/* Right Side QR */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px'
                }}>
                    <QRCodeSVG value={qrData} size={90} />
                </div>
            </div>
        </div>
    );
};
