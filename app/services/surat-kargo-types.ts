
export interface SuratKargoAuth {
    KullaniciAdi: string;
    Sifre: string;
}

export interface GonderiModel {
    KisiKurum?: string;
    SahisBirim?: string;
    AliciAdresi?: string;
    Il?: string;
    Ilce?: string;
    TelefonEv?: string;
    TelefonIs?: string;
    TelefonCep?: string;
    Email?: string;
    AliciKodu?: string;
    KargoTuru: number; // 1: Dosya, 2: Paket, 3: Koli
    OdemeTipi: number; // 1: Gönderici, 2: Alıcı
    IrsaliyeSeriNo?: string;
    IrsaliyeSiraNo?: string;
    ReferansNo?: string;
    OzelKargoTakipNo?: string;
    Adet: number;
    BirimDesi?: string;
    BirimKg?: string;
    KargoIcerigi?: string;
    KapidanOdemeTahsilatTipi: number; // 0: Yok, 1: Nakit, 2: Kredi Kartı
    KapidanOdemeTutari?: string;
    EkHizmetler?: string;
    TasimaSekli: number;
    TeslimSekli: number;
    SevkAdresi?: string;
    GonderiSekli?: number;
    TeslimSubeKodu?: string;
    Pazaryerimi: number; // 1: Evet, 0: Hayır (Tahmin)
    EntegrasyonFirmasi?: string;
    Iademi: boolean;
}

export interface SuratKargoResponse {
    isError: boolean;
    Message?: string;
    Barcode?: string; // Base64 ZPL or Link
    KargoTakipNo?: string;
}

export interface TrackingResult {
    isError: boolean;
    status?: string; // "Teslim Edildi", "Yolda", "Şubede"
    description?: string; // "Kadıköy Şubede"
    updatedAt?: Date;
    raw?: any; // Ham veri
}

export interface ReturnShipment {
    orderId: string;
    returnDate: string;
    reason?: string;
    status: string;
}

export enum OdemeTipi {
    GONDERICI_ODER = 1,
    ALICI_ODER = 2,
}

export enum KargoTuru {
    DOSYA = 1,
    PAKET = 2,
    KOLI = 3,
}

export enum KapidanOdemeTipi {
    YOK = 0,
    NAKIT = 1,
    KREDI_KARTI = 2,
}
