export interface ApiResult<T = never> {
  success: boolean;
  message?: string;
  data?: T
}
