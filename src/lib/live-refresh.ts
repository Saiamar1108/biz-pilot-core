export const DATA_REFRESH_EVENT = "shoppilot:data-refresh";

export function emitDataRefresh() {
  window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT));
}
