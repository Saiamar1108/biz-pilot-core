export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};
