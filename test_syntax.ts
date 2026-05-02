// Test de syntaxe pour diagnostiquer le problème
interface Row {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  inquiry_type: string;
  offered_amount: string | null;
  message: string;
  status: string;
  transport_option: string;
  payment_method: string;
  created_at_iso: string;
  created_at: string;
  updated_at: string;
  responded_at_iso: string;
  responded_at: string;
  listing_price: string | null;
  listing_description: string;
  listing_type: string;
  pig_count: number;
  subject_id: string;
  pig_ids: any[];
  seller_nom: string;
  seller_prenom: string;
  seller_telephone: string;
}

const mockRows: Row[] = [{
  id: '1',
  listing_id: '1',
  buyer_id: '1',
  seller_id: '1',
  inquiry_type: 'offer',
  offered_amount: '100',
  message: 'test',
  status: 'pending',
  transport_option: 'pickup',
  payment_method: 'cash',
  created_at_iso: '2023-01-01',
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  responded_at_iso: '2023-01-01',
  responded_at: '2023-01-01',
  listing_price: '100',
  listing_description: 'test',
  listing_type: 'individual',
  pig_count: 1,
  subject_id: '1',
  pig_ids: [],
  seller_nom: 'John',
  seller_prenom: 'Doe',
  seller_telephone: '123456789'
}];

// Test de la syntaxe exacte
const result = mockRows.map((row: Row) => {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    inquiryType: row.inquiry_type,
    offeredAmount: row.offered_amount ? parseFloat(row.offered_amount) : null,
    message: row.message,
    status: row.status,
    transportOption: row.transport_option,
    paymentMethod: row.payment_method,
    createdAt: row.created_at_iso || row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at_iso || row.responded_at,
    // Propriétés aplaties pour compatibilité frontend
    listing_price: row.listing_price ? parseFloat(row.listing_price) : null,
    listing_description: row.listing_description,
    listing_type: row.listing_type,
    pig_count: row.pig_count,
    subject_id: row.subject_id,
    pig_ids: row.pig_ids,
    seller_nom: row.seller_nom,
    seller_prenom: row.seller_prenom,
    seller_telephone: row.seller_telephone,
    // Objets nested aussi gardés pour compatibilité future
    listing: {
      id: row.listing_id,
      price: row.listing_price ? parseFloat(row.listing_price) : null,
      description: row.listing_description,
      listingType: row.listing_type,
    },
    seller: {
      id: row.seller_id,
      nom: row.seller_nom,
      prenom: row.seller_prenom,
      telephone: row.seller_telephone,
    },
  };
});

console.log('Test réussi:', result.length);