export const deliveryServices: any[] = [
  {
    id: "1",
    name: "Express Delivery",
    description: "Service de livraison rapide 24/7 dans toute la ville",
    imageUrl: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&auto=format&fit=crop",
    contact: {
      phone: "+1234567890",
      email: "contact@expressdelivery.com"
    },
    location: {
      country: "France",
      city: "Paris"
    },
    zonePricing: [
      { zone: "Centre-ville", price: 5.99 },
      { zone: "Banlieue proche", price: 8.99 },
      { zone: "Banlieue éloignée", price: 12.99 }
    ]
  },
  {
    id: "2",
    name: "Green Delivery",
    description: "Livraison écologique à vélo pour les petits colis",
    imageUrl: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&auto=format&fit=crop",
    contact: {
      phone: "+1234567891",
      email: "contact@greendelivery.com"
    },
    location: {
      country: "France",
      city: "Lyon"
    },
    zonePricing: [
      { zone: "Centre-ville", price: 4.99 },
      { zone: "Banlieue proche", price: 7.99 }
    ]
  },
  {
    id: "3",
    name: "Premium Delivery",
    description: "Service de livraison premium avec suivi en temps réel",
    imageUrl: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&auto=format&fit=crop",
    contact: {
      phone: "+1234567892",
      email: "contact@premiumdelivery.com"
    },
    location: {
      country: "Belgique",
      city: "Bruxelles"
    },
    zonePricing: [
      { zone: "Centre-ville", price: 9.99 },
      { zone: "Banlieue proche", price: 14.99 },
      { zone: "Banlieue éloignée", price: 19.99 },
      { zone: "Zone rurale", price: 24.99 }
    ]
  }
];

export const ITEMS_PER_PAGE = 6;