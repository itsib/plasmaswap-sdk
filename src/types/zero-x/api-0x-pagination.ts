export interface Api0xPaginationRequest {
  /**
   * (Optional, defaults to "1") The page index (1-indexed) requested in the collection.
   */
  page?: number;
  /**
   * (Optional, defaults to "20") The amount of records to return per page. The maximum is "1000".
   */
  perPage?: number;
}

export interface Api0xPaginationResponse<T> {
  /**
   * The total amount of records in the collection (accross all pages).
   */
  total: number;
  /**
   * The page index (1-indexed) of returned in the response (same as request if provided).
   */
  page: number;
  /**
   * The amount of records requested in the pagination, but not necessarily returned.
   */
  perPage: number;
  /**
   * The actual records returned for this page of the collection.
   */
  records: T[];
}
