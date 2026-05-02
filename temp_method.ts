  async getBuyerInquiries(buyerId: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM marketplace_inquiries WHERE buyer_id = $1 ORDER BY created_at DESC',
      [buyerId]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      offeredAmount: row.offered_amount || 0,
      message: row.message || '',
      status: row.status || 'pending',
    }));
  }