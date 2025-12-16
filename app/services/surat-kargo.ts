import { GonderiModel, KapidanOdemeTipi, KargoTuru, OdemeTipi, SuratKargoAuth, SuratKargoResponse } from "./surat-kargo-types";
import https from 'https';

// CONSTANTS
const SERVICE_URL = "https://webservices.suratkargo.com.tr/services.asmx";
const SOAP_ACTION_BASE = "http://tempuri.org/";

// Legacy SSL support
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

export class SuratKargoService {
    private auth: SuratKargoAuth;

    constructor(username: string, pass: string) {
        this.auth = {
            KullaniciAdi: username,
            Sifre: pass
        };
    }

    /**
     * Creates a shipment and returns the result (including Barcode if successful).
     * @param shipmentData The raw shipment data
     * @param scenario "marketplace" | "standard" | "cod" (Cash on Delivery)
     */
    async createShipment(
        shipmentData: Partial<GonderiModel>,
        scenario: 'MARKKETPLACE' | 'BUYER_PAYS' | 'COD_CASH' | 'COD_CREDIT'
    ): Promise<SuratKargoResponse> {

        // Default Model
        const model: GonderiModel = {
            KargoTuru: KargoTuru.PAKET,
            OdemeTipi: OdemeTipi.GONDERICI_ODER, // Default
            Adet: 1,
            BirimDesi: "1",
            BirimKg: "1",
            KapidanOdemeTahsilatTipi: KapidanOdemeTipi.YOK,
            TasimaSekli: 1, // Standart
            TeslimSekli: 1, // Adrese Teslim
            Pazaryerimi: 0,
            Iademi: false,
            ...shipmentData
        };

        // SCENARIO LOGIC
        switch (scenario) {
            case 'MARKKETPLACE':
                model.OdemeTipi = OdemeTipi.GONDERICI_ODER;
                model.Pazaryerimi = 1;
                // Pazaryeri gönderilerinde genellikle kargo ücreti göndericiye (mağazaya) aittir.
                break;

            case 'BUYER_PAYS':
                model.OdemeTipi = OdemeTipi.ALICI_ODER;
                model.Pazaryerimi = 0;
                break;

            case 'COD_CASH':
                model.OdemeTipi = OdemeTipi.GONDERICI_ODER; // Kargo ücretini gönderici öder, ürün bedelini kapıda alır
                model.KapidanOdemeTahsilatTipi = KapidanOdemeTipi.NAKIT;
                if (!model.KapidanOdemeTutari) throw new Error("Kapıda ödeme tutarı girilmelidir.");
                break;

            case 'COD_CREDIT':
                model.OdemeTipi = OdemeTipi.GONDERICI_ODER;
                model.KapidanOdemeTahsilatTipi = KapidanOdemeTipi.KREDI_KARTI;
                if (!model.KapidanOdemeTutari) throw new Error("Kapıda ödeme tutarı girilmelidir.");
                break;
        }

        // Construct SOAP Body
        const soapBody = `
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <GonderiyiKargoyaGonderYeniSiparisBarkodOlustur xmlns="http://tempuri.org/">
                  <KullaniciAdi>${this.auth.KullaniciAdi}</KullaniciAdi>
                  <Sifre>${this.auth.Sifre}</Sifre>
                  <Gonderi>
                    <KisiKurum>${model.KisiKurum || ''}</KisiKurum>
                    <AliciAdresi>${model.AliciAdresi || ''}</AliciAdresi>
                    <Il>${model.Il || ''}</Il>
                    <Ilce>${model.Ilce || ''}</Ilce>
                    <TelefonCep>${model.TelefonCep || ''}</TelefonCep>
                    <AliciKodu>${model.AliciKodu || ''}</AliciKodu>
                    <KargoTuru>${model.KargoTuru}</KargoTuru>
                    <OdemeTipi>${model.OdemeTipi}</OdemeTipi>
                    <OzelKargoTakipNo>${model.OzelKargoTakipNo || ''}</OzelKargoTakipNo>
                    <Adet>${model.Adet}</Adet>
                    <BirimDesi>${model.BirimDesi}</BirimDesi>
                    <BirimKg>${model.BirimKg}</BirimKg>
                    <KapidanOdemeTahsilatTipi>${model.KapidanOdemeTahsilatTipi}</KapidanOdemeTahsilatTipi>
                    <KapidanOdemeTutari>${model.KapidanOdemeTutari || '0'}</KapidanOdemeTutari>
                    <TasimaSekli>${model.TasimaSekli}</TasimaSekli>
                    <TeslimSekli>${model.TeslimSekli}</TeslimSekli>
                    <Pazaryerimi>${model.Pazaryerimi}</Pazaryerimi>
                    <Iademi>${model.Iademi ? 'true' : 'false'}</Iademi>
                  </Gonderi>
                </GonderiyiKargoyaGonderYeniSiparisBarkodOlustur>
              </soap:Body>
            </soap:Envelope>
        `;

        try {
            console.log("SURAT SERVICE: Sending SOAP Request to", SERVICE_URL);
            const response = await fetch(SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': `${SOAP_ACTION_BASE}GonderiyiKargoyaGonderYeniSiparisBarkodOlustur`
                },
                body: soapBody,
                // @ts-ignore
                agent: httpsAgent
            });
            console.log("SURAT SERVICE: Response status", response.status);

            const text = await response.text();
            console.log("SURAT SERVICE: Response text (first 200 chars)", text.substring(0, 200));

            // Simple XML Parsing (Regex is robust enough for this known strict structure)
            const isErrorMatch = text.match(/<isError>(.*?)<\/isError>/);
            const messageMatch = text.match(/<Message>(.*?)<\/Message>/);
            const barcodeMatch = text.match(/<Barcode>(.*?)<\/Barcode>/);

            const isError = isErrorMatch ? isErrorMatch[1] === 'true' : true;
            const message = messageMatch ? messageMatch[1] : 'Bilinmeyen Hata';
            const barcode = barcodeMatch ? barcodeMatch[1] : undefined;

            if (isError) {
                console.error("Surat Kargo Raw Response (Error):", text);
                throw new Error(`Sürat Kargo Hatası: ${message}`);
            }

            return {
                isError: false,
                Message: message,
                Barcode: barcode
            };

        } catch (error: any) {
            console.error("Surat Kargo API Error:", error);
            return {
                isError: true,
                Message: error.message || "Bağlantı Hatası"
            };
        }
    }

    /**
     * Checks the status of a specific shipment using the Order ID.
     */
    async trackShipment(orderId: string): Promise<any> {
        const soapBody = `
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <KargoTakipHareketDetayli xmlns="http://tempuri.org/">
                  <CariKodu>${this.auth.KullaniciAdi}</CariKodu>
                  <Sifre>${this.auth.Sifre}</Sifre>
                  <WebSiparisKodu>${orderId}</WebSiparisKodu>
                </KargoTakipHareketDetayli>
              </soap:Body>
            </soap:Envelope>
        `;

        try {
            const response = await fetch(SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': `${SOAP_ACTION_BASE}KargoTakipHareketDetayli`
                },
                body: soapBody,
                // @ts-ignore
                agent: httpsAgent
            });

            const text = await response.text();
            // Basic parsing strategy: Return the raw XML inner text for now, or try to find status
            // The result is usually a nested XML string inside the Result tag.
            // We'll return the raw text to let the frontend or caller handle it until we know the structure.
            const match = text.match(/<KargoTakipHareketDetayliResult>([\s\S]*?)<\/KargoTakipHareketDetayliResult>/);
            return {
                isError: !match,
                rawResponse: match ? match[1] : null
            };

        } catch (error: any) {
            return { isError: true, Message: error.message };
        }
    }

    /**
     * Lists return shipments for a determined date range.
     */
    async getReturns(startDate: Date, endDate: Date): Promise<any> {
        const startStr = startDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format estimate
        const endStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

        const soapBody = `
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <IadeKargolar xmlns="http://tempuri.org/">
                  <GondericiCariKodu>${this.auth.KullaniciAdi}</GondericiCariKodu>
                  <WebPassword>${this.auth.Sifre}</WebPassword>
                  <BasTar>${startStr}</BasTar>
                  <BitTar>${endStr}</BitTar>
                  <WebSiparisKodu></WebSiparisKodu>
                </IadeKargolar>
              </soap:Body>
            </soap:Envelope>
        `;

        try {
            const response = await fetch(SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': `${SOAP_ACTION_BASE}IadeKargolar`
                },
                body: soapBody,
                // @ts-ignore
                agent: httpsAgent
            });

            const text = await response.text();
            return {
                isError: false,
                rawResponse: text
            };

        } catch (error: any) {
            return { isError: true, Message: error.message };
        }
    }
}
