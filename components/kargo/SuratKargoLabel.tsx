import React from 'react';
import ReactBarcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export const SuratKargoLabel = ({ order }: { order: any }) => {
    // Demo values if data is missing, matching the image style
    const tNo = order.cargo_tracking_number || "24974188220207";
    const sender = "BIGA FESTIVAL MOBILYA SAN. VE TIC. LTD. STI.";
    const receiverName = order.customer_name || "ALICI ADI SOYADI";
    const address = order.raw_data?.shipmentAddress?.fullAddress || "ADRES BILGISI BURAYA GELECEK...";
    const city = order.raw_data?.shipmentAddress?.city || "SEHIR";
    const district = order.raw_data?.shipmentAddress?.district || "ILCE";
    const phone = order.raw_data?.shipmentAddress?.phone || "536*******";
    const desi = order.desi || "27";
    const barcodeValue = order.cargo_tracking_number || "01119795808";

    // Delivery branch logic (simulated based on city)
    const transferCenter = `${city} AKTARMA`.toUpperCase();
    const deliveryBranch = "GUMUSLER"; // This would normally come from API, static for now or can be inferred

    return (
        <div className="surat-label border-2 border-black bg-white text-black font-sans box-border relative overflow-hidden"
            style={{ width: '100mm', height: '100mm', padding: '1mm', display: 'flex', flexDirection: 'column' }}>

            {/* 1. HEADER ROW: Sube, T.No */}
            <div className="flex justify-between items-end border-b border-black pb-0.5 mb-1 text-xs font-bold leading-none">
                <span className="uppercase">Sube: BIGA</span>
                <span className="text-sm">T.No: {tNo}</span>
            </div>

            {/* 2. SENDER ROW */}
            <div className="border border-black p-1 text-[10px] font-bold mb-1 leading-tight h-10 overflow-hidden uppercase">
                {sender}
                <br />
                <span className="text-[8px] font-normal">MUST.IRS.NO:</span>
                <div className="flex justify-end mt-0.5">
                    <span>TEL: 542*******</span>
                </div>
            </div>

            {/* 3. BARCODE SECTION (Vertical Bars logic is complex in CSS, using standard horizontal for now but rotated if needed, 
               image shows horizontal bars. Wait, image shows standard barcode.) */}
            <div className="flex flex-col items-center justify-center mb-1">
                <ReactBarcode value={barcodeValue} height={40} width={2.5} displayValue={true} fontSize={16} margin={0} />
            </div>

            {/* 4. RECIPIENT (ALICI) */}
            <div className="border border-black p-1 flex-1 relative mb-1">
                {/* Side Text: Siparis No */}
                <div className="absolute -left-3 top-10 -rotate-90 text-[8px] font-bold origin-center whitespace-nowrap">
                    Siparis No: {order.id} - {tNo}
                </div>
                <div className="absolute -left-3 bottom-5 -rotate-90 text-[10px] font-bold origin-center">ALICI</div>

                <div className="pl-4 h-full flex flex-col justify-between">
                    <div>
                        <div className="font-bold text-xs uppercase mb-0.5">{receiverName}</div>
                        <div className="text-[10px] font-bold uppercase leading-3 h-10 overflow-hidden break-words">
                            {address}
                        </div>
                    </div>
                    <div className="flex justify-between items-end text-[10px] font-bold mt-1">
                        <span>TEL: {phone}</span>
                        <span className="text-right">{district}/{city}</span>
                    </div>
                </div>
            </div>

            {/* 5. INFO ROW: OdemeTipi, Birim, Desi */}
            <div className="border-t border-b border-black flex text-[10px] font-bold mb-1 divide-x divide-black">
                <div className="flex-1 p-0.5 text-center">
                    <span className="block text-[8px] font-normal">OdemeTipi</span>
                    AT
                </div>
                <div className="flex-1 p-0.5 text-center">
                    <span className="block text-[8px] font-normal">Birim</span>
                    KOLI
                </div>
                <div className="flex-1 p-0.5 text-center">
                    <span className="block text-[8px] font-normal">Top Ds/Kg</span>
                    {desi}
                </div>
            </div>

            {/* 6. FOOTER: QR + DESTINATION */}
            <div className="flex h-20 items-stretch gap-1">
                {/* QR Left */}
                <div className="w-16 flex-shrink-0 border-r border-black pr-1 flex items-center justify-center">
                    <QRCodeSVG value={`https://ortakbarkod.com/kargo/${tNo}`} size={56} />
                </div>

                {/* Center Text */}
                <div className="flex-1 flex flex-col justify-center leading-none">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-bold">Parca Adedi</span>
                        <span className="text-xl font-bold">1 / 1</span>
                    </div>
                    <div className="text-lg font-bold">Adrese Teslim</div>
                    <div className="text-2xl font-black uppercase tracking-tight">{deliveryBranch}</div>
                    <div className="text-xl font-bold uppercase tracking-tighter leading-none">{transferCenter}</div>
                </div>

                {/* QR Right / DataMatrix */}
                <div className="w-16 flex-shrink-0 border-l border-black pl-1 flex flex-col justify-end items-center">
                    <div className="text-[8px] w-full text-center">URUN KODU: {order.code}</div>
                    <QRCodeSVG value={order.code || "Q3017-2"} size={48} />
                </div>
            </div>

        </div>
    );
};
