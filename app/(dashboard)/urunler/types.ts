export type Product = {
    id: number;
    name: string;
    code: string;
    stock: number;
    price: number;
    cost_price: number;
    package_width: number;
    package_height: number;
    package_depth: number;
    package_weight: number;
    total_desi: number;
    description?: string;
    category?: string;
    brand?: string;
    image_url?: string;
    images?: string[];
    product_url?: string;
    created_at?: string;
    raw_data?: any;
    vat_rate?: number;
    market_price?: number;
    shipment_days?: number;
    barcode?: string;
};

export type Parcel = {
    id?: number;
    width: number;
    height: number;
    depth: number;
    weight: number;
    desi: number;
};

export type Material = {
    id: number;
    name: string;
    category: string;
    unit: string;
    unit_price: number;
    waste_percentage: number;
    sheet_width?: number;
    sheet_height?: number;
    stock_quantity?: number;
};

export type CutItem = {
    id?: number;
    description: string;
    width: number;
    height: number;
    quantity: number;
    material_id: number;
    band_long: number;
    band_short: number;
    band_material_id: number;
};

export type ComponentItem = {
    id?: number;
    material_id: number;
    quantity: number;
};

export type CostAnalysis = {
    sunta: number;
    suntaArea: number;
    bant: number;
    bantLength: number;
    hirdavat: number;
    iscilik: number;
    ambalaj: number;
    kargo: number;
    desi: number;
    genelGider: number;
    total: number;
};

export type Marketplace = {
    id: number;
    marketplace: string;
    store_name: string;
};
