export interface ProductInterface {
    id(id: any, name: string, category: Category, sku: number, price: number, stock: any, quantity: number): ProductInterface;
    stock(id: any, name: string, category: Category, sku: number, price: number, stock: any, quantity: number): ProductInterface;
    _id: string;
    category: Category;
    sku: number;
    in_stock: boolean;
    name: string;
    price: number;
    quantity: number;
    date: string,
    images: any
}

export interface FaqInterface {
    _id: string, 
    title: {fr: string, en: string},
    content: {fr: string, en: string},
    type: string
}

export interface CountryInterface {
    _id: string,
    fr: string,
    en: string,
    code: string,
    currency?: string,
    currency_code?:string
}

export interface CityInterface {
    _id: string,
    name: string,
    country: any
}

export interface Category {
    fr: string,
    en: string,
    icon: string
}

export interface PaymentInterface {
    _id: string
    amount: number
    date: string
    status: string
    paymentMethod: string,
    createdAt: Date
}

export interface InputSearchProps {
    objectName: String
    data: any
    handleClik: (id: String) => void
}

export enum Object {
    Order = 'Order',
    Product = 'Product',
    Client = 'Client',
    Payment = 'Payment'
}

export interface DeliveryServiceInterface {
    _id: string,
    name: string,
    description: string,
    logo: string,
    phone: string,
    email: string,
    type: string,
    user: string
    shops: any[]
    adress: any[]
    users: any[]
    pricings: any[]
}