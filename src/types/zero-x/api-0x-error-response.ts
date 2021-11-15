export interface Api0xErrorResponse {
  code: number;
  reason: string;
  validationErrors?: {
    field: string;
    code: number;
    reason: string;
  }[];
}
